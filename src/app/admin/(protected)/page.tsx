import { redirect } from "next/navigation";
import {
  AdminCrudPanel,
  AdminDataOriginBadge,
  AdminStatCard,
} from "@/components/admin-dashboard-widgets";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAdminDashboardOverview,
  MOCK_EPISODES_TOTAL,
} from "@/lib/admin-data";
import { allMovies, categories } from "@/lib/movies";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const overview = await getAdminDashboardOverview();
  const catalogMovies = allMovies.filter((m) => m.format === "movie");
  const catalogSeries = allMovies.filter((m) => m.format === "series");

  return (
    <main id="main-content" className="admin-dashboard-main" tabIndex={-1}>
      <header id="dashboard" className="admin-dashboard-header">
        <div>
          <span className="eyebrow">المرحلة 8 · مركز إدارة كارتوني وقاعدة البيانات</span>
          <h1 id="admin-dashboard-title">
            نظرة عامة على المنصة<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p className="section-note">{overview.statusMessage}</p>
        </div>

        <div className="admin-legend-box">
          {overview.dbConnected ? (
            <AdminDataOriginBadge origin="database" />
          ) : (
            <>
              <AdminDataOriginBadge origin="catalog" />
              <AdminDataOriginBadge origin="mock" />
            </>
          )}
        </div>
      </header>

      {/* 4 Statistics Cards: Movies, Series, Episodes, Categories */}
      <section
        className="admin-stats-grid"
        aria-label="إحصائيات المنصة الأساسية"
      >
        {overview.stats.map((metric) => (
          <AdminStatCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* Movies Management Section */}
      <AdminCrudPanel
        id="movies"
        eyebrow="قسم الأفلام"
        title="إدارة أفلام الكرتون"
        description="انتقل إلى صفحة إدارة الأفلام لإضافة أو تعديل أو نشر أو حذف الأفلام في قاعدة البيانات."
        actionLabel="إدارة الأفلام"
        actionHref="/admin/movies"
        origin="database"
      >
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <caption>قائمة أفلام الكرتون الحالية ({catalogMovies.length} أفلام)</caption>
            <thead>
              <tr>
                <th scope="col">العنوان</th>
                <th scope="col">التصنيف</th>
                <th scope="col">السنة</th>
                <th scope="col">النسخة</th>
                <th scope="col">المدة</th>
                <th scope="col">التقييم</th>
              </tr>
            </thead>
            <tbody>
              {catalogMovies.map((movie) => (
                <tr key={movie.id}>
                  <td>
                    <strong>{movie.title}</strong>
                    <small>{movie.subtitle}</small>
                  </td>
                  <td>{movie.categoryLabel}</td>
                  <td>{movie.year}</td>
                  <td>
                    <span className="admin-pill">{movie.audioBadge}</span>
                  </td>
                  <td>{movie.duration}</td>
                  <td dir="ltr">{movie.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCrudPanel>

      {/* Series Management Section Placeholder */}
      <AdminCrudPanel
        id="series"
        eyebrow="قسم المسلسلات والحلقات"
        title="إدارة مسلسلات الكرتون"
        description={`إجمالي المسلسلات الفعلية: ${catalogSeries.length} مسلسلات — إجمالي الحلقات التجريبي (Mock): ${MOCK_EPISODES_TOTAL} حلقة.`}
        actionLabel="إضافة مسلسل جديد (قريباً)"
        origin="mock"
      >
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <caption>قائمة مسلسلات الكرتون ({catalogSeries.length} مسلسلات)</caption>
            <thead>
              <tr>
                <th scope="col">المسلسل</th>
                <th scope="col">التصنيف</th>
                <th scope="col">السنة</th>
                <th scope="col">عدد الحلقات</th>
                <th scope="col">النسخة</th>
              </tr>
            </thead>
            <tbody>
              {catalogSeries.map((series) => (
                <tr key={series.id}>
                  <td>
                    <strong>{series.title}</strong>
                    <small>{series.subtitle}</small>
                  </td>
                  <td>{series.categoryLabel}</td>
                  <td>{series.year}</td>
                  <td>{series.duration}</td>
                  <td>
                    <span className="admin-pill">{series.audioBadge}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCrudPanel>

      {/* Categories Management Section Placeholder */}
      <AdminCrudPanel
        id="categories"
        eyebrow="هيكل التصفح"
        title="إدارة التصنيفات"
        description="التصنيفات السبعة المعتمدة في شريط التصفح الرئيسي."
        actionLabel="تصنيف جديد (قريباً)"
        origin="catalog"
      >
        <div className="admin-categories-chips">
          {categories.map((cat) => (
            <div key={cat.id} className="admin-category-chip">
              <strong>{cat.label}</strong>
              <small dir="ltr">/category/{cat.slug}</small>
            </div>
          ))}
        </div>
      </AdminCrudPanel>

      {/* Settings & Security Section */}
      <AdminCrudPanel
        id="settings"
        eyebrow="تكوين النظام والأمان"
        title="إعدادات الحماية والجلسة"
        description="ملخص ضوابط الأمان المطبقة على بوابة المشرف."
        actionLabel="تحديث الإعدادات (قريباً)"
        origin="catalog"
      >
        <div className="admin-security-notes">
          <div className="admin-security-item">
            <strong>تخزين كلمات المرور</strong>
            <p>مشفرة عبر خوارزمية scrypt مع Salt عشوائي ومقارنة زمنية ثابتة (timingSafeEqual).</p>
          </div>
          <div className="admin-security-item">
            <strong>ملفات تعريف الارتباط (Cookies)</strong>
            <p>جلسات HttpOnly موقعة بـ HMAC-SHA256 مع إبطال فوري للرمز (JTI Revocation) عند تسجيل الخروج.</p>
          </div>
          <div className="admin-security-item">
            <strong>قاعدة بيانات Supabase PostgreSQL</strong>
            <p>
              {overview.dbConnected
                ? "متصل بقاعدة البيانات مع تفعيل سياسات RLS للقراءة العامة للمنشورات فقط."
                : `بانتظار ضبط المتغيرات (${overview.missingVars.join("، ") || "تشغيل ملف الترحيل SQL"}).`}
            </p>
          </div>
          <div className="admin-security-item is-warning">
            <strong>تنبيه استضافة Serverless (تحديد المعدل)</strong>
            <p>
              يعتمد تحديد محاولات الدخول حالياً على الذاكرة المحلية (In-Memory Map)؛ عند النشر على بيئة Serverless متعددة النسخ يجب ربطه بـ Redis/KV مركزي.
            </p>
          </div>
        </div>
      </AdminCrudPanel>
    </main>
  );
}
