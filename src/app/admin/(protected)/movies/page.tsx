import { redirect } from "next/navigation";
import { MoviesCrudClient } from "./movies-crud-client";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminCategories, getAdminMovies } from "@/lib/movies-admin";

export const dynamic = "force-dynamic";

export default async function AdminMoviesPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [categories, moviesResult] = await Promise.all([
    getAdminCategories(),
    getAdminMovies(),
  ]);

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 9 · إدارة المحتوى وقاعدة البيانات</span>
          <h1 id="admin-movies-title">
            إدارة أفلام الكرتون<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">
            إضافة وتعديل ونشر وحذف الأفلام مباشرة في قاعدة بيانات Supabase مع مزامنة التصنيفات.
          </p>
        </div>

        <div className="admin-legend-box">
          <AdminDataOriginBadge origin="database" />
        </div>
      </header>

      <MoviesCrudClient
        initialMovies={moviesResult.movies}
        categories={categories}
        dbError={!moviesResult.ok ? moviesResult.error : undefined}
      />
    </main>
  );
}
