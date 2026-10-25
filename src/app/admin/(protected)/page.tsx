import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAdminPlatformCounts,
  getContentHealthReport,
  getPlaybackAnalytics,
} from "@/lib/admin-analytics";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { AdminDashboardAnalyticsClient } from "@/components/admin-dashboard-analytics-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة التحكم والإحصائيات · Cartoony Admin",
};

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [platformData, analyticsData, healthData] = await Promise.all([
    getAdminPlatformCounts(),
    getPlaybackAnalytics(),
    getContentHealthReport(),
  ]);

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header id="dashboard" className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 17 · مركز إدارة كارتوني والتحليلات المتقدمة</span>
          <h1 id="admin-dashboard-title">
            لوحة تحكم المنصة والتحليلات<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">
            متابعة شاملة لمرات بدء تشغيل الفيديو، وإحصائيات الأعمال المنشورة والمسودات، ومراقبة جودة المحتوى.
          </p>
        </div>

        <div className="admin-legend-box">
          <AdminDataOriginBadge origin="database" />
        </div>
      </header>

      <AdminDashboardAnalyticsClient
        counts={platformData.counts}
        analytics={analyticsData.analytics}
        health={healthData.report}
        recentItems={platformData.recentItems}
      />
    </main>
  );
}
