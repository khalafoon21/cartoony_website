"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";

export function MobileHeader() {
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

        {/* Quick Actions (Search & Movies) */}
        <div className="mobile-header-actions">
          <Link
            href="/search"
            className="mobile-header-action-btn"
            aria-label="البحث الذكي في كارتوني"
          >
            <Icon name="search" size={19} />
          </Link>
          <Link
            href="/movies"
            className="mobile-header-action-btn is-explore"
            aria-label="تصفح كافة الأفلام"
          >
            <Icon name="film" size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
