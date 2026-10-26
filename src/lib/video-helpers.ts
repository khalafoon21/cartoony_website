export type VideoServer = {
  id: string;
  name: string;
  url: string;
  type: "direct" | "iframe";
};

/**
 * Extracts the src URL from an <iframe> HTML tag if present,
 * or returns the trimmed input string.
 */
export function extractIframeSrc(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If it's wrapped in an <iframe> tag, extract src attribute
  const match = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Also check if src was without quotes (rare but possible in messy embeds)
  const noQuoteMatch = trimmed.match(/<iframe[^>]+src=([^\s>]+)/i);
  if (noQuoteMatch && noQuoteMatch[1]) {
    return noQuoteMatch[1].replace(/["']/g, "").trim();
  }

  return trimmed;
}

/**
 * Checks if a URL or embed snippet is an external embed / iframe player.
 */
export function isVideoEmbedUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();

  if (clean.startsWith("<iframe")) return true;

  // Direct video file extensions
  const urlPath = clean.split("?")[0];
  if (
    urlPath.endsWith(".mp4") ||
    urlPath.endsWith(".m3u8") ||
    urlPath.endsWith(".webm") ||
    urlPath.endsWith(".ogg") ||
    urlPath.endsWith(".mov")
  ) {
    return false;
  }

  // Known streaming / embed hosts and patterns
  return (
    clean.includes("/e/") ||
    clean.includes("/v/") ||
    clean.includes("/embed/") ||
    clean.includes("youtube.com") ||
    clean.includes("youtu.be") ||
    clean.includes("vimeo.com") ||
    clean.includes("dailymotion.com") ||
    clean.includes("ok.ru") ||
    clean.includes("mixdrop") ||
    clean.includes("streamtape") ||
    clean.includes("morencius") ||
    clean.includes("hgcloud") ||
    clean.includes("playmogo") ||
    clean.includes("vidhide") ||
    clean.includes("dood") ||
    clean.includes("uqload") ||
    clean.includes("voe.sx") ||
    clean.includes("upstream") ||
    clean.includes("filemoon") ||
    clean.includes("streamwish") ||
    clean.includes("mp4upload")
  );
}

/**
 * Normalizes input and returns clean URL and detected/validated type.
 */
export function normalizeVideoSource(
  input: string,
  explicitType?: "direct" | "iframe"
): { url: string; type: "direct" | "iframe" } {
  const url = extractIframeSrc(input);
  if (!url) {
    return { url: "", type: explicitType || "direct" };
  }

  if (explicitType === "direct" || explicitType === "iframe") {
    return { url, type: explicitType };
  }

  const type = isVideoEmbedUrl(url) ? "iframe" : "direct";
  return { url, type };
}
