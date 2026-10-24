"use client";

async function uploadRequest(data: object) {
  const response = await fetch("/api/admin/upload-image", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data), signal: AbortSignal.timeout(65000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "تعذر رفع الصورة.");
  return result;
}

export async function uploadMovieImage(file: File, kind: "poster" | "backdrop", slug: string, onProgress: (value: number) => void): Promise<string> {
  const signed = await uploadRequest({ action: "sign", kind, slug, mime: file.type, size: file.size });
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.signedUrl);
      xhr.timeout = 120000;
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.min(90, Math.round(event.loaded / event.total * 85) + 5));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300
        ? resolve() : reject(new Error("تعذر رفع الصورة إلى التخزين. تحقق من النوع والحجم ثم أعد المحاولة."));
      xhr.onerror = xhr.ontimeout = xhr.onabort = () => reject(new Error("انقطع الاتصال أثناء رفع الصورة."));
      xhr.send(file);
    });
    onProgress(95);
    const result = await uploadRequest({ action: "finalize", ticket: signed.ticket });
    return result.publicUrl;
  } catch (error) {
    await uploadRequest({ action: "cancel", ticket: signed.ticket }).catch(() => undefined);
    throw error;
  }
}
