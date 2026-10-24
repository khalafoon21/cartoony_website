"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import {
  createAdminMovieRecord,
  deleteAdminMovieRecord,
  updateAdminMovieRecord,
  validateMoviePayload,
} from "@/lib/movies-admin";
import { executeAdminWrite } from "@/lib/supabase-server";

export type MovieActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateMovieRoutes(slug?: string) {
  revalidatePath("/");
  revalidatePath("/movies");
  if (slug) {
    revalidatePath(`/movies/${slug}`);
  }
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/movies");
}

export async function saveMovieAction(formData: FormData): Promise<MovieActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف. يرجى تسجيل الدخول مجددًا." };
  }

  const movieId = String(formData.get("movie_id") ?? "").trim();
  const categoryIds = formData
    .getAll("category_ids")
    .map((val) => String(val).trim())
    .filter(Boolean);

  const validation = validateMoviePayload({
    slug: String(formData.get("slug") ?? ""),
    title_ar: String(formData.get("title_ar") ?? ""),
    subtitle_ar: String(formData.get("subtitle_ar") ?? ""),
    title_original: String(formData.get("title_original") ?? ""),
    franchise_ar: String(formData.get("franchise_ar") ?? ""),
    description_ar: String(formData.get("description_ar") ?? ""),
    poster_url: String(formData.get("poster_url") ?? ""),
    backdrop_url: String(formData.get("backdrop_url") ?? ""),
    release_year: String(formData.get("release_year") ?? ""),
    duration_minutes: String(formData.get("duration_minutes") ?? ""),
    duration_label_ar: String(formData.get("duration_label_ar") ?? ""),
    age_rating: String(formData.get("age_rating") ?? "6+"),
    rating: String(formData.get("rating") ?? "8.0"),
    audio_badge: String(formData.get("audio_badge") ?? "dubbed"),
    theme: String(formData.get("theme") ?? "forest"),
    accent_color: String(formData.get("accent_color") ?? "#F5A623"),
    is_featured: formData.get("is_featured") === "on",
    is_most_watched: formData.get("is_most_watched") === "on",
    is_recently_added: formData.get("is_recently_added") === "on",
    status: String(formData.get("status") ?? "draft"),
    category_ids: categoryIds,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (movieId) {
    const updateRes = await updateAdminMovieRecord(movieId, validation.data);
    if (!updateRes.ok) {
      return { ok: false, error: updateRes.error };
    }
    revalidateMovieRoutes(validation.data.slug);
    return {
      ok: true,
      message: `تم تحديث فيلم «${validation.data.title_ar}» وحفظ تصنيفاته بنجاح.`,
    };
  }

  const createRes = await createAdminMovieRecord(validation.data);
  if (!createRes.ok) {
    return { ok: false, error: createRes.error };
  }

  revalidateMovieRoutes(validation.data.slug);
  return {
    ok: true,
    message: `تمت إضافة فيلم «${validation.data.title_ar}» إلى قاعدة البيانات بنجاح.`,
  };
}

export async function deleteMovieAction(movieId: string): Promise<MovieActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const delRes = await deleteAdminMovieRecord(movieId);
  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  revalidateMovieRoutes();
  return { ok: true, message: "تم حذف الفيلم وروابط تصنيفاته نهائيًا من قاعدة البيانات." };
}

export async function toggleMoviePublishStatusAction(
  movieId: string,
  nextStatus: "draft" | "published"
): Promise<MovieActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  if (!UUID_REGEX.test(movieId)) {
    return { ok: false, error: "معرف الفيلم غير صالح." };
  }

  if (nextStatus !== "draft" && nextStatus !== "published") {
    return { ok: false, error: "حالة النشر غير صالحة." };
  }

  const writeRes = await executeAdminWrite(
    "movies",
    "PATCH",
    {
      status: nextStatus,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    },
    `?id=eq.${movieId}`
  );

  if (!writeRes.ok) {
    return { ok: false, error: writeRes.error };
  }

  revalidateMovieRoutes();
  return {
    ok: true,
    message:
      nextStatus === "published"
        ? "تم نشر الفيلم ليصبح متاحًا للزوار."
        : "تم تحويل الفيلم إلى مسودة (غير ظاهر للزوار).",
  };
}
