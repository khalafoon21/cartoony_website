const test = require("node:test");
const assert = require("node:assert/strict");

function normalizeArabicText(text) {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .toLowerCase()
    .trim();
}

test("Smart Search Specifications", async (t) => {
  await t.test("Arabic normalization handles diacritics and letter variants", () => {
    assert.equal(normalizeArabicText("أَبْطَالُ"), "ابطال");
    assert.equal(normalizeArabicText("إبطال"), "ابطال");
    assert.equal(normalizeArabicText("آبطال"), "ابطال");
    assert.equal(normalizeArabicText("سَفِينَةٌ"), "سفينه");
    assert.equal(normalizeArabicText("مغامرة"), "مغامره");
    assert.equal(normalizeArabicText("مغامره"), "مغامره");
    assert.equal(normalizeArabicText("موسى"), "موسي");
    assert.equal(normalizeArabicText("كـــارتوني"), "كارتوني");
    assert.equal(normalizeArabicText("Gravity Falls"), "gravity falls");
  });

  await t.test("Matches Arabic and English titles with partial and case-insensitive search", () => {
    const sampleItems = [
      {
        id: "1",
        title: "حكاية لعبة",
        englishTitle: "Toy Story",
        franchise: "Toy Story",
        description: "مغامرة الدمى المتحركة في غرفة أندي",
        format: "movie",
        category: "family",
        year: 1995,
        rating: "8.3",
      },
      {
        id: "2",
        title: "غرافيتي فولز",
        englishTitle: "Gravity Falls",
        franchise: "Gravity Falls",
        description: "ألغاز غامضة في بلدة خيالية مع ديبر وميبل",
        format: "series",
        category: "adventure",
        year: 2012,
        rating: "8.9",
      },
      {
        id: "3",
        title: "الأسد الملك",
        englishTitle: "The Lion King",
        franchise: "The Lion King",
        description: "قصة سيمبا ورحلته لاستعادة عرش أرض العزة",
        format: "movie",
        category: "adventure",
        year: 1994,
        rating: "8.5",
      },
    ];

    function search(items, query) {
      const cleanQ = normalizeArabicText(query);
      const tokens = cleanQ.split(/\s+/).filter(Boolean);
      return items.filter((item) => {
        const text = normalizeArabicText(
          `${item.title} ${item.englishTitle} ${item.franchise} ${item.description}`
        );
        return tokens.every((token) => text.includes(token));
      });
    }

    // Arabic search
    assert.equal(search(sampleItems, "اسد").length, 1);
    assert.equal(search(sampleItems, "الاسد")[0].id, "3");
    assert.equal(search(sampleItems, "لعبه")[0].id, "1");
    assert.equal(search(sampleItems, "ميبل")[0].id, "2");

    // English search
    assert.equal(search(sampleItems, "gravity")[0].id, "2");
    assert.equal(search(sampleItems, "GRAVITY FALLS")[0].id, "2");
    assert.equal(search(sampleItems, "toy story")[0].id, "1");
  });

  await t.test("Combinable filters and sorting logic", () => {
    const catalog = [
      { id: "1", format: "movie", category: "adventure", year: 2024, rating: "8.2", title: "ب" },
      { id: "2", format: "series", category: "adventure", year: 2021, rating: "8.9", title: "أ" },
      { id: "3", format: "movie", category: "comedy", year: 2018, rating: "7.5", title: "ج" },
    ];

    // Filter format: movies only
    const moviesOnly = catalog.filter((item) => item.format === "movie");
    assert.equal(moviesOnly.length, 2);

    // Filter format: movie + category: adventure
    const movieAdv = catalog.filter(
      (item) => item.format === "movie" && item.category === "adventure"
    );
    assert.equal(movieAdv.length, 1);
    assert.equal(movieAdv[0].id, "1");

    // Filter minRating: 8.0+
    const highRated = catalog.filter((item) => Number(item.rating) >= 8.0);
    assert.equal(highRated.length, 2);

    // Sort by rating desc
    const sortedByRating = [...catalog].sort(
      (a, b) => Number(b.rating) - Number(a.rating)
    );
    assert.equal(sortedByRating[0].id, "2");

    // Sort alphabetical
    const sortedAlpha = [...catalog].sort((a, b) =>
      a.title.localeCompare(b.title, "ar")
    );
    assert.equal(sortedAlpha[0].id, "2"); // 'أ' first
  });

  await t.test("Pagination calculation", () => {
    const total = 35;
    const pageSize = 10;
    const totalPages = Math.ceil(total / pageSize);
    assert.equal(totalPages, 4);

    const page2Items = Array.from({ length: total }, (_, i) => i + 1).slice(
      (2 - 1) * pageSize,
      2 * pageSize
    );
    assert.equal(page2Items.length, 10);
    assert.equal(page2Items[0], 11);
    assert.equal(page2Items[9], 20);
  });
});
