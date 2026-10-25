import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { getHomepageAdminData } from "@/lib/homepage-admin";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { HomepageAdminClient } from "./homepage-admin-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إدارة الصفحة الرئيسية · Cartoony Admin",
};

export default async function AdminHomepagePage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const homepageData = await getHomepageAdminData();

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 16 · الصفحة الرئيسية الديناميكية</span>
          <h1 id="admin-homepage-title">
            إدارة الصفحة الرئيسية<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">
            التحكم في البانر الرئيسي (Hero Slider)، اختيارات المحرر، وترتيب وأقسام الصفحة الرئيسية الديناميكية.
          </p>
        </div>

        <div className="admin-legend-box">
          <AdminDataOriginBadge origin="database" />
        </div>
      </header>

      <HomepageAdminClient initialData={homepageData} />
    </main>
  );
}
