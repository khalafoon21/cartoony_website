"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import type { AdminCategoryWithCounts, CategoryPayload } from "@/lib/categories-admin";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "./actions";

export function CategoriesCrudClient({
  initialCategories,
  dbError,
}: {
  initialCategories: AdminCategoryWithCounts[];
  dbError?: string;
}) {
  const [categories, setCategories] = useState<AdminCategoryWithCounts[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(dbError ? { type: "error", text: dbError } : null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryWithCounts | null>(null);

  // Delete confirm state
  const [deletingCategory, setDeletingCategory] = useState<AdminCategoryWithCounts | null>(null);

  // Form fields
  const [titleAr, setTitleAr] = useState("");
  const [titleOriginal, setTitleOriginal] = useState("");
  const [slug, setSlug] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [status, setStatus] = useState<"published" | "draft">("published");

  const openAddModal = () => {
    setEditingCategory(null);
    setTitleAr("");
    setTitleOriginal("");
    setSlug("");
    setDescriptionAr("");
    setDisplayOrder(categories.length + 1);
    setStatus("published");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AdminCategoryWithCounts) => {
    setEditingCategory(cat);
    setTitleAr(cat.title_ar);
    setTitleOriginal(cat.title_original);
    setSlug(cat.slug);
    setDescriptionAr(cat.description_ar || "");
    setDisplayOrder(cat.display_order || 0);
    setStatus(cat.status === "draft" ? "draft" : "published");
    setIsModalOpen(true);
  };

  const handleSlugAuto = (val: string) => {
    setTitleOriginal(val);
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const payload: CategoryPayload = {
      title_ar: titleAr,
      title_original: titleOriginal,
      slug,
      description_ar: descriptionAr,
      display_order: Number(displayOrder),
      status,
    };

    startTransition(async () => {
      if (editingCategory) {
        const res = await updateCategoryAction(editingCategory.id, payload);
        if (res.ok && res.category) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? {
                    ...c,
                    ...res.category,
                    moviesCount: c.moviesCount,
                    seriesCount: c.seriesCount,
                  }
                : c
            )
          );
          setFeedback({ type: "success", text: `تم تحديث التصنيف "${titleAr}" بنجاح.` });
          setIsModalOpen(false);
        } else {
          setFeedback({ type: "error", text: res.error || "تعذر تحديث التصنيف." });
        }
      } else {
        const res = await createCategoryAction(payload);
        if (res.ok && res.category) {
          setCategories((prev) => [
            ...prev,
            { ...res.category!, moviesCount: 0, seriesCount: 0 },
          ]);
          setFeedback({ type: "success", text: `تمت إضافة التصنيف "${titleAr}" بنجاح.` });
          setIsModalOpen(false);
        } else {
          setFeedback({ type: "error", text: res.error || "تعذر إضافة التصنيف." });
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deletingCategory) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await deleteCategoryAction(deletingCategory.id);
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
        setFeedback({
          type: "success",
          text: `تم حذف التصنيف "${deletingCategory.title_ar}" بنجاح.`,
        });
        setDeletingCategory(null);
      } else {
        setFeedback({
          type: "error",
          text: res.error || "تعذر حذف التصنيف.",
        });
        setDeletingCategory(null);
      }
    });
  };

  return (
    <div className="admin-categories-manager">
      {/* Action Header */}
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">إدارة هيكل التصفح والكتالوج</span>
          <h2>تصنيفات المنصة والأقسام</h2>
          <p className="admin-page-desc">
            إضافة وتعديل وحذف التصنيفات. يتم منع حذف أي تصنيف طالما توجد أعمال مرتبطة به لحماية روابط الكتالوج.
          </p>
        </div>

        <button type="button" onClick={openAddModal} className="primary-button is-admin-save">
          <Icon name="plus" size={16} />
          <span>إضافة تصنيف جديد</span>
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

      {/* Categories Table Card */}
      <div className="admin-homepage-card">
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <caption>قائمة التصنيفات الحالية ({categories.length} تصنيف)</caption>
            <thead>
              <tr>
                <th scope="col">الترتيب</th>
                <th scope="col">اسم التصنيف</th>
                <th scope="col">الاسم اللاتيني</th>
                <th scope="col">الرابط (Slug)</th>
                <th scope="col">الأفلام المرتبطة</th>
                <th scope="col">المسلسلات المرتبطة</th>
                <th scope="col">الحالة</th>
                <th scope="col">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px" }}>
                    لا توجد تصنيفات حالياً.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <span className="admin-reorder-rank">#{cat.display_order}</span>
                    </td>
                    <td>
                      <strong>{cat.title_ar}</strong>
                      {cat.description_ar && (
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                          {cat.description_ar}
                        </small>
                      )}
                    </td>
                    <td dir="ltr">{cat.title_original}</td>
                    <td dir="ltr">
                      <code>/category/{cat.slug}</code>
                    </td>
                    <td>
                      <span className="meta-pill is-mini">
                        {cat.moviesCount} {cat.moviesCount === 1 ? "فيلم" : "أفلام"}
                      </span>
                    </td>
                    <td>
                      <span className="meta-pill is-mini">
                        {cat.seriesCount} {cat.seriesCount === 1 ? "مسلسل" : "مسلسلات"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-pill-btn ${cat.status === "published" ? "is-enabled" : ""}`}
                        style={{ pointerEvents: "none" }}
                      >
                        {cat.status === "published" ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-reorder-actions">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="admin-icon-btn"
                          title="تعديل التصنيف"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat)}
                          className="admin-icon-btn is-delete"
                          title="حذف التصنيف"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingCategory ? "تعديل بيانات التصنيف" : "إضافة تصنيف جديد"}</h3>
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="admin-field">
                <label htmlFor="cat-title-ar">اسم التصنيف بالعربية *</label>
                <input
                  id="cat-title-ar"
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="مثال: مغامرات، كوميديا..."
                  className="admin-modal-input"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="cat-title-orig">الاسم اللاتيني / الإنجليزي *</label>
                <input
                  id="cat-title-orig"
                  type="text"
                  required
                  value={titleOriginal}
                  onChange={(e) => handleSlugAuto(e.target.value)}
                  placeholder="e.g. Adventure, Comedy..."
                  className="admin-modal-input"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="cat-slug">الرابط المختصر (Slug) *</label>
                <input
                  id="cat-slug"
                  type="text"
                  required
                  dir="ltr"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. adventure"
                  className="admin-modal-input"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="cat-desc">وصف التصنيف (اختياري)</label>
                <input
                  id="cat-desc"
                  type="text"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  placeholder="نبذة مختصرة تظهر في صفحة القسم"
                  className="admin-modal-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="admin-field">
                  <label htmlFor="cat-order">ترتيب الظهور</label>
                  <input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="admin-modal-input"
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="cat-status">الحالة</label>
                  <select
                    id="cat-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="admin-modal-input"
                  >
                    <option value="published">منشور</option>
                    <option value="draft">مسودة</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary-button"
                  disabled={isPending}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="primary-button is-admin-save"
                >
                  <Icon name="check" size={16} />
                  <span>{isPending ? "جاري الحفظ..." : editingCategory ? "حفظ التعديلات" : "إضافة التصنيف"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Warning Dialog */}
      {deletingCategory && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setDeletingCategory(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="admin-modal-header" style={{ borderBottomColor: "rgba(232, 88, 66, 0.2)" }}>
              <h3 style={{ color: "var(--coral)" }}>تأكيد حذف التصنيف</h3>
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => setDeletingCategory(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p>
                هل أنت متأكد من رغبتك في حذف التصنيف <strong>&quot;{deletingCategory.title_ar}&quot;</strong>؟
              </p>

              {(deletingCategory.moviesCount > 0 || deletingCategory.seriesCount > 0) ? (
                <div
                  className="admin-feedback-banner is-error"
                  style={{ fontSize: "13px", padding: "10px" }}
                >
                  <Icon name="close" size={16} />
                  <span>
                    تنبيه: هذا التصنيف مرتبط بـ {deletingCategory.moviesCount} فيلم و {deletingCategory.seriesCount} مسلسل. لا يمكن حذفه إلا بعد إزالة ارتباطه بهذه الأعمال أولاً.
                  </span>
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                  هذا التصنيف غير مرتبط بأي أفلام أو مسلسلات حالياً، ويمكن حذفه بأمان.
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="secondary-button"
                  disabled={isPending}
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isPending || deletingCategory.moviesCount > 0 || deletingCategory.seriesCount > 0}
                  onClick={handleDelete}
                  className="admin-icon-btn is-delete"
                  style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold" }}
                >
                  <Icon name="trash" size={16} />
                  <span>{isPending ? "جاري الحذف..." : "تأكيد الحذف"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
