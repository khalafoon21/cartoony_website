"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon, type IconName } from "./icon";

export interface NavItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: IconName;
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
    id: "stories",
    label: "استكشف الحكايات",
    subtitle: "مكتبة الأفلام الكاملة",
    href: "/movies",
    icon: "film",
  },
  {
    id: "franchises",
    label: "عوالم كارتوني",
    subtitle: "السلاسل والشخصيات",
    href: "#franchises",
    icon: "sparkles",
    badge: "حصري",
  },
  {
    id: "categories",
    label: "التصنيفات",
    subtitle: "تصفح حسب المزاج",
    href: "#categories",
    icon: "grid",
  },
  {
    id: "saved",
    label: "قائمتي المفضلة",
    subtitle: "حكاياتك المحفوظة",
    href: "#stories",
    icon: "heart",
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

  // Sync active section if passed from parent or pathname
  useEffect(() => {
    if (pathname === "/search") {
      setActiveId("search");
    } else if (pathname === "/movies") {
      setActiveId("stories");
    } else if (pathname === "/") {
      setActiveId("home");
    } else if (activeSection) {
      setActiveId(activeSection);
    }
  }, [pathname, activeSection]);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const sectionIds = ["home", "franchises", "categories", "stories"];
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
  }, []);

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

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setActiveId(item.id);

    if (item.href.startsWith("#")) {
      const target = document.querySelector(item.href);
      if (target) {
        e.preventDefault();
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({
          behavior: prefersReduced ? "instant" : "smooth",
          block: "start",
        });
        window.history.pushState(null, "", item.href);
      }
    }
  }, []);

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
        className={`sidebar ${isExpanded ? "is-expanded" : ""} ${className}`}
        aria-label="القائمة الجانبية الرئيسية"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          setHoveredIndex(null);
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Ambient cursor-tracking spotlight layer */}
        <div className="sidebar-spotlight" aria-hidden="true" />

        {/* Top Brand Logo Slot (Fixed vertical height to prevent icon jump) */}
        <div className="sidebar-header">
          <a
            href="#home"
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
          </a>
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
                {/* Animated Icon Container */}
                <span className="sidebar-icon-box">
                  <Icon name={item.icon} size={22} />
                </span>

                {/* Staggered Cascade Label & Micro-Subtitle */}
                <span className="sidebar-label-box">
                  <span className="sidebar-label-text-group">
                    <span className="sidebar-item-label">{item.label}</span>
                    <span className="sidebar-item-subtitle">{item.subtitle}</span>
                  </span>
                  {item.badge && (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  )}
                </span>

                {/* Floating Glass Tooltip for Collapsed State */}
                <span className="sidebar-tooltip" aria-hidden="true">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" aria-hidden="true" />
      </aside>
    </>
  );
}
