"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useWatchlist } from "@/lib/use-watchlist";

export type SpatialNavIconName =
  | "home"
  | "search"
  | "movies"
  | "series"
  | "categories"
  | "saved"
  | "savedFilled"
  | "more"
  | "franchises";

export function SpatialNavIcon({
  name,
  size = 22,
  isActive = false,
}: {
  name: SpatialNavIconName;
  size?: number;
  isActive?: boolean;
}) {
  const fillAlpha = isActive ? "0.28" : "0.14";

  switch (name) {
    case "home":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          {/* Soft duotone house body */}
          <path
            d="M4 10.8C4 9.5 4.6 8.3 5.6 7.5L10.4 3.8C11.3 3.1 12.7 3.1 13.6 3.8L18.4 7.5C19.4 8.3 20 9.5 20 10.8V18.2C20 19.8 18.7 21 17.2 21H6.8C5.3 21 4 19.8 4 18.2V10.8Z"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Glowing portal arch */}
          <path
            d="M9.5 21V15.2C9.5 13.8 10.6 12.7 12 12.7C13.4 12.7 14.5 13.8 14.5 15.2V21"
            fill="currentColor"
            fillOpacity={isActive ? "0.35" : "0.18"}
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          {/* Top specular roof highlight */}
          <path
            d="M8.5 8.2H15.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </svg>
      );

    case "search":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          {/* Frosted glass lens */}
          <circle
            cx="11"
            cy="11"
            r="7.2"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.8"
          />
          {/* Smart sparkle inside lens */}
          <path
            d="M11 7.3L11.8 9.4L13.9 10.2L11.8 11L11 13.1L10.2 11L8.1 10.2L10.2 9.4L11 7.3Z"
            fill="currentColor"
            fillOpacity="0.85"
          />
          {/* Sculpted handle */}
          <path
            d="M16.5 16.5L20.4 20.4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "movies":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          {/* Modern rounded cinema clapper/screen body */}
          <rect
            x="3"
            y="5"
            width="18"
            height="15"
            rx="4.2"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
          />
          {/* Top clapper bar */}
          <path
            d="M3.5 9.2H20.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeOpacity="0.75"
          />
          <path
            d="M8.5 5L6.8 9.2M13.5 5L11.8 9.2M18.2 5L16.5 9.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          {/* Center play emblem */}
          <path
            d="M10.4 12.2L14.8 14.7L10.4 17.2V12.2Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "series":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          {/* Back stacked episode layer */}
          <path
            d="M6.5 4.2H17.5C18.8 4.2 19.8 5.2 19.8 6.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
          {/* Front spatial cinema display */}
          <rect
            x="3"
            y="7.2"
            width="18"
            height="12.5"
            rx="3.8"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
          />
          {/* Play badge inside screen */}
          <path
            d="M10.3 11L14.5 13.45L10.3 15.9V11Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          {/* Sleek floating stand bar */}
          <path
            d="M9 22H15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        </svg>
      );

    case "categories":
    case "more":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          <rect
            x="3.5"
            y="3.5"
            width="7.2"
            height="7.2"
            rx="2.6"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect
            x="3.5"
            y="13.3"
            width="7.2"
            height="7.2"
            rx="2.6"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect
            x="13.3"
            y="13.3"
            width="7.2"
            height="7.2"
            rx="2.6"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
          />
          {/* Top-left accented spatial diamond/star tile */}
          <path
            d="M16.9 3.2L20.8 7.1L16.9 11L13 7.1L16.9 3.2Z"
            fill="currentColor"
            fillOpacity={isActive ? "0.5" : "0.28"}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "saved":
    case "savedFilled": {
      const filled = name === "savedFilled" || isActive;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          <path
            d="M12 20.4C12 20.4 3.5 15.2 3.5 8.9C3.5 6.1 5.7 4 8.3 4C10 4 11.3 4.9 12 6.1C12.7 4.9 14 4 15.7 4C18.3 4 20.5 6.1 20.5 8.9C20.5 15.2 12 20.4 12 20.4Z"
            fill="currentColor"
            fillOpacity={filled ? "0.42" : fillAlpha}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Specular inner highlight curve */}
          <path
            d="M6.8 7.4C6.2 8 6 8.8 6.2 9.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </svg>
      );
    }

    case "franchises":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="spatial-svg-icon"
        >
          <path
            d="M12 3L14.4 8.8L20.5 11.2L14.4 13.6L12 19.5L9.6 13.6L3.5 11.2L9.6 8.8L12 3Z"
            fill="currentColor"
            fillOpacity={fillAlpha}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
        </svg>
      );
  }
}

export interface NavItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: SpatialNavIconName;
  badge?: string;
}

export const defaultNavItems: NavItem[] = [
  {
    id: "home",
    label: "الرئيسية",
    subtitle: "العرض المميز الآن",
    href: "/",
    icon: "home",
  },
  {
    id: "search",
    label: "البحث الذكي",
    subtitle: "ابحث في كل الأعمال",
    href: "/search",
    icon: "search",
  },
  {
    id: "movies",
    label: "الأفلام",
    subtitle: "مكتبة الأفلام الكاملة",
    href: "/movies",
    icon: "movies",
  },
  {
    id: "series",
    label: "المسلسلات",
    subtitle: "مواسم وحلقات متتابعة",
    href: "/series",
    icon: "series",
  },
  {
    id: "categories",
    label: "التصنيفات",
    subtitle: "تصفح حسب المزاج",
    href: "/#categories",
    icon: "categories",
  },
  {
    id: "saved",
    label: "قائمتي المفضلة",
    subtitle: "حكاياتك المحفوظة",
    href: "/#saved",
    icon: "saved",
  },
];

export interface SidebarProps {
  activeSection?: string;
  className?: string;
}

export function Sidebar({ activeSection, className = "" }: SidebarProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>(activeSection || "home");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const { savedIds } = useWatchlist();

  // Sync active section with current route
  useEffect(() => {
    if (pathname?.startsWith("/search")) {
      setActiveId("search");
    } else if (pathname?.startsWith("/movies") || pathname?.startsWith("/watch/movies")) {
      setActiveId("movies");
    } else if (pathname?.startsWith("/series") || pathname?.startsWith("/watch/series")) {
      setActiveId("series");
    } else if (pathname?.startsWith("/category")) {
      setActiveId("categories");
    } else if (pathname === "/") {
      setActiveId("home");
    } else if (activeSection) {
      setActiveId(activeSection);
    }
  }, [pathname, activeSection]);

  // Scroll-spy via IntersectionObserver when on homepage
  useEffect(() => {
    if (pathname !== "/") return;

    const sectionIds = ["home", "categories", "saved"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target?.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: 0.12,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  // Direct DOM cursor spotlight tracking (zero React re-renders)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = sidebarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    el.style.setProperty("--mouse-y", `${y}px`);
    el.style.setProperty("--mouse-x", `${x}px`);
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
      setActiveId(item.id);

      if (item.href.startsWith("/#") && pathname === "/") {
        const hash = item.href.slice(1);
        const target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({
            behavior: prefersReduced ? "instant" : "smooth",
            block: "start",
          });
          window.history.pushState(null, "", hash);
        }
      } else if (item.href === "/" && pathname === "/") {
        e.preventDefault();
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({
          top: 0,
          behavior: prefersReduced ? "instant" : "smooth",
        });
      }
    },
    [pathname]
  );

  const activeIndex = Math.max(
    0,
    defaultNavItems.findIndex((item) => item.id === activeId)
  );

  const navStyle = {
    "--active-index": activeIndex,
    "--hover-index": hoveredIndex !== null ? hoveredIndex : activeIndex,
    "--has-hover": hoveredIndex !== null ? 1 : 0,
  } as CSSProperties;

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* Ambient page backdrop dim when sidebar is expanded */}
      <div
        className={`sidebar-scrim ${isExpanded ? "is-visible" : ""}`}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={`sidebar is-ios27-dock ${isExpanded ? "is-expanded" : ""} ${className}`}
        aria-label="القائمة الجانبية الرئيسية"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          setHoveredIndex(null);
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Specular liquid glass inner rim & ambient spotlight */}
        <div className="sidebar-liquid-rim" aria-hidden="true" />
        <div className="sidebar-spotlight" aria-hidden="true" />

        {/* Top Brand Logo Slot */}
        <div className="sidebar-header">
          <Link
            href="/"
            className="sidebar-brand"
            aria-label="كارتوني — العودة إلى الرئيسية"
            onClick={(e) => handleNavClick(e, defaultNavItems[0])}
          >
            <div className="sidebar-logo-glow" aria-hidden="true" />
            <div className="sidebar-logo-wrap">
              <Image
                src="/branding/cartoony-logo.png"
                alt="كارتوني"
                width={168}
                height={108}
                className="sidebar-logo-img"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Navigation Items with Magnetic Sliding Gliders */}
        <nav
          className="sidebar-nav"
          aria-label="أقسام الموقع"
          style={navStyle}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Magnetic Hover Glider Capsule */}
          <div className="sidebar-hover-glider" aria-hidden="true" />

          {/* Sliding Active Selection Capsule & Glowing Torch Bar */}
          <div className="sidebar-active-glider" aria-hidden="true">
            <span className="sidebar-active-torch" />
          </div>

          {defaultNavItems.map((item, index) => {
            const isActive = activeId === item.id;
            const isHovered = hoveredIndex === index;
            const isSavedItem = item.id === "saved";
            const savedCount = isSavedItem ? savedIds.length : 0;
            const badgeText = isSavedItem
              ? savedCount > 0
                ? String(savedCount)
                : undefined
              : item.badge;
            const iconName: SpatialNavIconName =
              isSavedItem && savedCount > 0 ? "savedFilled" : item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                style={{ "--i": index } as CSSProperties}
                className={`sidebar-nav-item icon-type-${item.icon} ${
                  isActive ? "is-active" : ""
                } ${isHovered ? "is-hovered" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Spatial Glass Icon Squircle Well */}
                <span className="sidebar-icon-box">
                  <SpatialNavIcon name={iconName} size={22} isActive={isActive || isHovered} />
                  {isSavedItem && savedCount > 0 && (
                    <span className="sidebar-icon-dot-badge" aria-hidden="true">
                      {savedCount}
                    </span>
                  )}
                </span>

                {/* Staggered Cascade Label & Micro-Subtitle */}
                <span className="sidebar-label-box">
                  <span className="sidebar-label-text-group">
                    <span className="sidebar-item-label">{item.label}</span>
                    <span className="sidebar-item-subtitle">{item.subtitle}</span>
                  </span>
                  {badgeText && (
                    <span className="sidebar-item-badge">{badgeText}</span>
                  )}
                </span>

                {/* Floating Glass Tooltip for Collapsed State */}
                <span className="sidebar-tooltip" aria-hidden="true">
                  {item.label}
                  {badgeText ? ` (${badgeText})` : ""}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/search"
            className="sidebar-spatial-pill"
            aria-label="البحث السريع في كارتوني"
          >
            <span className="sidebar-spatial-pill-dot" aria-hidden="true" />
            <span className="sidebar-spatial-pill-text">مسرح كارتوني السينمائي</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
