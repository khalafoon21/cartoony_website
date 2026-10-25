import { redirect } from "next/navigation";
import { SeriesCrudClient } from "./series-crud-client";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminCategories } from "@/lib/movies-admin";
import { getAdminSeriesList } from "@/lib/series-admin";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [categories, seriesResult] = await Promise.all([
    getAdminCategories(),
    getAdminSeriesList(),
  ]);

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 13 · إدارة المسلسلات والمواسم والحلقات</span>
          <h1 id="admin-series-title">
            إدارة مسلسلات الكرتون<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">
            إضافة وتعديل وحذف مسلسلات الكرتون ومواسمها وحلقاتها مباشرة في قاعدة بيانات Supabase.
          </p>
        </div>

        <div className="admin-legend-box">
          <AdminDataOriginBadge origin="database" />
        </div>
      </header>

      <SeriesCrudClient
        initialSeries={seriesResult.series}
        categories={categories}
        dbError={!seriesResult.ok ? seriesResult.error : undefined}
      />
    </main>
  );
}
