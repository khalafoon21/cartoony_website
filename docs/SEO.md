# SEO — cartoony.site

## المراجعة بتاريخ 3 نوفمبر 2026

تمت قراءة HTML وملفات الفهرسة العامة من الموقع المنشور دون تسجيل دخول أو تعديل بياناته.

| العنصر | النتيجة قبل التعديل | التعديل في المشروع |
| --- | --- | --- |
| عنوان الموقع | `https://cartoony.site/` يعيد التوجيه 308 إلى `https://www.cartoony.site/`، لكن canonical وsitemap يستخدمان العنوان الأول | توحيد metadata وSchema وsitemap وrobots على `https://www.cartoony.site` |
| عناوين القوائم | مثال: `أفلام كرتون \| كارتوني \| كارتوني` | عنوان مميز لكل صفحة وإضافة اسم الموقع مرة واحدة |
| بيانات المشاركة | بعض الصفحات ترث عنوان ووصف الرئيسية على Twitter | بيانات Open Graph وTwitter خاصة بكل صفحة ورابطها وصورتها |
| صورة الموقع | الأبعاد المعلنة 1200×630، والملف الفعلي 940×600 | تصحيح الأبعاد المعلنة؛ لم يتغير ملف الشعار |
| البحث الداخلي | صفحة `/search` بدون استعلام قابلة للفهرسة وموجودة في sitemap | `noindex, follow` لكل نتائج البحث، واستبعادها من sitemap |
| قائمة الأفلام | `/category/movies` يكرر `/movies` | تحويل دائم إلى `/movies` واستبعاد الرابط المكرر من sitemap |
| التصنيفات الفارغة | موجودة ضمن sitemap | استبعادها، مع `noindex` إلى أن تحتوي أعمالاً منشورة |
| بيانات الأعمال المنظمة | تاريخ إصدار مفترض في 1 يناير وتقييم إجمالي بدون عدد تقييمات | حذف البيانات غير الموثقة وإضافة Movie/TVSeries/BreadcrumbList من بيانات الصفحة |
| الحلقات | لا توجد في sitemap ولا تملك بيانات TVEpisode منظمة | إدراج الحلقات القابلة للمشاهدة في sitemap وإضافة بيانات الحلقة ومسارها |
| الفيديو | لا توجد بيانات VideoObject | إضافتها فقط عند توفر مصدر فيديو وصورة ووصف وتاريخ نشر فعلي؛ لا يتم افتراض تاريخ |
| الصفحات غير الموجودة | 404 وnoindex صحيحان، لكن canonical يشير إلى الرئيسية | إزالة canonical العام من layout وإسناده للصفحات المعروفة فقط |

## تفاصيل التنفيذ

- توليد sitemap ديناميكياً من الأعمال المنشورة، مع روابط التفاصيل والأفلام والحلقات القابلة للمشاهدة، دون روابط التحويل أو البحث أو التصنيفات الفارغة.
- استخدام `updated_at` الفعلي عند توفره في `lastmod`، دون تعيين وقت كل زيارة كتاريخ تحديث.
- إبقاء صفحات تفاصيل الأعمال وصفحات المشاهدة ذات الفيديو مستقلة، لكل منها canonical خاص بها؛ عدم فهرسة شاشة مشاهدة لا تحتوي مصدراً للفيديو.
- ربط شارات التصنيفات في صفحات التفاصيل بصفحاتها لتحسين التنقل واكتشاف الروابط.
- إضافة وصف بديل لملصقات الأعمال، وتصحيح بيانات صورة المشاركة.
- إبقاء نسخ Vercel Preview خارج الفهرسة، بما فيها الصفحات التي تعرّف robots الخاصة بها.
- إعادة استخدام قراءة الكتالوج داخل طلب العرض الواحد فقط، لتفادي تكرارها بين metadata ومحتوى التصنيف؛ لا توجد ذاكرة تخزين مشتركة بين الزوار.
- إخراج JSON-LD مع هروب محرف `<` لحماية وسم script من النصوص المدخلة في المحتوى.

## بعد نشر هذا التعديل

هذه التعديلات في ملفات المشروع؛ لا تعني أن النسخة المنشورة أو فهرس جوجل تغيرا بالفعل.

1. انشر النسخة الجديدة عبر مسار النشر المعتاد للمشروع على Vercel.
2. راجع `https://www.cartoony.site/robots.txt` و`https://www.cartoony.site/sitemap.xml`. يجب أن تشير روابطهما إلى `www`، وألا تحتوي sitemap صفحة البحث أو `/category/movies`.
3. تحقق من عنوان وقيمة canonical لصفحة فيلم وصفحة مسلسل وحلقة منشورة. صفحة `/category/movies` يجب أن تنتهي عند `/movies`.
4. افحص صفحات التفاصيل والفيديو بأداة [Rich Results Test](https://search.google.com/test/rich-results). بيانات Schema تصف الصفحة، ولا تضمن ظهور شكل خاص في النتائج.

## إضافة Google Search Console

الموقع غير مضاف إلى Search Console بحسب صاحب المشروع وقت المراجعة. لم يتم الوصول إلى حساب جوجل أو إعدادات DNS.

1. افتح [Google Search Console](https://search.google.com/search-console/welcome).
2. اختر **Domain** وأدخل `cartoony.site` دون بروتوكول أو `www`.
3. انسخ سجل TXT الذي يعرضه جوجل، وأضفه عند مزود DNS للدومين، ثم اضغط **Verify**. احتفظ بالسجل بعد التوثيق.
4. من **Sitemaps** أرسل `https://www.cartoony.site/sitemap.xml` بعد نشر التعديلات.
5. استخدم **URL Inspection** للرئيسية وصفحات الأفلام والمسلسلات والحلقات الأساسية، ثم اطلب الفهرسة للروابط المهمة.
6. تابع تقارير **Page indexing** و**Performance** و**Video indexing**. لا يمكن استنتاج حالة الفهرسة الكاملة من بحث `site:` وحده.

### بديل بدون تعديل DNS

يمكن اختيار **URL prefix** وإضافة `https://www.cartoony.site/`، ثم اختيار تحقق **HTML tag**. ضع قيمة `content` وحدها في متغير Vercel التالي، وأعد النشر ثم أكمل Verify:

```text
GOOGLE_SITE_VERIFICATION=<قيمة-content-الصادرة-من-جوجل>
```

المشروع جاهز لإخراج الوسم عند توفير المتغير. لا ترسل كلمة مرور حساب جوجل أو رموز تسجيل الدخول.

## مصادر مرجعية

- [Google: الروابط الأساسية والتحويلات وsitemap](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: العناوين في نتائج البحث](https://developers.google.com/search/docs/appearance/title-link)
- [Google: منع الفهرسة باستخدام noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google: بيانات تقييمات المراجعات](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [Google: بيانات الفيديو المنظمة](https://developers.google.com/search/docs/appearance/structured-data/video)
- [Google: اسم الموقع](https://developers.google.com/search/docs/appearance/site-names)
