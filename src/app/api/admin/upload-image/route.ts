import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { cancelMovieArtworkUpload, finalizeMovieArtworkUpload, signMovieArtworkUpload } from "@/lib/storage-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const json = (body: object, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (!await getAdminSession()) return json({ ok: false, error: "يرجى تسجيل الدخول مجددًا." }, 401);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ ok: false, error: "طلب غير مسموح." }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ ok: false, error: "بيانات غير صالحة." }, 415);
  try {
    // Only metadata/tickets enter Vercel, never the image body. Bound actual bytes.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > 8192) { await reader.cancel(); return json({ ok: false, error: "الطلب كبير جدًا." }, 413); }
      chunks.push(chunk.value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (data.action === "sign") {
      const result = await signMovieArtworkUpload({ kind: data.kind, mime: data.mime, size: data.size, slug: data.slug });
      return json({ ok: true, ...result });
    }
    if (data.action === "finalize") return json({ ok: true, ...await finalizeMovieArtworkUpload(data.ticket) });
    if (data.action === "cancel") { await cancelMovieArtworkUpload(data.ticket); return json({ ok: true }); }
    throw new Error("Unknown action");
  } catch {
    return json({ ok: false, error: "تعذر رفع الصورة. استخدم JPEG أو PNG أو WebP بحجم أقصاه 5 ميجابايت، وتحقق من إعدادات التخزين والجلسة." }, 400);
  }
}
