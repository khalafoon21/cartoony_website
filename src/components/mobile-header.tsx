"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { Icon } from "@/components/icon";
import { useWatchlist } from "@/lib/use-watchlist";

export function MobileHeader() {
  const pathname = usePathname();
  const { savedIds } = useWatchlist();

  const handleSavedClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === "/") {
        const target = document.getElementById("saved");
        if (target) {
          e.preventDefault();
          const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({
            behavior: prefersReduced ? "instant" : "smooth",
            block: "start",
          });
          window.history.pushState(null, "", "#saved");
        }
      }
    },
    [pathname]
  );

  return (
    <header className="mobile-app-header" aria-label="ترويسة الموقع للهواتف">
      <div className="mobile-header-inner">
        {/* Brand & Slogan */}
        <Link href="/" className="mobile-header-brand" aria-label="كارتوني — الرئيسية">
          <div className="mobile-header-logo-glow" aria-hidden="true" />
          <Image
            src="/branding/cartoony-logo.png"
            alt="كارتوني"
            width={40}
            height={40}
            className="mobile-header-logo-img"
            priority
          />
          <div className="mobile-header-text">
            <span className="mobile-header-title">
              كارتوني<span className="mobile-header-dot">.</span>
            </span>
            <span className="mobile-header-tagline">لكل حكاية عالم</span>
          </div>
        </Link>

        {/* Quick Search Pill & Watchlist Button (Hide search pill when already on /search) */}
        <div className="mobile-header-actions">
          {!pathname?.startsWith("/search") && (
            <Link
              href="/search"
              className="mobile-header-search-pill"
              aria-label="البحث الذكي في كارتوني"
            >
              <Icon name="search" size={16} />
              <span>ابحث...</span>
            </Link>
          )}

          <Link
            href="/#saved"
            onClick={handleSavedClick}
            className={`mobile-header-action-btn is-watchlist ${
              savedIds.length > 0 ? "has-items" : ""
            }`}
            aria-label={`قائمتي المفضلة (${savedIds.length})`}
          >
            <Icon name={savedIds.length > 0 ? "heartFilled" : "heart"} size={18} />
            {savedIds.length > 0 && (
              <span className="mobile-header-badge">{savedIds.length}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
