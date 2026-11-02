"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const { trackRef, tabRefs, glider } = useSegmentedGlider(activeTab);

  useEffect(() => {
    setActiveTab(getRouteTab(pathname));
  }, [pathname]);

  const handleTabClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, tab: MobileTabItem) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      setActiveTab(tab.id);
    },
    []
  );

  return (
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
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              href={tab.href}
              className={`mobile-tab-btn segmented-capsule-tab ${isActive ? "is-active" : ""}`}
              onClick={(event) => handleTabClick(event, tab)}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="mobile-tab-icon-box segmented-tab-icon" aria-hidden="true">
                <SpatialNavIcon name={tab.icon} size={21} isActive={isActive} />
              </span>
              <span className="mobile-tab-label segmented-tab-label" data-label={tab.label}>
                <span>{tab.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
