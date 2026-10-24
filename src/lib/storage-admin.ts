import "server-only";

import crypto from "node:crypto";
import sharp from "sharp";
import { getAdminSession } from "./admin-auth";
import { executeAdminRead, getSupabaseEnvStatus } from "./supabase-server";

export const MOVIE_IMAGES_BUCKET = "movie-images";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (5,242,880 bytes)
export const STAGING_BUCKET = "movie-image-staging";
const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

type UploadTicket = {
  path: string; mime: keyof typeof MIME_EXT; size: number; sessionId: string; expires: number;
};

function ticketSignature(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length < 32) throw new Error("Upload configuration unavailable");
  return crypto.createHmac("sha256", secret.trim()).update(`movie-upload:${payload}`).digest("hex");
}

function readTicket(ticket: string, sessionId: string): UploadTicket {
  if (typeof ticket !== "string" || ticket.length > 2048) throw new Error("Invalid upload ticket");
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || extra || !/^[a-f0-9]{64}$/.test(signature ?? "") ||
    !crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(ticketSignature(payload), "hex"))) {
    throw new Error("Invalid upload ticket");
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadTicket;
  if (data.sessionId !== sessionId || !Number.isFinite(data.expires) || data.expires <= Date.now() ||
    !/^(posters|backdrops)\/[a-z0-9-]+\.(jpg|png|webp)$/.test(data.path) ||
    !Object.hasOwn(MIME_EXT, data.mime) || !Number.isInteger(data.size) || data.size < 1 || data.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Invalid upload ticket");
  }
  return data;
}

async function storageFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getSupabaseBaseUrl();
  if (!base || !getSupabaseEnvStatus().isConfiguredForAdmin) throw new Error("Storage unavailable");
  return fetch(`${base}/storage/v1/${path}`, {
    ...init, headers: { ...storageHeaders(), ...init.headers }, cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}

// Read-only: operators apply bucket restrictions through the supplied migration.
async function verifyBuckets(): Promise<void> {
  for (const [bucket, isPublic] of [[MOVIE_IMAGES_BUCKET, true], [STAGING_BUCKET, false]] as const) {
    const response = await storageFetch(`bucket/${bucket}`);
    if (!response.ok) throw new Error("Apply the Storage migration");
    const data = await response.json();
    if (data.public !== isPublic || Number(data.file_size_limit) !== MAX_IMAGE_SIZE_BYTES ||
      !Array.isArray(data.allowed_mime_types) || data.allowed_mime_types.length !== 3 ||
      !data.allowed_mime_types.every((mime: string) => Object.hasOwn(MIME_EXT, mime))) {
      throw new Error("Apply the Storage migration");
    }
  }
}

export async function signMovieArtworkUpload(input: { kind: string; mime: string; size: number; slug?: string }) {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  if (!["poster", "backdrop"].includes(input.kind) || !Object.hasOwn(MIME_EXT, input.mime) ||
    !Number.isInteger(input.size) || input.size < 1 || input.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Only JPEG, PNG and WebP up to 5 MB are allowed");
  }
  await verifyBuckets();
  const mime = input.mime as keyof typeof MIME_EXT;
  const path = generateSafeStoragePath(input.kind as ImageArtworkKind, MIME_EXT[mime], input.slug);
  if (!await getAdminSession()) throw new Error("Unauthorized");
  const response = await storageFetch(`object/upload/sign/${STAGING_BUCKET}/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-upsert": "false" }, body: "{}",
  });
  if (!response.ok) throw new Error("Could not sign upload");
  const { url } = await response.json();
  const base = getSupabaseBaseUrl()!;
  const signedUrl = new URL(`${base}/storage/v1${url}`);
  if (signedUrl.origin !== new URL(base).origin ||
    signedUrl.pathname !== `/storage/v1/object/upload/sign/${STAGING_BUCKET}/${path}` || !signedUrl.searchParams.has("token")) {
    throw new Error("Invalid storage response");
  }
  const ticket: UploadTicket = { path, mime, size: input.size, sessionId: session.id, expires: Date.now() + 2 * 60 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return { signedUrl: signedUrl.toString(), ticket: `${payload}.${ticketSignature(payload)}` };
}

async function removeStagedImage(path: string): Promise<void> {
  // Recheck shared revocation immediately before a storage mutation.
  if (!await getAdminSession()) throw new Error("Unauthorized");
  const response = await storageFetch(`object/${STAGING_BUCKET}`, {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [path] }),
  });
  if (!response.ok) throw new Error("Staging cleanup unavailable");
}

export async function cancelMovieArtworkUpload(ticket: string): Promise<void> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  await removeStagedImage(readTicket(ticket, session.id).path);
}

export async function sanitizeImage(buffer: Buffer, mime: string): Promise<Buffer> {
  const detected = validateServerImageBuffer(buffer);
  if (!detected.ok || detected.format.mime !== mime) throw new Error("Invalid image content");
  // Decode all pixels, bound decompression, reject animation, strip EXIF/GPS and
  // other metadata, and re-encode. Magic bytes/client MIME alone are insufficient.
  const pipeline = sharp(buffer, { failOn: "warning", limitInputPixels: 25_000_000, animated: true });
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000 ||
    (metadata.pages ?? 1) !== 1 || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("Invalid image dimensions");
  const result = await pipeline.rotate().toFormat(metadata.format as "jpeg" | "png" | "webp").toBuffer();
  if (result.length > MAX_IMAGE_SIZE_BYTES) throw new Error("Decoded image exceeds 5 MB");
  return result;
}

export async function finalizeMovieArtworkUpload(ticket: string): Promise<{ publicUrl: string }> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  const data = readTicket(ticket, session.id);
  try {
    const response = await storageFetch(`object/authenticated/${STAGING_BUCKET}/${data.path}`);
    if (!response.ok || !response.body || response.headers.get("content-type")?.split(";")[0] !== data.mime ||
      Number(response.headers.get("content-length")) > MAX_IMAGE_SIZE_BYTES) throw new Error("Invalid staged image");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_SIZE_BYTES) { await reader.cancel(); throw new Error("Image exceeds 5 MB"); }
      chunks.push(chunk.value);
    }
    if (size !== data.size) throw new Error("Image size mismatch");
    const cleanImage = await sanitizeImage(Buffer.concat(chunks), data.mime);
    if (!await getAdminSession()) throw new Error("Unauthorized");
    // Outbound server-to-Storage traffic does not traverse Vercel's request body
    // limit. Only small JSON responses go back to the browser.
    const upload = await storageFetch(`object/${MOVIE_IMAGES_BUCKET}/${data.path}`, {
      method: "POST", headers: { "Content-Type": data.mime, "x-upsert": "false", "Cache-Control": "max-age=3600" },
      body: new Uint8Array(cleanImage),
    });
    if (!upload.ok) throw new Error("Could not publish validated image");
    return { publicUrl: `${getSupabaseBaseUrl()}/storage/v1/object/public/${MOVIE_IMAGES_BUCKET}/${data.path}` };
  } finally {
    // Failed or abandoned uploads remain private even when cleanup is unavailable.
    await removeStagedImage(data.path).catch(() => undefined);
  }
}

export type ImageArtworkKind = "poster" | "backdrop";

export type DetectedImageFormat = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

function getSupabaseBaseUrl(): string | null {
  const status = getSupabaseEnvStatus();
  if (!status.hasUrl) return null;
  return process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, "");
}

function getAdminSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function storageHeaders(): Record<string, string> {
  const key = getAdminSecretKey();
  return {
    apikey: key,
    ...(!key.startsWith("sb_") && key.split(".").length === 3
      ? { Authorization: `Bearer ${key}` } : {}),
  };
}

/**
 * Inspects actual binary magic bytes to verify the file is genuinely
 * a JPEG, PNG, or WebP image (never trusting client filename or MIME header alone).
 */
export function detectImageMagicBytes(buffer: Buffer): DetectedImageFormat | null {
  if (!buffer || buffer.byteLength < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // 3. WebP: "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export function validateServerImageBuffer(
  buffer: Buffer
): { ok: true; format: DetectedImageFormat } | { ok: false; error: string } {
  if (!buffer || buffer.byteLength === 0) {
    return { ok: false, error: "الملف المرفوع فارغ. يرجى اختيار صورة صالحة." };
  }

  if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (buffer.byteLength / (1024 * 1024)).toFixed(2);
    return {
      ok: false,
      error: `حجم الصورة (${sizeMb} ميجابايت) يتجاوز الحد الأقصى المسموح به (5 ميجابايت).`,
    };
  }

  const detected = detectImageMagicBytes(buffer);
  if (!detected ||
    (detected.ext === "jpg" && (buffer.length < 20 || buffer.readUInt16BE(buffer.length - 2) !== 0xffd9)) ||
    (detected.ext === "png" && (buffer.length < 45 || buffer.toString("ascii", 12, 16) !== "IHDR" || buffer.toString("ascii", buffer.length - 8, buffer.length - 4) !== "IEND")) ||
    (detected.ext === "webp" && (buffer.length < 30 || buffer.readUInt32LE(4) + 8 !== buffer.length || !["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16))))) {
    return {
      ok: false,
      error: "صيغة الملف غير مدعومة. يُسمح فقط بصور JPEG و PNG و WebP الحقيقية.",
    };
  }

  return { ok: true, format: detected };
}

export function generateSafeStoragePath(
  kind: ImageArtworkKind,
  ext: "jpg" | "png" | "webp",
  slugHint?: string
): string {
  const folder = kind === "backdrop" ? "backdrops" : "posters";
  const cleanedSlug = String(slugHint ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const prefix = cleanedSlug || kind;
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(16).toString("hex");
  return `${folder}/${prefix}-${timestamp}-${randomSuffix}.${ext}`;
}

/**
 * Extracts the internal storage object path (e.g. `posters/slug-123.jpg`) ONLY if
 * the URL belongs to this project's `movie-images` bucket.
 * Returns `null` for external URLs (TMDB, etc.) or relative paths.
 */
export function extractOwnedStorageObjectPath(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const baseUrl = getSupabaseBaseUrl();
  if (!baseUrl) return null;

  const expectedPrefix = `${baseUrl}/storage/v1/object/public/${MOVIE_IMAGES_BUCKET}/`;
  if (!imageUrl.startsWith(expectedPrefix)) {
    return null;
  }

  const objectPath = imageUrl.slice(expectedPrefix.length);
  if (
    !objectPath ||
    !/^(posters|backdrops)\/[a-z0-9-]+\.(jpg|png|webp)$/.test(objectPath)
  ) {
    return null;
  }

  return objectPath;
}

/**
 * Safely deletes an image from `movie-images` ONLY if:
 * 1. An admin session is active.
 * 2. The URL belongs to our `movie-images` bucket (never external/TMDB URLs).
 * 3. No other movie record in `public.movies` references this URL.
 */
export async function deleteStorageImageIfOwnedAndUnused(
  imageUrl: string | null | undefined,
  _excludeMovieId?: string
): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) return false;

  const objectPath = extractOwnedStorageObjectPath(imageUrl);
  if (!objectPath || !imageUrl) {
    return false;
  }

  // Check if any movie in the database still uses this URL
  const encodedUrl = encodeURIComponent(imageUrl);
  const usageRes = await executeAdminRead<Array<{ id: string }>>(
    "movies",
    `?select=id&or=(poster_url.eq.${encodedUrl},backdrop_url.eq.${encodedUrl})`
  );

  if (!usageRes.ok) {
    // Be conservative: if we cannot verify usage, do not delete
    return false;
  }

  const otherUsers = usageRes.data;
  if (otherUsers.length > 0) {
    // Another movie shares this image; preserve it
    return false;
  }

  const seriesUsage = await executeAdminRead<Array<{ id: string }>>(
    "series", `?select=id&or=(poster_url.eq.${encodedUrl},backdrop_url.eq.${encodedUrl})&limit=1`
  );
  if (!seriesUsage.ok || seriesUsage.data.length > 0) return false;

  const baseUrl = getSupabaseBaseUrl();
  const secretKey = getAdminSecretKey();
  if (!baseUrl || !secretKey) return false;

  try {
    if (!await getAdminSession()) return false;
    const delRes = await fetch(
      `${baseUrl}/storage/v1/object/${MOVIE_IMAGES_BUCKET}`,
      {
        method: "DELETE",
        cache: "no-store", signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ prefixes: [objectPath] }),
        headers: {
          ...storageHeaders(),
          "Content-Type": "application/json",
        },
      }
    );

    return delRes.status >= 200 && delRes.status < 300;
  } catch {
    return false;
  }
}

