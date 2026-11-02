"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWatchlist } from "@/lib/use-watchlist";
import { useSegmentedGlider } from "@/lib/use-segmented-glider";
import { SpatialNavIcon, type SpatialNavIconName } from "./sidebar";

interface MobileTabItem {
  id: string;
  label: string;
  href: string;
  icon: SpatialNavIconName;
}

const mobileTabs: MobileTabItem[] = [
  { id: "home", label: "الرئيسية", href: "/", icon: "home" },
  { id: "movies", label: "أفلام", href: "/movies", icon: "movies" },
  { id: "search", label: "البحث", href: "/search", icon: "search" },
  { id: "series", label: "مسلسلات", href: "/series", icon: "series" },
  { id: "more", label: "المزيد", href: "#more", icon: "more" },
];

interface MoreDrawerItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: SpatialNavIconName;
  badge?: string;
}

const moreDrawerItems: MoreDrawerItem[] = [
  {
    id: "saved",
    label: "قائمتي المفضلة",
    subtitle: "الأفلام والمسلسلات التي حفظتها",
    href: "/#saved",
    icon: "saved",
  },
];

function getRouteTab(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/movies") || pathname.startsWith("/watch/movies")) return "movies";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/series") || pathname.startsWith("/watch/series")) return "series";
  return "";
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => getRouteTab(pathname));
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { savedIds } = useWatchlist();
  const { trackRef, tabRefs, glider } = useSegmentedGlider(isMoreOpen ? "more" : activeTab);

  useEffect(() => {
    setActiveTab(getRouteTab(pathname));
    setIsMoreOpen(false);
  }, [pathname]);

  const handleTabClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, tab: MobileTabItem) => {
      if (tab.id === "more") {
        e.preventDefault();
        setIsMoreOpen((prev) => !prev);
        return;
      }
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
          window.dispatchEvent(new HashChangeEvent("hashchange"));
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
        id="mobile-more-menu"
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
          {moreDrawerItems.map((item) => {
            const isSavedItem = item.id === "saved";
            const badge = isSavedItem
              ? savedIds.length > 0
                ? `${savedIds.length} محفوظ`
                : undefined
              : item.badge;
            const iconName: SpatialNavIconName =
              isSavedItem && savedIds.length > 0 ? "savedFilled" : item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="mobile-more-item"
                onClick={(e) => handleMoreItemClick(e, item)}
              >
                <div className="mobile-more-icon-box">
                  <SpatialNavIcon name={iconName} size={21} isActive />
                </div>
                <div className="mobile-more-text">
                  <div className="mobile-more-item-label">
                    <span>{item.label}</span>
                    {badge && <span className="mobile-more-badge">{badge}</span>}
                  </div>
                  <span className="mobile-more-item-subtitle">{item.subtitle}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Shares the homepage capsule's glider and interaction styles. */}
      <nav
        className="mobile-bottom-nav"
        aria-label="التنقل الرئيسي للهواتف"
      >
        <div
          ref={trackRef}
          className={`mobile-bottom-nav-inner segmented-capsule-bar ${glider.ready ? "is-glider-ready" : ""}`}
        >
          <span
            className={`segmented-capsule-glider ${glider.visible ? "is-visible" : ""}`}
            style={{
              width: `${glider.width}px`,
              transform: `translate3d(${glider.left}px, 0, 0)`,
            }}
            aria-hidden="true"
          />
          {mobileTabs.map((tab) => {
            const isActive = isMoreOpen ? tab.id === "more" : activeTab === tab.id;
            const tabProps = {
              ref: (element: HTMLElement | null) => {
                tabRefs.current[tab.id] = element;
              },
              className: `mobile-tab-btn segmented-capsule-tab ${isActive ? "is-active" : ""}`,
              onClick: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) =>
                handleTabClick(event, tab),
              "aria-label": tab.label,
            };
            const content = (
              <>
                <span className="mobile-tab-icon-box segmented-tab-icon" aria-hidden="true">
                  <SpatialNavIcon name={tab.icon} size={21} isActive={isActive} />
                  {tab.id === "more" && savedIds.length > 0 && (
                    <span className="mobile-tab-dot" aria-hidden="true" />
                  )}
                </span>
                <span className="mobile-tab-label segmented-tab-label" data-label={tab.label}>
                  <span>{tab.label}</span>
                </span>
              </>
            );

            return tab.id === "more" ? (
              <button
                key={tab.id}
                {...tabProps}
                type="button"
                aria-expanded={isMoreOpen}
                aria-controls="mobile-more-menu"
              >
                {content}
              </button>
            ) : (
              <Link
                key={tab.id}
                {...tabProps}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
