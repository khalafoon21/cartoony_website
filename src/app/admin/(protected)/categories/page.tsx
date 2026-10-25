import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminCategoriesWithCounts } from "@/lib/categories-admin";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { CategoriesCrudClient } from "./categories-crud-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إدارة التصنيفات · Cartoony Admin",
};

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const catResult = await getAdminCategoriesWithCounts();

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 17 · إدارة هيكل المنصة والتصنيفات</span>
          <h1 id="admin-categories-title">
            إدارة التصنيفات<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">
            إضافة وتعديل وحذف تصنيفات المحتوى مع متابعة إحصائيات الأعمال المرتبطة بكل تصنيف ومنع الحذف العرضي.
          </p>
        </div>

        <div className="admin-legend-box">
          <AdminDataOriginBadge origin="database" />
        </div>
      </header>

      <CategoriesCrudClient
        initialCategories={catResult.categories}
        dbError={!catResult.ok ? catResult.error : undefined}
      />
    </main>
  );
}
