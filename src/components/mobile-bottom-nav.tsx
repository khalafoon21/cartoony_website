"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

interface MobileTabItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
}

const mobileTabs: MobileTabItem[] = [
  { id: "home", label: "الرئيسية", href: "/", icon: "home" },
  { id: "movies", label: "أفلام", href: "/movies", icon: "film" },
  { id: "search", label: "البحث", href: "/search", icon: "search" },
  { id: "series", label: "مسلسلات", href: "/series", icon: "sparkles" },
  { id: "more", label: "المزيد", href: "#more", icon: "grid" },
];

interface MoreDrawerItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: IconName;
  badge?: string;
}

const moreDrawerItems: MoreDrawerItem[] = [
  {
    id: "franchises",
    label: "عوالم كارتوني",
    subtitle: "السلاسل والشخصيات المميزة",
    href: "/#franchises",
    icon: "sparkles",
    badge: "حصري",
  },
  {
    id: "categories",
    label: "التصنيفات",
    subtitle: "تصفح حسب المزاج والأجواء",
    href: "/#categories",
    icon: "grid",
  },
  {
    id: "saved",
    label: "قائمتي المفضلة",
    subtitle: "حكاياتك المحفوظة لهذه الجلسة",
    href: "/#stories",
    icon: "heart",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/") {
      setActiveTab("home");
    } else if (pathname?.startsWith("/movies") || pathname?.startsWith("/watch/movies")) {
      setActiveTab("movies");
    } else if (pathname?.startsWith("/search")) {
      setActiveTab("search");
    } else if (pathname?.startsWith("/series") || pathname?.startsWith("/watch/series")) {
      setActiveTab("series");
    } else {
      setActiveTab("");
    }
  }, [pathname]);

  const handleTabClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, tab: MobileTabItem) => {
      if (tab.id === "more") {
        e.preventDefault();
        setIsMoreOpen((prev) => !prev);
        return;
      }
      setIsMoreOpen(false);
      setActiveTab(tab.id);
    },
    []
  );

  const handleMoreItemClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: MoreDrawerItem) => {
      setIsMoreOpen(false);
      if (item.href.startsWith("/#") && pathname === "/") {
        e.preventDefault();
        const hash = item.href.replace("/", "");
        const target = document.querySelector(hash);
        if (target) {
          const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({
            behavior: prefersReduced ? "instant" : "smooth",
            block: "start",
          });
          window.history.pushState(null, "", hash);
        }
      }
    },
    [pathname]
  );

  return (
    <>
      {/* Backdrop scrim for More sheet */}
      <div
        className={`mobile-more-backdrop ${isMoreOpen ? "is-visible" : ""}`}
        onClick={() => setIsMoreOpen(false)}
        aria-hidden="true"
      />

      {/* More Options Bottom Drawer */}
      <div
        className={`mobile-more-drawer ${isMoreOpen ? "is-open" : ""}`}
        role="dialog"
        aria-label="قائمة المزيد"
        aria-hidden={!isMoreOpen}
      >
        <div className="mobile-more-handle" aria-hidden="true" />
        <div className="mobile-more-header">
          <span className="mobile-more-title">المزيد من كارتوني</span>
          <button
            type="button"
            className="mobile-more-close-btn"
            onClick={() => setIsMoreOpen(false)}
            aria-label="إغلاق القائمة"
          >
            ✕
          </button>
        </div>
        <div className="mobile-more-grid">
          {moreDrawerItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="mobile-more-item"
              onClick={(e) => handleMoreItemClick(e, item)}
            >
              <div className="mobile-more-icon-box">
                <Icon name={item.icon} size={20} />
              </div>
              <div className="mobile-more-text">
                <div className="mobile-more-item-label">
                  <span>{item.label}</span>
                  {item.badge && <span className="mobile-more-badge">{item.badge}</span>}
                </div>
                <span className="mobile-more-item-subtitle">{item.subtitle}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-nav"
        aria-label="التنقل الرئيسي للهواتف"
      >
        <div className="mobile-bottom-nav-inner">
          {mobileTabs.map((tab) => {
            const isActive = isMoreOpen ? tab.id === "more" : activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`mobile-tab-btn ${isActive ? "is-active" : ""}`}
                onClick={(e) => handleTabClick(e, tab)}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                <span className="mobile-tab-indicator" aria-hidden="true" />
                <span className="mobile-tab-icon-box">
                  <Icon name={tab.icon} size={20} />
                </span>
                <span className="mobile-tab-label">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
