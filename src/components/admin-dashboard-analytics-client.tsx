"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type {
  ContentHealthReport,
  PlatformCounts,
  PlaybackAnalyticsData,
  RecentContentItem,
} from "@/lib/admin-analytics";

export function AdminDashboardAnalyticsClient({
  counts,
  analytics,
  health,
  recentItems,
}: {
  counts: PlatformCounts;
  analytics: PlaybackAnalyticsData;
  health: ContentHealthReport;
  recentItems: RecentContentItem[];
}) {
  const [chartRange, setChartRange] = useState<"7" | "30">("7");
  const [activeHealthTab, setActiveHealthTab] = useState<"posters" | "videos" | "drafts">(
    health.missingVideos.length > 0
      ? "videos"
      : health.missingPosters.length > 0
      ? "posters"
      : "drafts"
  );

  const activeDailyPoints = chartRange === "7" ? analytics.dailyLast7Days : analytics.dailyLast30Days;
  const maxDailyStarts = Math.max(1, ...activeDailyPoints.map((p) => p.starts));

  return (
    <div className="admin-dashboard-content-grid">
      {/* 5 Real Platform KPI Cards */}
      <section className="admin-stats-grid" aria-label="إحصائيات المنصة الحية">
        {/* Movies */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">أفلام الكرتون</span>
            <div className="admin-stat-icon-bubble">
              <Icon name="film" size={20} />
            </div>
          </div>
          <div className="admin-stat-value-row">
            <span className="admin-stat-number">{counts.moviesTotal}</span>
            <span className="admin-stat-unit">فيلم مسجل</span>
          </div>
          <div className="admin-stat-sub-pills">
            <span className="admin-stat-badge is-published">{counts.moviesPublished} منشور</span>
            <span className="admin-stat-badge is-draft">{counts.moviesDraft} مسودة</span>
          </div>
        </div>

        {/* Series */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">المسلسلات</span>
            <div className="admin-stat-icon-bubble">
              <Icon name="sparkles" size={20} />
            </div>
          </div>
          <div className="admin-stat-value-row">
            <span className="admin-stat-number">{counts.seriesTotal}</span>
            <span className="admin-stat-unit">مسلسل مسجل</span>
          </div>
          <div className="admin-stat-sub-pills">
            <span className="admin-stat-badge is-published">{counts.seriesPublished} منشور</span>
            <span className="admin-stat-badge is-draft">{counts.seriesDraft} مسودة</span>
          </div>
        </div>

        {/* Seasons & Episodes */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">الحلقات والمواسم</span>
            <div className="admin-stat-icon-bubble">
              <Icon name="grid" size={20} />
            </div>
          </div>
          <div className="admin-stat-value-row">
            <span className="admin-stat-number">{counts.episodesTotal}</span>
            <span className="admin-stat-unit">حلقة عبر {counts.seasonsTotal} مواسم</span>
          </div>
          <div className="admin-stat-sub-pills">
            <span className="admin-stat-badge is-published">{counts.episodesPublished} منشورة</span>
            <span className="admin-stat-badge is-draft">{counts.episodesDraft} مسودة</span>
          </div>
        </div>

        {/* Categories */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">التصنيفات المعتمدة</span>
            <div className="admin-stat-icon-bubble">
              <Icon name="grid" size={20} />
            </div>
          </div>
          <div className="admin-stat-value-row">
            <span className="admin-stat-number">{counts.categoriesTotal}</span>
            <span className="admin-stat-unit">تصنيف نشط</span>
          </div>
          <div className="admin-stat-sub-pills">
            <Link href="/admin/categories" className="admin-stat-link">
              <span>إدارة التصنيفات</span>
              <Icon name="arrow" size={12} />
            </Link>
          </div>
        </div>

        {/* Playback Starts */}
        <div className="admin-stat-card is-highlight">
          <div className="admin-stat-header">
            <span className="admin-stat-label">مرات بدء التشغيل</span>
            <div className="admin-stat-icon-bubble">
              <Icon name="play" size={20} />
            </div>
          </div>
          <div className="admin-stat-value-row">
            <span className="admin-stat-number">{analytics.totalStarts}</span>
            <span className="admin-stat-unit">بدء تشغيل فعلي</span>
          </div>
          <div className="admin-stat-sub-pills">
            <span className="admin-stat-meta-note">
              {analytics.last7DaysTotal} آخر 7 أيام · {analytics.last30DaysTotal} آخر 30 يوماً
            </span>
          </div>
        </div>
      </section>

      {/* Playback Activity Chart Card */}
      <section className="admin-homepage-card" aria-labelledby="analytics-chart-heading">
        <div className="admin-card-header-row">
          <div>
            <span className="eyebrow">إحصائيات المشاهدة الفعلية</span>
            <h2 id="analytics-chart-heading">نشاط بدء تشغيل الفيديو</h2>
            <p>
              يتم تسجيل مرات بدء تشغيل الفيديو الفعلية (Play starts) بدقة واستبعاد محاولات التكرار السريعة.
            </p>
          </div>

          <div className="admin-chart-toggle-group">
            <button
              type="button"
              className={`admin-chart-toggle-btn ${chartRange === "7" ? "is-active" : ""}`}
              onClick={() => setChartRange("7")}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              className={`admin-chart-toggle-btn ${chartRange === "30" ? "is-active" : ""}`}
              onClick={() => setChartRange("30")}
            >
              آخر 30 يوماً
            </button>
          </div>
        </div>

        {!analytics.hasData ? (
          <div className="admin-empty-box">
            <Icon name="sparkles" size={28} />
            <p>لا توجد بيانات تشغيل مسجلة حتى الآن. تبدأ الإحصائيات بالظهور بمجرد بدء تشغيل الزوار للفيديو.</p>
          </div>
        ) : (
          <div className="admin-chart-container">
            <div className="admin-chart-bars">
              {activeDailyPoints.map((point) => {
                const heightPercent = Math.max(8, Math.round((point.starts / maxDailyStarts) * 100));
                return (
                  <div key={point.date} className="admin-chart-col" title={`${point.label}: ${point.starts} بدء تشغيل`}>
                    <span className="admin-chart-col-value">{point.starts > 0 ? point.starts : ""}</span>
                    <div className="admin-chart-col-bar-wrap">
                      <div
                        className={`admin-chart-bar-fill ${point.starts > 0 ? "has-starts" : ""}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="admin-chart-col-label">
                      {chartRange === "7" ? point.label : point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="admin-chart-footer-note">
              * ملحوظة: تمثل هذه الأرقام عدد مرات النقر والبدء الفعلي لتشغيل الفيديو، وليست عدد الزوار الفريدين أو مرات إكمال المشاهدة.
            </p>
          </div>
        )}
      </section>

      {/* Top 10 Movies & Series Side by Side */}
      <div className="admin-analytics-columns-grid">
        {/* Top Movies */}
        <section className="admin-homepage-card" aria-labelledby="top-movies-heading">
          <div className="admin-card-header-row">
            <div>
              <h2 id="top-movies-heading">الأفلام الأكثر تشغيلاً (Top 10)</h2>
              <p>الأفلام الأكثر طلباً وبدءاً للتشغيل على المنصة.</p>
            </div>
          </div>

          {analytics.topMovies.length === 0 ? (
            <div className="admin-empty-box">
              <p>لا توجد بيانات تشغيل كافية للأفلام بعد.</p>
            </div>
          ) : (
            <div className="admin-reorder-list">
              {analytics.topMovies.map((movie, idx) => (
                <div key={movie.id} className="admin-reorder-item">
                  <span className="admin-reorder-rank">#{idx + 1}</span>
                  <div className="admin-reorder-thumb">
                    {movie.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={movie.posterUrl} alt={movie.title} />
                    ) : (
                      <Icon name="film" size={20} />
                    )}
                  </div>
                  <div className="admin-reorder-info">
                    <strong>{movie.title}</strong>
                    <div className="admin-reorder-sub">
                      <span>{movie.year}</span>
                      <span className="meta-pill is-mini is-views">
                        {movie.startsCount} بدء تشغيل
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Series */}
        <section className="admin-homepage-card" aria-labelledby="top-series-heading">
          <div className="admin-card-header-row">
            <div>
              <h2 id="top-series-heading">المسلسلات الأكثر تشغيلاً (Top 10)</h2>
              <p>مجموع مرات تشغيل حلقات كل مسلسل.</p>
            </div>
          </div>

          {analytics.topSeries.length === 0 ? (
            <div className="admin-empty-box">
              <p>لا توجد بيانات تشغيل كافية للمسلسلات بعد.</p>
            </div>
          ) : (
            <div className="admin-reorder-list">
              {analytics.topSeries.map((series, idx) => (
                <div key={series.id} className="admin-reorder-item">
                  <span className="admin-reorder-rank">#{idx + 1}</span>
                  <div className="admin-reorder-thumb">
                    {series.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={series.posterUrl} alt={series.title} />
                    ) : (
                      <Icon name="sparkles" size={20} />
                    )}
                  </div>
                  <div className="admin-reorder-info">
                    <strong>{series.title}</strong>
                    <div className="admin-reorder-sub">
                      <span>{series.year}</span>
                      <span className="meta-pill is-mini is-views">
                        {series.startsCount} بدء تشغيل
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Content Health Audit Section */}
      <section className="admin-homepage-card" aria-labelledby="health-audit-heading">
        <div className="admin-card-header-row">
          <div>
            <span className="eyebrow">صحة وجودة المحتوى (Content Health)</span>
            <h2 id="health-audit-heading">مراقبة جودة الكتالوج والمصادر</h2>
            <p>
              فحص تلقائي للأفلام والمسلسلات التي تنقصها ملصقات، أو محتوى منشور بدون مصدر فيديو، أو مسودات معلقة.
            </p>
          </div>

          <div className="admin-chart-toggle-group">
            <button
              type="button"
              className={`admin-chart-toggle-btn ${activeHealthTab === "videos" ? "is-active" : ""}`}
              onClick={() => setActiveHealthTab("videos")}
            >
              فيديو مفقود ({health.missingVideos.length})
            </button>
            <button
              type="button"
              className={`admin-chart-toggle-btn ${activeHealthTab === "posters" ? "is-active" : ""}`}
              onClick={() => setActiveHealthTab("posters")}
            >
              ملصق مفقود ({health.missingPosters.length})
            </button>
            <button
              type="button"
              className={`admin-chart-toggle-btn ${activeHealthTab === "drafts" ? "is-active" : ""}`}
              onClick={() => setActiveHealthTab("drafts")}
            >
              مسودات معلقة ({health.pendingDrafts.length})
            </button>
          </div>
        </div>

        {activeHealthTab === "videos" && (
          <div className="admin-health-list">
            {health.missingVideos.length === 0 ? (
              <div className="admin-feedback-banner is-success">
                <Icon name="check" size={18} />
                <span>ممتاز! جميع الأفلام والحلقات المنشورة تحتوي على مصادر تشغيل صالحة.</span>
              </div>
            ) : (
              health.missingVideos.map((issue) => (
                <div key={`${issue.type}-${issue.id}`} className="admin-health-row is-warning">
                  <div className="admin-health-info">
                    <strong>{issue.title}</strong>
                    <span>{issue.reasonLabel}</span>
                  </div>
                  <Link href={issue.editHref} className="secondary-button is-mini">
                    <span>إضافة مصدر الفيديو</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {activeHealthTab === "posters" && (
          <div className="admin-health-list">
            {health.missingPosters.length === 0 ? (
              <div className="admin-feedback-banner is-success">
                <Icon name="check" size={18} />
                <span>رائع! جميع الأعمال في الكتالوج تحتوي على ملصقات بوستر عالية الدقة.</span>
              </div>
            ) : (
              health.missingPosters.map((issue) => (
                <div key={`${issue.type}-${issue.id}`} className="admin-health-row is-warning">
                  <div className="admin-health-info">
                    <strong>{issue.title}</strong>
                    <span>{issue.reasonLabel}</span>
                  </div>
                  <Link href={issue.editHref} className="secondary-button is-mini">
                    <span>رفع ملصق</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {activeHealthTab === "drafts" && (
          <div className="admin-health-list">
            {health.pendingDrafts.length === 0 ? (
              <div className="admin-feedback-banner is-success">
                <Icon name="check" size={18} />
                <span>لا توجد مسودات معلقة، كل الأعمال الحالية منشورة ومتاحة للزوار.</span>
              </div>
            ) : (
              health.pendingDrafts.map((issue) => (
                <div key={`${issue.type}-${issue.id}`} className="admin-health-row">
                  <div className="admin-health-info">
                    <strong>{issue.title}</strong>
                    <span>{issue.reasonLabel}</span>
                  </div>
                  <Link href={issue.editHref} className="secondary-button is-mini">
                    <span>مراجعة ونشر</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Recently Added Real Content */}
      <section className="admin-homepage-card" aria-labelledby="recently-added-heading">
        <div className="admin-card-header-row">
          <div>
            <h2 id="recently-added-heading">أحدث الأعمال المضافة في قاعدة البيانات</h2>
            <p>الأفلام والمسلسلات التي أُضيفت مؤخراً إلى قاعدة بيانات Supabase.</p>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th scope="col">العمل</th>
                <th scope="col">النوع</th>
                <th scope="col">السنة</th>
                <th scope="col">الحالة</th>
                <th scope="col">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody>
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>
                    لا توجد أعمال مضافة حديثاً.
                  </td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={`${item.format}-${item.id}`}>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>
                      <span className="meta-pill is-mini">
                        {item.format === "movie" ? "فيلم" : "مسلسل"}
                      </span>
                    </td>
                    <td>{item.year}</td>
                    <td>
                      <span className={`admin-pill-btn ${item.status === "published" ? "is-enabled" : ""}`}>
                        {item.status === "published" ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td dir="ltr">{item.createdAt.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
