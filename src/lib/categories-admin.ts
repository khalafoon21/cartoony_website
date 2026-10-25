import "server-only";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "./admin-auth";
import type { DbCategoryRow, PublicationStatus } from "./movies-admin";
import { executeAdminRead, executeAdminWrite } from "./supabase-server";

export type AdminCategoryWithCounts = DbCategoryRow & {
  moviesCount: number;
  seriesCount: number;
};

export type CategoryPayload = {
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar?: string;
  icon_symbol?: string;
  light_color?: string;
  dark_color?: string;
  display_order?: number;
  status?: PublicationStatus;
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getAdminCategoriesWithCounts(): Promise<{
  ok: boolean;
  error?: string;
  categories: AdminCategoryWithCounts[];
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً.", categories: [] };
  }

  const [catRes, movieCatRes, seriesCatRes] = await Promise.all([
    executeAdminRead<DbCategoryRow[]>("categories", "?select=*&order=display_order.asc"),
    executeAdminRead<Array<{ category_id: string }>>("movie_categories", "?select=category_id"),
    executeAdminRead<Array<{ category_id: string }>>("series_categories", "?select=category_id"),
  ]);

  if (!catRes.ok) {
    return { ok: false, error: catRes.error, categories: [] };
  }

  const movieCounts = new Map<string, number>();
  if (movieCatRes.ok && Array.isArray(movieCatRes.data)) {
    for (const row of movieCatRes.data) {
      movieCounts.set(row.category_id, (movieCounts.get(row.category_id) || 0) + 1);
    }
  }

  const seriesCounts = new Map<string, number>();
  if (seriesCatRes.ok && Array.isArray(seriesCatRes.data)) {
    for (const row of seriesCatRes.data) {
      seriesCounts.set(row.category_id, (seriesCounts.get(row.category_id) || 0) + 1);
    }
  }

  const categories: AdminCategoryWithCounts[] = (catRes.data || []).map((cat) => ({
    ...cat,
    moviesCount: movieCounts.get(cat.id) || 0,
    seriesCount: seriesCounts.get(cat.id) || 0,
  }));

  return { ok: true, categories };
}

export function validateCategoryPayload(data: CategoryPayload): {
  valid: boolean;
  error?: string;
  cleaned?: CategoryPayload;
} {
  const title_ar = (data.title_ar || "").trim();
  const title_original = (data.title_original || "").trim();
  const slug = (data.slug || "").trim().toLowerCase();

  if (!title_ar || title_ar.length < 2) {
    return { valid: false, error: "يجب إدخال اسم التصنيف بالعربية (حرفين على الأقل)." };
  }

  if (!title_original || title_original.length < 2) {
    return { valid: false, error: "يجب إدخال الاسم اللاتيني للتصنيف (حرفين على الأقل)." };
  }

  if (!slug || !SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      error: "الرابط المختصر (Slug) غير صالح. يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط.",
    };
  }

  return {
    valid: true,
    cleaned: {
      title_ar,
      title_original,
      slug,
      description_ar: (data.description_ar || "").trim(),
      icon_symbol: (data.icon_symbol || "compass").trim(),
      light_color: (data.light_color || "#676249").trim(),
      dark_color: (data.dark_color || "#2C3D3B").trim(),
      display_order: typeof data.display_order === "number" ? data.display_order : 0,
      status: data.status === "draft" ? "draft" : "published",
    },
  };
}

export async function createAdminCategory(payload: CategoryPayload): Promise<{
  ok: boolean;
  error?: string;
  category?: DbCategoryRow;
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً." };
  }

  const validation = validateCategoryPayload(payload);
  if (!validation.valid || !validation.cleaned) {
    return { ok: false, error: validation.error };
  }

  // Check duplicate slug
  const dupCheck = await executeAdminRead<Array<{ id: string }>>(
    "categories",
    `?select=id&slug=eq.${encodeURIComponent(validation.cleaned.slug)}&limit=1`
  );
  if (dupCheck.ok && dupCheck.data && dupCheck.data.length > 0) {
    return { ok: false, error: `الرابط المختصر (${validation.cleaned.slug}) مستخدم لتصنيف آخر بالفعل.` };
  }

  const insertRes = await executeAdminWrite<DbCategoryRow[]>(
    "categories",
    "POST",
    validation.cleaned
  );

  if (!insertRes.ok) {
    return { ok: false, error: insertRes.error || "تعذر إضافة التصنيف." };
  }
  if (!insertRes.data || insertRes.data.length === 0) {
    return { ok: false, error: "تعذر إضافة التصنيف." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true, category: insertRes.data[0] };
}

export async function updateAdminCategory(
  id: string,
  payload: CategoryPayload
): Promise<{
  ok: boolean;
  error?: string;
  category?: DbCategoryRow;
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً." };
  }

  const validation = validateCategoryPayload(payload);
  if (!validation.valid || !validation.cleaned) {
    return { ok: false, error: validation.error };
  }

  // Check duplicate slug excluding self
  const dupCheck = await executeAdminRead<Array<{ id: string }>>(
    "categories",
    `?select=id&slug=eq.${encodeURIComponent(validation.cleaned.slug)}&id=neq.${id}&limit=1`
  );
  if (dupCheck.ok && dupCheck.data && dupCheck.data.length > 0) {
    return { ok: false, error: `الرابط المختصر (${validation.cleaned.slug}) مستخدم لتصنيف آخر بالفعل.` };
  }

  const updateRes = await executeAdminWrite<DbCategoryRow[]>(
    "categories",
    "PATCH",
    validation.cleaned,
    `?id=eq.${id}`
  );

  if (!updateRes.ok) {
    return { ok: false, error: updateRes.error || "تعذر تحديث بيانات التصنيف." };
  }
  if (!updateRes.data || updateRes.data.length === 0) {
    return { ok: false, error: "تعذر تحديث بيانات التصنيف." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true, category: updateRes.data[0] };
}

export async function deleteAdminCategory(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً." };
  }

  // Safety check: Prevent accidental deletion of categories still referenced by existing content
  const [movieCatRes, seriesCatRes] = await Promise.all([
    executeAdminRead<Array<{ movie_id: string }>>(
      "movie_categories",
      `?select=movie_id&category_id=eq.${id}&limit=1`
    ),
    executeAdminRead<Array<{ series_id: string }>>(
      "series_categories",
      `?select=series_id&category_id=eq.${id}&limit=1`
    ),
  ]);

  const hasLinkedMovies = movieCatRes.ok && Array.isArray(movieCatRes.data) && movieCatRes.data.length > 0;
  const hasLinkedSeries = seriesCatRes.ok && Array.isArray(seriesCatRes.data) && seriesCatRes.data.length > 0;

  if (hasLinkedMovies || hasLinkedSeries) {
    return {
      ok: false,
      error:
        "لا يمكن حذف هذا التصنيف لأنه مرتبط بأعمال حالية في المنصة (أفلام أو مسلسلات). يرجى فك الارتباط أولاً قبل الحذف لحماية علاقات المحتوى.",
    };
  }

  const deleteRes = await executeAdminWrite("categories", "DELETE", undefined, `?id=eq.${id}`);

  if (!deleteRes.ok) {
    return { ok: false, error: deleteRes.error || "تعذر حذف التصنيف." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true };
}
