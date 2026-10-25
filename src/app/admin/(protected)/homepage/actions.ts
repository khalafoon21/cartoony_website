"use server";

import { saveHomepageConfig, type SaveHomepagePayload } from "@/lib/homepage-admin";

export async function saveHomepageAction(payload: SaveHomepagePayload) {
  try {
    const res = await saveHomepageConfig(payload);
    return res;
  } catch (err: any) {
    return { ok: false, error: err?.message || "تعذر حفظ إعدادات الصفحة الرئيسية." };
  }
}
