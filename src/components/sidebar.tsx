"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icon";
import { LoginModal } from "./login-modal";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  badge?: string;
}

export const defaultNavItems: NavItem[] = [
  { id: "home", label: "الرئيسية", href: "#home", icon: "home" },
  { id: "stories", label: "استكشف الحكايات", href: "#stories", icon: "film" },
  { id: "franchises", label: "عوالم كارتوني", href: "#franchises", icon: "sparkles", badge: "مميز" },
  { id: "categories", label: "التصنيفات", href: "#categories", icon: "grid" },
  { id: "saved", label: "قائمتي", href: "#stories", icon: "heart" },
];

export interface SidebarProps {
  onLogin?: () => void;
  activeSection?: string;
  className?: string;
}

export function Sidebar({ onLogin, activeSection, className = "" }: SidebarProps) {
  const [activeId, setActiveId] = useState<string>(activeSection || "home");
  const [isHovered, setIsHovered] = useState(false);
  const internalLoginRef = useRef<HTMLDialogElement>(null);

  // Sync active section if passed from parent
  useEffect(() => {
    if (activeSection) {
      setActiveId(activeSection);
    }
  }, [activeSection]);

  // Observe sections on scroll to automatically highlight active item
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
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0.1,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
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
    },
    []
  );

  const handleLoginClick = useCallback(() => {
    if (onLogin) {
      onLogin();
    } else {
      internalLoginRef.current?.showModal();
    }
  }, [onLogin]);

  return (
    <>
      <aside
        className={`sidebar ${isHovered ? "is-expanded" : ""} ${className}`}
        aria-label="القائمة الجانبية الرئيسية"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Brand Logo */}
        <div className="sidebar-header">
          <a
            href="#home"
            className="sidebar-brand"
            aria-label="كارتوني — العودة إلى الرئيسية"
            onClick={(e) => handleNavClick(e, defaultNavItems[0])}
          >
            <div className="sidebar-logo-wrap">
              <Image
                src="/branding/cartoony-logo.png"
                alt="كارتوني"
                width={160}
                height={102}
                className="sidebar-logo-img"
                priority
              />
            </div>
          </a>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav" aria-label="أقسام الموقع">
          {defaultNavItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`sidebar-nav-item ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                title={!isHovered ? item.label : undefined}
              >
                {/* Visual active indicator bar on the right */}
                <span className="sidebar-active-indicator" aria-hidden="true" />

                {/* Animated Icon box */}
                <span className="sidebar-icon-box">
                  <Icon name={item.icon} size={22} />
                </span>

                {/* Smooth expanding label */}
                <span className="sidebar-label-box">
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && <span className="sidebar-item-badge">{item.badge}</span>}
                </span>

                {/* Native-style floating tooltip when collapsed */}
                <span className="sidebar-tooltip" aria-hidden="true">
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>

        {/* Bottom User / Login Section */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button
            type="button"
            onClick={handleLoginClick}
            className="sidebar-user-card"
            aria-label="تسجيل الدخول أو عرض الحساب"
            title={!isHovered ? "تسجيل الدخول" : undefined}
          >
            <div className="sidebar-user-avatar">
              <Icon name="user" size={20} />
              <span className="sidebar-status-dot" title="حالة الحساب" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">تسجيل الدخول</span>
              <span className="sidebar-user-hint">انضم لعالمنا</span>
            </div>
            <span className="sidebar-user-arrow" aria-hidden="true">
              <Icon name="arrow" size={16} />
            </span>
            <span className="sidebar-tooltip" aria-hidden="true">
              تسجيل الدخول
            </span>
          </button>
        </div>
      </aside>

      {/* Internal modal fallback when rendered standalone without onLogin */}
      {!onLogin && <LoginModal ref={internalLoginRef} />}
    </>
  );
}
