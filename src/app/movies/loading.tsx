export default function MoviesLoading() {
  return (
    <main id="main-content" className="site-main" tabIndex={-1} aria-busy="true">
      <section
        className="content-section"
        style={{ paddingTop: "48px", paddingBottom: "24px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">جاري التحميل...</span>
            <h1>
              أفلام كرتون
              <span style={{ color: "var(--orange)" }}>.</span>
            </h1>
            <p className="section-note" style={{ marginTop: "6px" }}>
              يتم الآن تحميل الأفلام المنشورة من قاعدة البيانات...
            </p>
          </div>
        </div>
      </section>

      <section className="stories-section content-section">
        <div className="public-state-box is-loading" role="status">
          <p>جاري تجهيز مكتبة الأفلام...</p>
        </div>
      </section>
    </main>
  );
}
