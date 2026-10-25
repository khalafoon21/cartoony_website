"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import type { ContentFormat } from "@/lib/movies";
import type { HomepageAdminData, HomepageSectionSetting } from "@/lib/homepage-admin";
import { saveHomepageAction } from "./actions";

export function HomepageAdminClient({
  initialData,
}: {
  initialData: HomepageAdminData;
}) {
  const [isPending, startTransition] = useTransition();

  const publishedContent = initialData.publishedContent;
  const contentMap = new Map(publishedContent.map((c) => [c.id, c]));

  // Hero state
  const initialHeroItems = publishedContent
    .filter((c) => c.isFeatured)
    .sort((a, b) => a.heroOrder - b.heroOrder)
    .map((c, idx) => ({
      id: c.id,
      format: c.format,
      order: idx + 1,
      enabled: c.heroEnabled,
    }));

  const [heroItems, setHeroItems] = useState(initialHeroItems);

  // Editor's Picks state
  const initialEditorsPicks = publishedContent
    .filter((c) => c.isEditorsPick)
    .sort((a, b) => a.editorsPickOrder - b.editorsPickOrder)
    .map((c, idx) => ({
      id: c.id,
      format: c.format,
      order: idx + 1,
    }));

  const [editorsPicks, setEditorsPicks] = useState(initialEditorsPicks);

  // Sections state
  const [sections, setSections] = useState<HomepageSectionSetting[]>(
    [...initialData.sections].sort((a, b) => a.order - b.order)
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals for adding items
  const [isAddHeroModalOpen, setIsAddHeroModalOpen] = useState(false);
  const [isAddEditorModalOpen, setIsAddEditorModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Reordering helpers
  const moveHeroItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= heroItems.length) return;
    const next = [...heroItems];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setHeroItems(next.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const removeHeroItem = (id: string) => {
    setHeroItems((prev) =>
      prev.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }))
    );
  };

  const toggleHeroEnabled = (id: string) => {
    setHeroItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const addHeroItem = (id: string, format: ContentFormat) => {
    if (heroItems.some((item) => item.id === id)) return;
    setHeroItems((prev) => [
      ...prev,
      { id, format, order: prev.length + 1, enabled: true },
    ]);
    setIsAddHeroModalOpen(false);
  };

  const moveEditorPick = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editorsPicks.length) return;
    const next = [...editorsPicks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setEditorsPicks(next.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const removeEditorPick = (id: string) => {
    setEditorsPicks((prev) =>
      prev.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }))
    );
  };

  const addEditorPick = (id: string, format: ContentFormat) => {
    if (editorsPicks.some((item) => item.id === id)) return;
    setEditorsPicks((prev) => [
      ...prev,
      { id, format, order: prev.length + 1 },
    ]);
    setIsAddEditorModalOpen(false);
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSections(next.map((sec, idx) => ({ ...sec, order: idx + 1 })));
  };

  const toggleSectionEnabled = (id: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, enabled: !sec.enabled } : sec))
    );
  };

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveHomepageAction({
        heroItems,
        editorsPicks,
        sections,
      });

      if (res.ok) {
        setFeedback({
          type: "success",
          text: "تم حفظ إعدادات وترتيب الصفحة الرئيسية بنجاح، والتغييرات تظهر للزوار فوراً.",
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "تعذر حفظ إعدادات الصفحة الرئيسية.",
        });
      }
    });
  };

  // Filter for modal selection
  const modalCandidates = publishedContent.filter((c) => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.englishTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-homepage-manager">
      {/* Header with Save Button */}
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">إدارة محتوى المنصة</span>
          <h1>إعدادات الصفحة الرئيسية (Dynamic Homepage)</h1>
          <p className="admin-page-desc">
            تحكم في سلايدر الواجهة الرئيسية (Hero)، مختارات المشرفين، وترتيب الأقسام المعروضة للزوار.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="primary-button is-admin-save"
        >
          <Icon name="check" size={18} />
          <span>{isPending ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`admin-feedback-banner is-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          <Icon name={feedback.type === "success" ? "check" : "close"} size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Hero Slides Section */}
      <section className="admin-homepage-card" aria-labelledby="hero-manager-title">
        <div className="admin-card-header-row">
          <div>
            <h2 id="hero-manager-title">سلايدر الواجهة الرئيسية (Hero Slider)</h2>
            <p>اختر الأفلام والمسلسلات المميزة ورتّب ظهورها في السلايدر التفاعلي أعلى الصفحة.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setModalSearch("");
              setIsAddHeroModalOpen(true);
            }}
          >
            <Icon name="plus" size={16} />
            <span>إضافة عمل للسلايدر</span>
          </button>
        </div>

        {heroItems.length === 0 ? (
          <div className="admin-empty-box">
            <p>لا توجد أعمال مميزة في السلايدر حالياً. سيتم عرض أحدث الأعمال تلقائياً.</p>
          </div>
        ) : (
          <div className="admin-reorder-list">
            {heroItems.map((item, index) => {
              const content = contentMap.get(item.id);
              if (!content) return null;
              return (
                <div
                  key={item.id}
                  className={`admin-reorder-item ${!item.enabled ? "is-disabled-item" : ""}`}
                >
                  <span className="admin-reorder-rank">#{index + 1}</span>

                  <div className="admin-reorder-thumb">
                    {content.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={content.posterUrl} alt={content.title} />
                    ) : (
                      <Icon name="film" size={20} />
                    )}
                  </div>

                  <div className="admin-reorder-info">
                    <strong>{content.title}</strong>
                    <div className="admin-reorder-sub">
                      <span className="meta-pill is-mini">
                        {content.format === "series" ? "مسلسل" : "فيلم"}
                      </span>
                      <span>{content.year}</span>
                      {content.englishTitle && (
                        <span dir="ltr" className="admin-reorder-en">
                          {content.englishTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-reorder-actions">
                    <button
                      type="button"
                      className={`admin-pill-btn ${item.enabled ? "is-enabled" : ""}`}
                      onClick={() => toggleHeroEnabled(item.id)}
                      title={item.enabled ? "تعطيل من السلايدر" : "تفعيل في السلايدر"}
                    >
                      {item.enabled ? "مفعّل" : "معطّل"}
                    </button>

                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveHeroItem(index, "up")}
                      className="admin-icon-btn"
                      title="تحريك لأعلى"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === heroItems.length - 1}
                      onClick={() => moveHeroItem(index, "down")}
                      className="admin-icon-btn"
                      title="تحريك لأسفل"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHeroItem(item.id)}
                      className="admin-icon-btn is-delete"
                      title="إزالة من السلايدر"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editor's Picks Section */}
      <section className="admin-homepage-card" aria-labelledby="editors-picks-title">
        <div className="admin-card-header-row">
          <div>
            <h2 id="editors-picks-title">مختارات كارتوني (Editor&apos;s Picks)</h2>
            <p>حدد أعمالاً مختارة وموصى بها للعرض في قسم خاص في الصفحة الرئيسية.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setModalSearch("");
              setIsAddEditorModalOpen(true);
            }}
          >
            <Icon name="plus" size={16} />
            <span>إضافة إلى المختارات</span>
          </button>
        </div>

        {editorsPicks.length === 0 ? (
          <div className="admin-empty-box">
            <p>لم يتم تحديد أعمال لقسم المختارات بعد.</p>
          </div>
        ) : (
          <div className="admin-reorder-list">
            {editorsPicks.map((item, index) => {
              const content = contentMap.get(item.id);
              if (!content) return null;
              return (
                <div key={item.id} className="admin-reorder-item">
                  <span className="admin-reorder-rank">#{index + 1}</span>

                  <div className="admin-reorder-thumb">
                    {content.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={content.posterUrl} alt={content.title} />
                    ) : (
                      <Icon name="sparkles" size={20} />
                    )}
                  </div>

                  <div className="admin-reorder-info">
                    <strong>{content.title}</strong>
                    <div className="admin-reorder-sub">
                      <span className="meta-pill is-mini">
                        {content.format === "series" ? "مسلسل" : "فيلم"}
                      </span>
                      <span>{content.year}</span>
                    </div>
                  </div>

                  <div className="admin-reorder-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveEditorPick(index, "up")}
                      className="admin-icon-btn"
                      title="تحريك لأعلى"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === editorsPicks.length - 1}
                      onClick={() => moveEditorPick(index, "down")}
                      className="admin-icon-btn"
                      title="تحريك لأسفل"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEditorPick(item.id)}
                      className="admin-icon-btn is-delete"
                      title="إزالة من المختارات"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sections Manager */}
      <section className="admin-homepage-card" aria-labelledby="sections-manager-title">
        <div className="admin-card-header-row">
          <div>
            <h2 id="sections-manager-title">أقسام وترتيب الصفحة الرئيسية</h2>
            <p>
              تحكم في ظهور وترتيب الأقسام. الأقسام الفارغة تختفي تلقائياً، وقسم &quot;الأكثر مشاهدة&quot;
              لا يظهر إلا عند توفر بيانات حقيقية.
            </p>
          </div>
        </div>

        <div className="admin-reorder-list">
          {sections.map((sec, index) => (
            <div
              key={sec.id}
              className={`admin-reorder-item is-section-row ${!sec.enabled ? "is-disabled-item" : ""}`}
            >
              <span className="admin-reorder-rank">#{index + 1}</span>

              <div className="admin-reorder-info">
                <strong>{sec.title}</strong>
                <span className="admin-section-subline">
                  {sec.eyebrow} • {sec.subtitle}
                </span>
              </div>

              <div className="admin-reorder-actions">
                <button
                  type="button"
                  className={`admin-pill-btn ${sec.enabled ? "is-enabled" : ""}`}
                  onClick={() => toggleSectionEnabled(sec.id)}
                >
                  {sec.enabled ? "معروض للزوار" : "مخفي"}
                </button>

                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveSection(index, "up")}
                  className="admin-icon-btn"
                  title="تحريك لأعلى"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, "down")}
                  className="admin-icon-btn"
                  title="تحريك لأسفل"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Hero Modal */}
      {isAddHeroModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsAddHeroModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>إضافة عمل إلى سلايدر الواجهة (Hero)</h3>
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => setIsAddHeroModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-modal-search">
              <input
                type="search"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="ابحث في الأفلام والمسلسلات المنشورة..."
                className="admin-modal-input"
                autoFocus
              />
            </div>

            <div className="admin-modal-list">
              {modalCandidates.length === 0 ? (
                <p className="admin-modal-empty">لا توجد أعمال مطابقة للبحث.</p>
              ) : (
                modalCandidates.map((item) => {
                  const alreadyInHero = heroItems.some((h) => h.id === item.id);
                  return (
                    <div key={item.id} className="admin-modal-item">
                      <div className="admin-modal-thumb">
                        {item.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.posterUrl} alt={item.title} />
                        ) : (
                          <Icon name="film" size={20} />
                        )}
                      </div>
                      <div className="admin-modal-meta">
                        <strong>{item.title}</strong>
                        <span>
                          {item.format === "series" ? "مسلسل" : "فيلم"} • {item.year}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyInHero}
                        onClick={() => addHeroItem(item.id, item.format)}
                        className={`admin-add-btn ${alreadyInHero ? "is-added" : ""}`}
                      >
                        {alreadyInHero ? "مضاف بالفعل" : "إضافة للسلايدر"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Editor Pick Modal */}
      {isAddEditorModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsAddEditorModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>إضافة عمل إلى مختارات كارتوني</h3>
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => setIsAddEditorModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-modal-search">
              <input
                type="search"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="ابحث في الأعمال المنشورة..."
                className="admin-modal-input"
                autoFocus
              />
            </div>

            <div className="admin-modal-list">
              {modalCandidates.length === 0 ? (
                <p className="admin-modal-empty">لا توجد أعمال مطابقة للبحث.</p>
              ) : (
                modalCandidates.map((item) => {
                  const alreadyInPicks = editorsPicks.some((ep) => ep.id === item.id);
                  return (
                    <div key={item.id} className="admin-modal-item">
                      <div className="admin-modal-thumb">
                        {item.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.posterUrl} alt={item.title} />
                        ) : (
                          <Icon name="sparkles" size={20} />
                        )}
                      </div>
                      <div className="admin-modal-meta">
                        <strong>{item.title}</strong>
                        <span>
                          {item.format === "series" ? "مسلسل" : "فيلم"} • {item.year}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyInPicks}
                        onClick={() => addEditorPick(item.id, item.format)}
                        className={`admin-add-btn ${alreadyInPicks ? "is-added" : ""}`}
                      >
                        {alreadyInPicks ? "مضاف بالفعل" : "إضافة للمختارات"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
