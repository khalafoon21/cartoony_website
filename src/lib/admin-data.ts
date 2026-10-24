import { allMovies } from "./admin-demo-catalog";
import { categories } from "./movies";
import { fetchTableExactCount, getSupabaseEnvStatus } from "./supabase-server";
import type { IconName } from "@/components/icon";

export type DataOrigin = "database" | "catalog" | "mock";

export type AdminNavSection = {
  id: "dashboard" | "movies" | "series" | "categories" | "settings";
  label: string;
  subtitle: string;
  href: string;
  icon: IconName;
};

export type AdminStatMetric = {
  id: "movies" | "series" | "episodes" | "categories";
  label: string;
  value: number;
  unitLabel: string;
  origin: DataOrigin;
  originNote: string;
};

export type AdminContentPreviewItem = {
  id: string;
  title: string;
  formatLabel: string;
  categoryLabel: string;
  year: number;
  duration: string;
  audioBadge: string;
  origin: DataOrigin;
};

export const adminNavSections: AdminNavSection[] = [
  {
    id: "dashboard",
    label: "لوحة التحكم",
    subtitle: "نظرة عامة وإحصائيات",
    href: "/admin",
    icon: "home",
  },
  {
    id: "movies",
    label: "الأفلام",
    subtitle: "إدارة أفلام الكرتون",
    href: "/admin/movies",
    icon: "film",
  },
  {
    id: "series",
    label: "المسلسلات",
    subtitle: "المواسم والحلقات",
    href: "/admin#series",
    icon: "sparkles",
  },
  {
    id: "categories",
    label: "التصنيفات",
    subtitle: "الأقسام والوسوم",
    href: "/admin#categories",
    icon: "grid",
  },
  {
    id: "settings",
    label: "الإعدادات",
    subtitle: "الأمان وتكوين المنصة",
    href: "/admin#settings",
    icon: "user",
  },
];

// Real counts derived from the shared catalog configuration (`src/lib/movies.ts`)
const catalogMovies = allMovies.filter((item) => item.format === "movie");
const catalogSeries = allMovies.filter((item) => item.format === "series");

// Mock episode count placeholder until database integration in Phase 7B
export const MOCK_EPISODES_TOTAL = 126;

export const adminDashboardStats: AdminStatMetric[] = [
  {
    id: "movies",
    label: "الأفلام",
    value: catalogMovies.length,
    unitLabel: "فيلم في الكتالوج الحالي",
    origin: "catalog",
    originNote: "بيانات فعلية من الكتالوج",
  },
  {
    id: "series",
    label: "المسلسلات",
    value: catalogSeries.length,
    unitLabel: "مسلسل في الكتالوج الحالي",
    origin: "catalog",
    originNote: "بيانات فعلية من الكتالوج",
  },
  {
    id: "episodes",
    label: "الحلقات",
    value: MOCK_EPISODES_TOTAL,
    unitLabel: "حلقة عبر 6 مسلسلات",
    origin: "mock",
    originNote: "بيانات تجريبية (بانتظار قاعدة البيانات)",
  },
  {
    id: "categories",
    label: "التصنيفات",
    value: categories.length,
    unitLabel: "تصنيف نشط في الواجهة",
    origin: "catalog",
    originNote: "بيانات فعلية من الكتالوج",
  },
];

export const adminRecentCatalogItems: AdminContentPreviewItem[] = allMovies
  .slice(0, 6)
  .map((item) => ({
    id: item.id,
    title: item.title,
    formatLabel: item.format === "movie" ? "فيلم" : "مسلسل",
    categoryLabel: item.categoryLabel,
    year: item.year,
    duration: item.duration,
    audioBadge: item.audioBadge,
    origin: "catalog",
  }));

export type LiveDashboardOverview = {
  dbConnected: boolean;
  statusMessage: string;
  missingVars: string[];
  stats: AdminStatMetric[];
};

/**
 * Fetches live counts from Supabase PostgreSQL when credentials are configured
 * and the schema is reachable. Never fakes a database connection: falls back
 * transparently to catalog/mock counts and reports exact missing setup steps.
 */
export async function getAdminDashboardOverview(): Promise<LiveDashboardOverview> {
  const envStatus = getSupabaseEnvStatus();
  const missingVars: string[] = [];

  if (!envStatus.hasUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!envStatus.hasPublicKey) missingVars.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!envStatus.hasAdminKey) missingVars.push("SUPABASE_SECRET_KEY");

  if (!envStatus.isConfiguredForPublic && !envStatus.isConfiguredForAdmin) {
    return {
      dbConnected: false,
      statusMessage:
        "وضع المعاينة المحلية: لم يتم ضبط متغيرات Supabase في .env.local بعد. تُعرض حالياً بيانات الكتالوج والبيانات التجريبية.",
      missingVars,
      stats: adminDashboardStats,
    };
  }

  const [moviesCount, seriesCount, episodesCount, categoriesCount] = await Promise.all([
    fetchTableExactCount("movies", { useServiceRole: true }),
    fetchTableExactCount("series", { useServiceRole: true }),
    fetchTableExactCount("episodes", { useServiceRole: true }),
    fetchTableExactCount("categories", { useServiceRole: true }),
  ]);

  const isReachable =
    moviesCount !== null &&
    seriesCount !== null &&
    episodesCount !== null &&
    categoriesCount !== null;

  if (!isReachable) {
    return {
      dbConnected: false,
      statusMessage:
        "تم العثور على متغيرات البيئة ولكن تعذر الوصول إلى جداول Supabase (تأكد من تشغيل ملف الترحيل 202610240001_cartoony_schema.sql).",
      missingVars,
      stats: adminDashboardStats,
    };
  }

  const statusMessage = envStatus.hasAdminKey
    ? "متصل بقاعدة بيانات Supabase PostgreSQL بنجاح (بيانات حية وصلاحيات المشرف كاملة)."
    : "متصل بقاعدة بيانات Supabase PostgreSQL بنجاح (بيانات حية، بانتظار إضافة SUPABASE_SECRET_KEY لتفعيل صلاحيات كتابة المشرف).";

  return {
    dbConnected: true,
    statusMessage,
    missingVars,
    stats: [
      {
        id: "movies",
        label: "الأفلام",
        value: moviesCount,
        unitLabel: "فيلم في قاعدة البيانات",
        origin: "database",
        originNote: "بيانات حية (Supabase DB)",
      },
      {
        id: "series",
        label: "المسلسلات",
        value: seriesCount,
        unitLabel: "مسلسل في قاعدة البيانات",
        origin: "database",
        originNote: "بيانات حية (Supabase DB)",
      },
      {
        id: "episodes",
        label: "الحلقات",
        value: episodesCount,
        unitLabel: "حلقة مسجلة في قاعدة البيانات",
        origin: "database",
        originNote: "بيانات حية (Supabase DB)",
      },
      {
        id: "categories",
        label: "التصنيفات",
        value: categoriesCount,
        unitLabel: "تصنيف في قاعدة البيانات",
        origin: "database",
        originNote: "بيانات حية (Supabase DB)",
      },
    ],
  };
}
