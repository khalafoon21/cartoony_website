import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminStatMetric, DataOrigin } from "@/lib/admin-data";
import { Icon } from "./icon";

export function AdminDataOriginBadge({
  origin,
  label,
}: {
  origin: DataOrigin;
  label?: string;
}) {
  const defaultLabel =
    origin === "database"
      ? "بيانات حية (Supabase)"
      : origin === "mock"
      ? "بيانات تجريبية (Mock)"
      : "بيانات الكتالوج الفعلي";

  return (
    <span className={`admin-origin-badge is-${origin}`}>
      {label ?? defaultLabel}
    </span>
  );
}

export function AdminStatCard({ metric }: { metric: AdminStatMetric }) {
  return (
    <article className="admin-stat-card" aria-label={metric.label}>
      <div className="admin-stat-top">
        <span className="eyebrow">{metric.label}</span>
        <AdminDataOriginBadge origin={metric.origin} label={metric.originNote} />
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.unitLabel}</small>
    </article>
  );
}

export function AdminCrudPanel({
  id,
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  origin,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  origin: DataOrigin;
  children: ReactNode;
}) {
  const headingId = `${id}-panel-heading`;
  return (
    <section
      id={id}
      className="admin-crud-panel"
      aria-labelledby={headingId}
    >
      <header className="admin-panel-heading">
        <div>
          <div className="admin-panel-title-row">
            <span className="eyebrow">{eyebrow}</span>
            <AdminDataOriginBadge origin={origin} />
          </div>
          <h2 id={headingId}>
            {title}
            <span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <p className="section-note">{description}</p>
        </div>

        {actionHref ? (
          <Link href={actionHref} className="admin-crud-action-btn is-enabled">
            <Icon name="plus" size={16} />
            <span>{actionLabel}</span>
          </Link>
        ) : onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="admin-crud-action-btn is-enabled"
          >
            <Icon name="plus" size={16} />
            <span>{actionLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            className="admin-crud-action-btn"
            aria-disabled="true"
            title="ستتوفر عمليات الإضافة والتعديل قريبًا"
          >
            <Icon name="plus" size={16} />
            <span>{actionLabel}</span>
          </button>
        )}
      </header>

      <div className="admin-panel-body">{children}</div>
    </section>
  );
}
