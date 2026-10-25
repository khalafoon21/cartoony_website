"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAdminAction } from "@/app/admin/actions";
import type { AdminNavSection } from "@/lib/admin-data";
import { Icon } from "./icon";

export function AdminSidebar({
  adminEmail,
  navSections: adminNavSections,
}: {
  adminEmail: string;
  navSections: AdminNavSection[];
}) {
  const pathname = usePathname();
  const [hashId, setHashId] = useState<string>("");

  const activeId = pathname.startsWith("/admin/movies")
    ? "movies"
    : pathname.startsWith("/admin/series")
    ? "series"
    : pathname.startsWith("/admin/homepage")
    ? "homepage"
    : pathname.startsWith("/admin/categories")
    ? "categories"
    : hashId || "dashboard";

  return (
    <aside className="admin-sidebar" aria-label="قائمة إدارة كارتوني">
      <div className="admin-sidebar-top">
        <Link href="/admin" className="admin-sidebar-brand">
          <Image
            src="/branding/cartoony-logo.png"
            alt="شعار كارتوني"
            width={136}
            height={84}
            className="admin-sidebar-logo"
            priority
          />
          <span className="admin-sidebar-badge">لوحة الإدارة</span>
        </Link>
      </div>

      <nav className="admin-sidebar-nav" aria-label="أقسام لوحة التحكم">
        <ul role="list" className="admin-nav-list">
          {adminNavSections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  onClick={() => {
                    if (section.href.includes("#")) {
                      setHashId(section.id);
                    } else {
                      setHashId("");
                    }
                  }}
                  className={`admin-nav-link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="admin-nav-icon">
                    <Icon name={section.icon} size={20} />
                  </span>
                  <span className="admin-nav-text">
                    <strong>{section.label}</strong>
                    <small>{section.subtitle}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-session-box">
          <span className="admin-session-dot" aria-hidden="true" />
          <div className="admin-session-meta">
            <strong>مشرف المنصة</strong>
            <small dir="ltr">{adminEmail}</small>
          </div>
        </div>

        <div className="admin-footer-actions">
          <Link href="/" className="admin-public-link">
            <span>الواجهة العامة</span>
            <Icon name="arrow" size={14} />
          </Link>

          <form action={logoutAdminAction}>
            <button type="submit" className="admin-logout-btn">
              <span>خروج</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
