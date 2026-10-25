import "server-only";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "./admin-auth";
import type { DbMovieRow } from "./movies-admin";
import type { ContentFormat, Movie } from "./movies";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  type HomepageSectionSetting,
} from "./movies-public";
import {
  executeAdminRead,
  executeAdminWrite,
  executePublicRead,
} from "./supabase-server";

export type { HomepageSectionSetting };
export { DEFAULT_HOMEPAGE_SECTIONS };

export async function getHomepageSectionsSettings(): Promise<HomepageSectionSetting[]> {
  const res = await executePublicRead<Array<{ key: string; value: HomepageSectionSetting[] }>>(
    "site_settings",
    "?key=eq.homepage_sections&limit=1"
  );

  if (res.ok && res.data.length > 0 && Array.isArray(res.data[0].value)) {
    return res.data[0].value;
  }
  return DEFAULT_HOMEPAGE_SECTIONS;
}

export type HomepageAdminData = {
  ok: boolean;
  error?: string;
  publishedContent: Array<{
    id: string;
    title: string;
    englishTitle: string;
    format: ContentFormat;
    posterUrl: string | null;
    backdropUrl: string | null;
    isFeatured: boolean;
    heroOrder: number;
    heroEnabled: boolean;
    isEditorsPick: boolean;
    editorsPickOrder: number;
    year: number;
  }>;
  sections: HomepageSectionSetting[];
};

export async function getHomepageAdminData(): Promise<HomepageAdminData> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      error: "غير مصرح. يرجى تسجيل الدخول إلى لوحة الإدارة.",
      publishedContent: [],
      sections: DEFAULT_HOMEPAGE_SECTIONS,
    };
  }

  const [moviesRes, seriesRes, sections] = await Promise.all([
    executeAdminRead<DbMovieRow[]>(
      "movies",
      "?select=*&status=eq.published&order=release_year.desc"
    ),
    executeAdminRead<Array<DbMovieRow & { series_categories?: any }>>(
      "series",
      "?select=*&status=eq.published&order=release_year.desc"
    ),
    getHomepageSectionsSettings(),
  ]);

  const movies = moviesRes.ok ? moviesRes.data : [];
  const series = seriesRes.ok ? seriesRes.data : [];

  const publishedContent = [
    ...movies.map((m) => {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      return {
        id: m.id,
        title: m.title_ar,
        englishTitle: m.title_original || "",
        format: "movie" as ContentFormat,
        posterUrl: m.poster_url,
        backdropUrl: m.backdrop_url,
        isFeatured: Boolean(m.is_featured),
        heroOrder: typeof meta.hero_order === "number" ? meta.hero_order : 999,
        heroEnabled: meta.hero_enabled !== false,
        isEditorsPick: Boolean(meta.is_editors_pick),
        editorsPickOrder: typeof meta.editors_pick_order === "number" ? meta.editors_pick_order : 999,
        year: m.release_year,
      };
    }),
    ...series.map((s) => {
      const meta = (s.metadata ?? {}) as Record<string, unknown>;
      return {
        id: s.id,
        title: s.title_ar,
        englishTitle: s.title_original || "",
        format: "series" as ContentFormat,
        posterUrl: s.poster_url,
        backdropUrl: s.backdrop_url,
        isFeatured: Boolean(s.is_featured),
        heroOrder: typeof meta.hero_order === "number" ? meta.hero_order : 999,
        heroEnabled: meta.hero_enabled !== false,
        isEditorsPick: Boolean(meta.is_editors_pick),
        editorsPickOrder: typeof meta.editors_pick_order === "number" ? meta.editors_pick_order : 999,
        year: s.release_year,
      };
    }),
  ];

  return {
    ok: true,
    publishedContent,
    sections,
  };
}

export type SaveHomepagePayload = {
  heroItems: Array<{ id: string; format: ContentFormat; order: number; enabled: boolean }>;
  editorsPicks: Array<{ id: string; format: ContentFormat; order: number }>;
  sections: HomepageSectionSetting[];
};

export async function saveHomepageConfig(
  payload: SaveHomepagePayload
): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يجب تسجيل الدخول كمسؤول أولاً." };
  }

  try {
    // 1. Fetch current movies and series rows to preserve existing metadata
    const [moviesRes, seriesRes] = await Promise.all([
      executeAdminRead<DbMovieRow[]>("movies", "?select=id,metadata,is_featured&status=eq.published"),
      executeAdminRead<DbMovieRow[]>("series", "?select=id,metadata,is_featured&status=eq.published"),
    ]);

    const moviesMap = new Map((moviesRes.ok ? moviesRes.data : []).map((m) => [m.id, m]));
    const seriesMap = new Map((seriesRes.ok ? seriesRes.data : []).map((s) => [s.id, s]));

    const heroMap = new Map(payload.heroItems.map((item) => [item.id, item]));
    const editorsMap = new Map(payload.editorsPicks.map((item) => [item.id, item]));

    // Update movies
    for (const [id, m] of moviesMap.entries()) {
      const heroConfig = heroMap.get(id);
      const editorConfig = editorsMap.get(id);

      const isFeatured = Boolean(heroConfig);
      const nextMeta = { ...(m.metadata ?? {}) };

      let changed = false;
      if (m.is_featured !== isFeatured) {
        changed = true;
      }

      if (heroConfig) {
        if (nextMeta.hero_order !== heroConfig.order || nextMeta.hero_enabled !== heroConfig.enabled) {
          nextMeta.hero_order = heroConfig.order;
          nextMeta.hero_enabled = heroConfig.enabled;
          changed = true;
        }
      } else if ("hero_order" in nextMeta || "hero_enabled" in nextMeta) {
        delete nextMeta.hero_order;
        delete nextMeta.hero_enabled;
        changed = true;
      }

      if (editorConfig) {
        if (!nextMeta.is_editors_pick || nextMeta.editors_pick_order !== editorConfig.order) {
          nextMeta.is_editors_pick = true;
          nextMeta.editors_pick_order = editorConfig.order;
          changed = true;
        }
      } else if (nextMeta.is_editors_pick) {
        delete nextMeta.is_editors_pick;
        delete nextMeta.editors_pick_order;
        changed = true;
      }

      if (changed) {
        await executeAdminWrite(
          "movies",
          "PATCH",
          { is_featured: isFeatured, metadata: nextMeta },
          `?id=eq.${id}`
        );
      }
    }

    // Update series
    for (const [id, s] of seriesMap.entries()) {
      const heroConfig = heroMap.get(id);
      const editorConfig = editorsMap.get(id);

      const isFeatured = Boolean(heroConfig);
      const nextMeta = { ...(s.metadata ?? {}) };

      let changed = false;
      if (s.is_featured !== isFeatured) {
        changed = true;
      }

      if (heroConfig) {
        if (nextMeta.hero_order !== heroConfig.order || nextMeta.hero_enabled !== heroConfig.enabled) {
          nextMeta.hero_order = heroConfig.order;
          nextMeta.hero_enabled = heroConfig.enabled;
          changed = true;
        }
      } else if ("hero_order" in nextMeta || "hero_enabled" in nextMeta) {
        delete nextMeta.hero_order;
        delete nextMeta.hero_enabled;
        changed = true;
      }

      if (editorConfig) {
        if (!nextMeta.is_editors_pick || nextMeta.editors_pick_order !== editorConfig.order) {
          nextMeta.is_editors_pick = true;
          nextMeta.editors_pick_order = editorConfig.order;
          changed = true;
        }
      } else if (nextMeta.is_editors_pick) {
        delete nextMeta.is_editors_pick;
        delete nextMeta.editors_pick_order;
        changed = true;
      }

      if (changed) {
        await executeAdminWrite(
          "series",
          "PATCH",
          { is_featured: isFeatured, metadata: nextMeta },
          `?id=eq.${id}`
        );
      }
    }

    // 2. Save sections to site_settings (merge/upsert)
    try {
      await executeAdminWrite(
        "site_settings",
        "POST",
        { key: "homepage_sections", value: payload.sections },
        "?on_conflict=key",
        "resolution=merge-duplicates"
      );
    } catch {
      // If site_settings table not created yet, changes to Hero & Editor's picks still persist
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "حدث خطأ أثناء حفظ إعدادات الصفحة الرئيسية." };
  }
}
