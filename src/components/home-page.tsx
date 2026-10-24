"use client";

import { useRef, useState } from "react";
import { categories, movies, type Category, type Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { CategoryArt, SceneArt } from "./illustrations";

function Hero({ movie, index, onSelect, onWatch }: { movie: Movie; index: number; onSelect: (index: number) => void; onWatch: () => void }) {
  const [saved, setSaved] = useState<string[]>([]);
  const isSaved = saved.includes(movie.id);

  return <section className="hero" aria-labelledby="hero-title" id="home">
    <div className="hero-art" key={movie.theme}><SceneArt theme={movie.theme} /></div>
    <header className="topbar"><a href="#home" className="site-name">كارتوني<span>لكل حكاية عالم.</span></a><span className="topbar-note"><span /> قليل من الخيال، كثير من المتعة</span></header>
    <div className="hero-content" key={movie.id}>
      <div className="feature-label"><span className="feature-line" /><Icon name="sparkles" size={17} /> حكاية تستحق أن تعيشها</div>
      <p className="hero-english" dir="ltr">{movie.englishTitle}</p>
      <h1 id="hero-title">{movie.title}</h1>
      <p className="hero-subtitle">{movie.subtitle}</p>
      <div className="movie-meta"><span>{movie.year}</span><span className="meta-dot" /><span>{movie.categoryLabel}</span><span className="meta-dot" /><span>{movie.duration}</span><span className="age-badge" dir="ltr">6+</span></div>
      <p className="hero-description">{movie.description}</p>
      <div className="hero-actions"><button className="primary-button" onClick={onWatch}><Icon name="play" size={21} /> اكتشف الحكاية</button><button className={`save-button ${isSaved ? "is-saved" : ""}`} aria-label={isSaved ? "إزالة الحكاية من قائمتي" : "إضافة الحكاية إلى قائمتي"} aria-pressed={isSaved} onClick={() => setSaved(isSaved ? saved.filter((id) => id !== movie.id) : [...saved, movie.id])}><Icon name={isSaved ? "check" : "plus"} /></button><span className="save-status" role="status">{isSaved ? "أُضيفت إلى قائمتك لهذه الجلسة" : ""}</span></div>
      <div className="hero-footnote"><span className="rating"><Icon name="star" size={15} /><b dir="ltr">{movie.rating}</b></span><span>خيال بلا حدود</span><span className="meta-dot" /><span>متعة لكل العائلة</span></div>
    </div>
    <div className="hero-pagination" aria-label="اختيار الحكاية المميزة"><span className="slide-count" dir="ltr"><b>0{index + 1}</b> / 0{movies.length}</span><div>{movies.map((item, i) => <button key={item.id} aria-label={`عرض ${item.title}`} aria-pressed={i === index} className={i === index ? "active" : ""} onClick={() => onSelect(i)} />)}</div><span className="pagination-line" /></div>
    <span className="original-art-note">رسومات وحكايات تجريبية</span>
  </section>;
}

function FranchiseRow({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <section className="franchises" id="franchises" aria-label="عوالم كارتوني"><div className="franchise-track">{movies.map((movie, index) => <button key={movie.id} className={`franchise franchise-${movie.theme} ${selected === index ? "selected" : ""}`} onClick={() => onSelect(index)} aria-pressed={selected === index}>
    <span className="franchise-star" aria-hidden="true">{["✦", "◌", "≋", "☀", "☁"][index]}</span><span className="franchise-title">{movie.franchise}</span><span className="franchise-english" dir="ltr">{movie.englishTitle}</span>
  </button>)}</div></section>;
}

function CategoryRow({ selected, onSelect }: { selected: Category; onSelect: (category: Category) => void }) {
  return <section className="categories-section content-section" id="categories" aria-labelledby="categories-title"><div className="section-heading"><div><span className="eyebrow">لكل مزاج حكاية</span><h2 id="categories-title">إلى أي عالم نذهب اليوم<span>؟</span></h2></div><span className="section-note">اختر عالمك، ودع الخيال يأخذك</span></div>
    <div className="category-grid">{categories.map((category) => <button key={category.id} className={`category category-${category.id} ${selected === category.id ? "selected" : ""}`} aria-pressed={selected === category.id} onClick={() => onSelect(selected === category.id ? "all" : category.id)}><span className="category-image"><CategoryArt symbol={category.symbol} /></span><span className="category-name">{category.label}</span><span className="category-caption">{category.caption}</span></button>)}</div>
  </section>;
}

function MovieCard({ movie, onSelect }: { movie: Movie; onSelect: () => void }) {
  return <button className="movie-card group" onClick={onSelect} aria-label={`عرض حكاية ${movie.title}`}><div className="poster"><SceneArt theme={movie.theme} compact /><span className="poster-category">{movie.categoryLabel}</span><span className="poster-play"><Icon name="play" size={23} /></span><span className="poster-title">{movie.title}<small>{movie.subtitle}</small></span></div><span className="card-details"><span>{movie.title}<small>{movie.year} <span>•</span> {movie.categoryLabel}</small></span><span className="card-rating"><Icon name="star" size={13} />{movie.rating}</span></span></button>;
}

export function HomePage() {
  const [selected, setSelected] = useState(0);
  const [category, setCategory] = useState<Category>("all");
  const previewRef = useRef<HTMLDialogElement>(null);
  const visibleMovies = category === "all" ? movies : movies.filter((movie) => movie.category === category);

  return <>
    <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
    <main id="main-content" className="site-main" tabIndex={-1}>
      <Hero movie={movies[selected]} index={selected} onSelect={setSelected} onWatch={() => previewRef.current?.showModal()} />
      <FranchiseRow selected={selected} onSelect={setSelected} />
      <CategoryRow selected={category} onSelect={setCategory} />
      <section className="stories-section content-section" id="stories" aria-labelledby="stories-title"><div className="section-heading"><div><span className="eyebrow">وقت الحكاية</span><h2 id="stories-title">حكايتك القادمة تبدأ هنا<span>.</span></h2></div><button className="text-button" onClick={() => setCategory("all")}>كل الحكايات <Icon name="arrow" size={18} /></button></div><div className="movie-grid" aria-live="polite">{visibleMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onSelect={() => { setSelected(movies.indexOf(movie)); document.getElementById("home")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }} />)}</div></section>
      <footer className="site-footer"><span>كارتوني<span className="footer-dot">.</span> <small>لكل حكاية عالم</small></span><p>صُنع بشغف للخيال <Icon name="heart" size={13} /> <span>واجهة تجريبية · المرحلة الأولى</span></p><a href="#home">إلى الأعلى ↑</a></footer>
    </main>
    <dialog ref={previewRef} className="preview-dialog" aria-labelledby="preview-title" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}><button className="icon-button dialog-close" onClick={() => previewRef.current?.close()} aria-label="إغلاق"><Icon name="close" /></button><span className="preview-symbol"><Icon name="film" size={32} /></span><span className="eyebrow">من عالم كارتوني</span><h2 id="preview-title">{movies[selected].title}</h2><p>{movies[selected].description}</p><div className="preview-notice"><Icon name="sparkles" size={18} /><span>هذه حكاية تجريبية لعرض التصميم. المشاهدة غير متاحة في المرحلة الأولى.</span></div><button className="primary-button" onClick={() => previewRef.current?.close()}>العودة إلى الحكايات <Icon name="arrow" size={18} /></button></dialog>
  </>;
}
