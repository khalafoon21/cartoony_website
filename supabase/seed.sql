-- =============================================================================
-- Cartoony — Phase 8: Optional Fictional Seed Data
-- Run after 202610240001_cartoony_schema.sql
-- =============================================================================

begin;

-- 1. Categories
insert into public.categories (slug, title_ar, title_original, description_ar, icon_symbol, light_color, dark_color, display_order, status)
values
  ('movies', 'أفلام', 'Movies', 'سهرات سينمائية ممتعة', 'clapper', '#8A6D53', '#3D3138', 1, 'published'),
  ('action', 'أكشن', 'Action', 'حماس وإثارة بلا توقف', 'bolt', '#945B4F', '#472D35', 2, 'published'),
  ('adventure', 'مغامرات', 'Adventure', 'إلى عوالم جديدة', 'compass', '#676249', '#2C3D3B', 3, 'published'),
  ('comedy', 'كوميديا', 'Comedy', 'ضحكة من القلب', 'popcorn', '#975950', '#4C3440', 4, 'published'),
  ('family', 'عائلي', 'Family', 'لحظات تجمعنا', 'home', '#93696B', '#4F394B', 5, 'published'),
  ('fantasy', 'خيال', 'Fantasy', 'كل شيء ممكن', 'magic', '#64537E', '#35344D', 6, 'published'),
  ('anime', 'أنمي', 'Anime', 'روائع الرسوم اليابانية', 'anime', '#5E718A', '#2E3A4E', 7, 'published')
on conflict (slug) do update set
  title_ar = excluded.title_ar,
  title_original = excluded.title_original,
  description_ar = excluded.description_ar,
  icon_symbol = excluded.icon_symbol,
  light_color = excluded.light_color,
  dark_color = excluded.dark_color,
  display_order = excluded.display_order,
  status = excluded.status;

-- 2. Fictional Movies (8 Titles)
insert into public.movies (
  slug, title_ar, subtitle_ar, title_original, franchise_ar, description_ar,
  release_year, duration_minutes, duration_label_ar, rating, audio_badge, theme,
  accent_color, is_featured, is_most_watched, is_recently_added, status, published_at
)
values
  ('moon-forest', 'حُرّاس الغابة', 'سرّ القمر الأزرق', 'FOREST GUARDIANS', 'حُرّاس الغابة', 'حين يخفت ضوء القمر، ينطلق ليث وصديقته نُورا في رحلة إلى قلب الغابة المنسية.', 2026, 92, '١ ساعة و٣٢ دقيقة', 8.7, 'dubbed', 'forest', '#F5A623', true, true, true, 'published', now()),
  ('little-orbit', 'كوكب صغير', 'مغامرة خارج المدار', 'LITTLE ORBIT', 'كوكب صغير', 'رسالة صغيرة من نجم بعيد تقلب يوم رائد الفضاء سليم رأسًا على عقب.', 2026, 84, '١ ساعة و٢٤ دقيقة', 8.5, 'dubbed', 'space', '#A99CD5', true, true, false, 'published', now()),
  ('ocean-tales', 'حكايات المرجان', 'وراء الموجة الأخيرة', 'CORAL TALES', 'حكايات المرجان', 'تحت أمواج البحر تختبئ مدينة لا يعرفها أحد تتبعها لؤلؤة عبر خريطة قديمة.', 2025, 88, '١ ساعة و٢٨ دقيقة', 8.3, 'dubbed', 'ocean', '#75C9C0', true, true, false, 'published', now()),
  ('cloud-house', 'بيت فوق السحاب', 'حيث تبدأ الأحلام', 'ABOVE THE CLOUDS', 'بيت السحاب', 'من نافذة بيتها العائم، تحلم غيمة برؤية العالم في حكاية دافئة عن العائلة.', 2026, 86, '١ ساعة و٢٦ دقيقة', 8.6, 'dubbed', 'sky', '#E6B5C2', true, false, true, 'published', now()),
  ('starlight-express', 'قطار النجوم', 'رحلة عبر المجرات', 'STARLIGHT EXPRESS', 'قطار النجوم', 'قطار ليلي يظهر مرة كل عام ليحمل المسافرين الصغار عبر سُحب الكواكب البعيدة.', 2026, 95, '١ ساعة و٣٥ دقيقة', 8.8, 'subtitled', 'space', '#9BA8E5', false, true, true, 'published', now()),
  ('sakura-wind', 'أجنحة الساكورا', 'مدرسة الرياح', 'SAKURA WINGS', 'أجنحة الساكورا', 'طالبة طيران شابة تتدرب مع طائر أسطوري للتحليق فوق الجزر المعلقة.', 2026, 100, '١ ساعة و٤٠ دقيقة', 8.9, 'subtitled', 'sky', '#E899B5', false, true, true, 'published', now()),
  ('robo-bakery', 'مخبز الآليين', 'وصفة السعادة', 'ROBO BAKERY', 'مخبز الآليين', 'آلي صغير يعشق إعداد الفطائر يقرر افتتاح مخبز في مدينة المستقبل.', 2026, 76, '١ ساعة و١٦ دقيقة', 8.0, 'dubbed', 'desert', '#F2B872', false, false, true, 'published', now()),
  ('deep-blue-band', 'فرقة الأعماق', 'سمفونية اللؤلؤ', 'DEEP BLUE BAND', 'فرقة الأعماق', 'مجموعة من الكائنات البحرية الظريفة تؤسس فرقة موسيقية لإحياء مهرجان الشعاب.', 2024, 80, '١ ساعة و٢٠ دقيقة', 8.1, 'dubbed', 'ocean', '#72C4B9', false, false, false, 'published', now())
on conflict (slug) do nothing;

-- 3. Fictional Series (6 Titles)
insert into public.series (
  slug, title_ar, subtitle_ar, title_original, franchise_ar, description_ar,
  release_year, rating, audio_badge, theme, accent_color,
  is_featured, is_most_watched, is_recently_added, status, published_at
)
values
  ('sunny-days', 'شِلّة مشمش', 'يوم خارج التوقعات', 'SUNNY SIDE UP', 'شِلّة مشمش', 'مشمش وأصدقاؤه لديهم خطة مثالية للعطلة ومغامرات مضحكة لا تُنسى.', 2025, 8.1, 'dubbed', 'desert', '#E9AA7A', true, true, false, 'published', now()),
  ('desert-knights', 'فرسان الواحة', 'أسطورة الرمال الذهبية', 'OASIS KNIGHTS', 'فرسان الواحة', 'ثلاثة أصدقاء يحمون واحة قديمة من العواصف الرملية الغامضة.', 2025, 8.4, 'dubbed', 'desert', '#F0AD64', false, true, false, 'published', now()),
  ('whispering-lantern', 'فانوس الحكايات', 'أسرار الوادي الأخضر', 'WHISPERING LANTERN', 'فانوس الحكايات', 'كلما أضاء الفانوس الصغير في المساء، تتحول الرسومات القديمة إلى مغامرات.', 2026, 8.6, 'dubbed', 'forest', '#7CC49E', false, false, true, 'published', now()),
  ('captain-sabir', 'القبطان صابر', 'جزيرة الصدى', 'CAPTAIN SABIR', 'القبطان صابر', 'سفينة خشبية تطير وتغوص تقود طاقمها المضحك إلى جزيرة الألحان.', 2024, 8.2, 'dubbed', 'ocean', '#6BC2C8', false, false, false, 'published', now()),
  ('emerald-valley', 'وادي الزمرد', 'حكاية الفصول الأربعة', 'EMERALD VALLEY', 'وادي الزمرد', 'في وادٍ تتجاور فيه الفصول الأربعة، يتعاون حراس الطبيعة الصغار.', 2025, 8.5, 'subtitled', 'forest', '#88C98A', false, false, true, 'published', now()),
  ('sky-racers', 'سابقو الغيوم', 'كأس الأفق الكبير', 'SKY RACERS', 'سابقو الغيوم', 'سباق وديّ بين طائرات ورقية عملاقة فوق قمم الجبال السحابية.', 2025, 8.4, 'subtitled', 'sky', '#98B8E8', false, true, false, 'published', now())
on conflict (slug) do nothing;

-- 4. Seasons & Sample Episodes for `sunny-days`
insert into public.seasons (series_id, season_number, slug, title_ar, title_original, release_year, status, published_at)
select id, 1, 'sunny-days-s1', 'الموسم الأول: عطلة الصيف', 'Season 1', 2025, 'published', now()
from public.series where slug = 'sunny-days'
on conflict (slug) do nothing;

insert into public.episodes (series_id, season_id, episode_number, slug, title_ar, title_original, description_ar, duration_minutes, audio_badge, status, published_at)
select
  s.id,
  sn.id,
  ep.num,
  'sunny-days-s1-e' || ep.num,
  ep.title_ar,
  ep.title_en,
  ep.desc_ar,
  22,
  'dubbed',
  'published',
  now()
from public.series s
join public.seasons sn on sn.series_id = s.id and sn.season_number = 1
cross join (
  values
    (1, 'الخريطة المقلوبة', 'The Upside-Down Map', 'يبدأ مشمش الرحلة بخريطة مقلوبة تقودهم إلى التل الخطأ.'),
    (2, 'سباق الدراجات العجيبة', 'Wacky Bike Race', 'منافسة ودية في ساحة القرية تنتهي بمفاجأة غير متوقعة.'),
    (3, 'سرّ الشجرة المغنية', 'The Singing Tree', 'صوت غريب في الحديقة يجمع الأصدقاء في مهمة استكشافية.')
) as ep(num, title_ar, title_en, desc_ar)
where s.slug = 'sunny-days'
on conflict (slug) do nothing;

-- 5. Content-Category Relationships
insert into public.movie_categories (movie_id, category_id, is_primary)
select m.id, c.id, true
from public.movies m
join public.categories c on (
  (m.slug = 'moon-forest' and c.slug = 'adventure') or
  (m.slug = 'little-orbit' and c.slug = 'action') or
  (m.slug = 'ocean-tales' and c.slug = 'fantasy') or
  (m.slug = 'cloud-house' and c.slug = 'family') or
  (m.slug = 'starlight-express' and c.slug = 'fantasy') or
  (m.slug = 'sakura-wind' and c.slug = 'anime') or
  (m.slug = 'robo-bakery' and c.slug = 'comedy') or
  (m.slug = 'deep-blue-band' and c.slug = 'family')
)
on conflict do nothing;

insert into public.series_categories (series_id, category_id, is_primary)
select s.id, c.id, true
from public.series s
join public.categories c on (
  (s.slug = 'sunny-days' and c.slug = 'comedy') or
  (s.slug = 'desert-knights' and c.slug = 'action') or
  (s.slug = 'whispering-lantern' and c.slug = 'family') or
  (s.slug = 'captain-sabir' and c.slug = 'adventure') or
  (s.slug = 'emerald-valley' and c.slug = 'fantasy') or
  (s.slug = 'sky-racers' and c.slug = 'anime')
)
on conflict do nothing;

commit;
