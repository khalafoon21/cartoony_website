"use client";

import Link from "next/link";
import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { categories, type CategoryItem } from "@/lib/movies";
import { CategoryArt } from "./illustrations";

export type CategoryStripProps = {
  items?: CategoryItem[];
  activeSlug?: string;
};

export function CategoryStrip({ items = categories, activeSlug }: CategoryStripProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>("a.category");
    if (!links || links.length === 0) return;

    const currentIndex = Array.from(links).indexOf(document.activeElement as HTMLAnchorElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? 1 : -1;
    const nextIndex = (currentIndex + delta + links.length) % links.length;
    links[nextIndex]?.focus();
  }, []);

  return (
    <section
      className="categories-section content-section"
      id="categories"
      aria-labelledby="categories-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">لكل مزاج حكاية</span>
          <h2 id="categories-title">
            إلى أي عالم نذهب اليوم<span>؟</span>
          </h2>
        </div>
        <span className="section-note">اختر عالمك، ودع الخيال يأخذك</span>
      </div>

      <nav aria-label="تصنيفات كارتوني">
        <ul
          ref={listRef}
          role="list"
          className="category-grid"
          onKeyDown={handleKeyDown}
        >
          {items.map((category, index) => {
            const isSelected = activeSlug === category.slug;
            return (
              <li key={category.id} className="category-item">
                <Link
                  href={`/category/${category.slug}`}
                  style={
                    {
                      "--cat-i": index,
                      "--category-light": category.lightColor,
                      "--category-dark": category.darkColor,
                    } as CSSProperties
                  }
                  className={`category category-${category.id} ${isSelected ? "selected" : ""}`}
                  aria-label={`تصنيف ${category.label} — ${category.caption}`}
                  aria-current={isSelected ? "page" : undefined}
                >
                  <span className="category-image">
                    <CategoryArt symbol={category.symbol} />
                  </span>
                  <span className="category-name">{category.label}</span>
                  <span className="category-caption">{category.caption}</span>
                  <span className="category-indicator" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
