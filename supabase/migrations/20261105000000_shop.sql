-- Serag Lashes shop schema.
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
--
-- Security model: every table has Row Level Security ENABLED and NO policies,
-- so the public API (anon / authenticated keys) cannot read or write anything.
-- The website talks to the database only from the server, through the
-- POSTGRES_URL connection, after checking the signed-in user itself.

begin;

-- ───────────── Customers ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  preferred_lang text not null default 'ar' check (preferred_lang in ('ar', 'he', 'en')),
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  recipient text not null,
  phone text not null,
  city text not null,
  street text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

-- ───────────── Catalogue ─────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_he text not null,
  name_en text not null,
  description_ar text,
  description_he text,
  description_en text,
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  slug text not null unique,
  name_ar text not null,
  name_he text not null,
  name_en text not null,
  description_ar text,
  description_he text,
  description_en text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  -- fallback illustration when there is no photo
  art_style text not null default 'classic',
  art_map text not null default 'natural',
  art_tone text not null default 'petal',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);

-- ───────────── Store settings (single row) ─────────────
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  shipping_fee numeric(10, 2) not null default 30 check (shipping_fee >= 0),
  free_shipping_threshold numeric(10, 2) check (free_shipping_threshold >= 0), -- null = never free
  first_order_discount_pct numeric(5, 2) not null default 10 check (first_order_discount_pct between 0 and 100), -- 0 = off
  points_earn_pct numeric(5, 2) not null default 5 check (points_earn_pct between 0 and 100),
  point_value numeric(10, 2) not null default 1 check (point_value > 0), -- ₪ per point
  instagram text,
  updated_at timestamptz not null default now()
);

-- ───────────── Coupons ─────────────
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 32),
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(10, 2) not null check (value > 0),
  min_subtotal numeric(10, 2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int check (max_uses > 0),
  used_count int not null default 0,
  once_per_customer boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

-- ───────────── Orders ─────────────
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  user_id uuid not null references public.profiles (id),
  status text not null check (status in ('awaiting_payment', 'received', 'preparing', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('card', 'bit', 'apple_pay', 'cash')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  subtotal numeric(10, 2) not null,
  discount_kind text check (discount_kind in ('coupon', 'first_order')),
  discount_code text,
  discount_amount numeric(10, 2) not null default 0,
  points_used int not null default 0 check (points_used >= 0),
  points_value numeric(10, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null check (total >= 0),
  points_earned int not null default 0,
  points_awarded boolean not null default false,
  ship_name text not null,
  ship_phone text not null,
  ship_city text not null,
  ship_street text not null,
  ship_notes text,
  lang text not null default 'ar' check (lang in ('ar', 'he', 'en')),
  payplus_page_request_uid text,
  payplus_transaction_uid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null, -- snapshot in the order's language
  unit_price numeric(10, 2) not null,
  quantity int not null check (quantity between 1 and 50),
  line_total numeric(10, 2) not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

create table if not exists public.coupon_redemptions (
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coupon_id, order_id)
);

-- ───────────── Loyalty points (ledger; balance = sum of deltas) ─────────────
create table if not exists public.points_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('earned', 'redeemed', 'refund', 'adjust')),
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

-- ───────────── Lock down the public API ─────────────
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.points_ledger enable row level security;

-- ───────────── Starting data (edit everything later from /admin) ─────────────
insert into public.settings (id, shipping_fee, free_shipping_threshold, first_order_discount_pct, points_earn_pct, point_value)
values (1, 30, 300, 10, 5, 1)
on conflict (id) do nothing;

insert into public.categories (slug, name_ar, name_he, name_en, description_ar, description_he, description_en, sort) values
  ('daily', 'رموش يومية', 'ריסים יומיים', 'Daily lashes', 'خفيفة وطبيعية للاستعمال اليومي', 'קלים וטבעיים לשימוש יומיומי', 'Light, natural lashes for every day', 1),
  ('glam', 'رموش للمناسبات', 'ריסים לאירועים', 'Occasion lashes', 'كثافة وحضور للسهرات والتصوير', 'נפח ונוכחות לאירועים ולצילומים', 'Fuller looks for evenings and photo shoots', 2),
  ('care', 'أدوات وعناية', 'כלים וטיפוח', 'Tools & care', 'لاصق وفرش ومزيل وكل ما تحتاجينه', 'דבק, מברשות, מסיר וכל מה שצריך', 'Glue, brushes, remover and everything you need', 3)
on conflict (slug) do nothing;

insert into public.products (category_id, slug, name_ar, name_he, name_en, description_ar, description_he, description_en, price, art_style, art_map, art_tone, sort)
select c.id, p.slug, p.name_ar, p.name_he, p.name_en, p.d_ar, p.d_he, p.d_en, 200, p.style, p.map, p.tone, p.sort
from (values
  ('daily', 'daily-natural', 'يومي ناعم', 'יומי עדין', 'Daily Natural', 'خفيفة كأنها رموشكِ، للدوام والجامعة والمشاوير.', 'קלים כמו הריסים שלך, לעבודה, ללימודים ולסידורים.', 'Light as your own lashes, for work, class and errands.', 'classic', 'natural', 'petal', 1),
  ('daily', 'wispy', 'ويسبي', 'וויספי', 'Wispy', 'أطراف متفرّقة بلمسة عصرية ونظرة مرتفعة بنعومة.', 'קצוות מפוזרים במגע עכשווי ומבט מורם בעדינות.', 'Spaced tips with a modern touch and a softly lifted gaze.', 'wet', 'squirrel', 'rose', 2),
  ('daily', 'doll', 'عين الدمية', 'עין בובה', 'Doll Eye', 'تفتح العين وتمنحها استدارة بريئة ولافتة.', 'פותחים את העין ומעניקים לה עיגול תמים ובולט.', 'Opens the eye with an innocent, eye-catching roundness.', 'hybrid', 'doll', 'blush', 3),
  ('glam', 'cat', 'عين القطة', 'עין חתול', 'Cat Eye', 'تسحب النظرة نحو الأعلى، للإطلالات الأنيقة.', 'מושכים את המבט למעלה, ללוקים אלגנטיים.', 'Lifts the gaze upward, for elegant looks.', 'hybrid', 'cat', 'berry', 1),
  ('glam', 'soft-volume', 'فوليوم ناعم', 'ווליום רך', 'Soft Volume', 'كثافة مخملية للعزائم والمناسبات الهادئة.', 'צפיפות קטיפתית לארוחות ולאירועים שקטים.', 'Velvety density for dinners and quiet occasions.', 'volume', 'squirrel', 'rose', 2),
  ('glam', 'glam', 'سهرة', 'ערב', 'Glam Night', 'حضور كامل للسهرات وجلسات التصوير.', 'נוכחות מלאה למסיבות ולצילומים.', 'Full presence for parties and photo shoots.', 'mega', 'doll', 'petal', 3)
) as p(cat, slug, name_ar, name_he, name_en, d_ar, d_he, d_en, style, map, tone, sort)
join public.categories c on c.slug = p.cat
on conflict (slug) do nothing;

commit;
