-- Serag Lashes store, part 2: run AFTER 20261105000000_shop.sql (Supabase → SQL Editor → paste → Run).
-- Safe to run more than once. Same security model: RLS on, no policies; the site uses POSTGRES_URL from the server.

begin;

-- ───────────── Customers: membership by phone, independent of sign-in ─────────────
-- A customer row is created on the first order (guest checkout) or on sign-up; signing in
-- later with the same phone links the login (auth_user_id) to that row.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles alter column email drop not null;
alter table public.profiles add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null;
alter table public.profiles add column if not exists phone_norm text; -- +9725XXXXXXXX
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists marketing_consent boolean not null default false;
alter table public.profiles add column if not exists marketing_consent_at timestamptz;
alter table public.profiles add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table public.profiles add column if not exists source text;
alter table public.profiles add column if not exists birthday_coupon_year int;
update public.profiles p set auth_user_id = p.id where p.auth_user_id is null and exists (select 1 from auth.users u where u.id = p.id);
create unique index if not exists profiles_phone_norm_key on public.profiles (phone_norm) where phone_norm is not null;
create unique index if not exists profiles_email_key on public.profiles (lower(email)) where email is not null and email <> '';

-- ───────────── Products: photos, options, stock, sale price ─────────────
alter table public.products add column if not exists kind text not null default 'standard';
alter table public.products add column if not exists stock int; -- null = not tracked
alter table public.products add column if not exists low_stock_threshold int not null default 3;
alter table public.products add column if not exists sell_when_out boolean not null default false;
alter table public.products add column if not exists sale_price numeric(10, 2);
alter table public.products add column if not exists sale_starts_at timestamptz;
alter table public.products add column if not exists sale_ends_at timestamptz;
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists options_label_ar text;
alter table public.products add column if not exists options_label_he text;
alter table public.products add column if not exists options_label_en text;
do $$ begin
  alter table public.products add constraint products_kind_check check (kind in ('standard', 'gift_card'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_sale_price_check check (sale_price is null or (sale_price >= 0 and sale_price < price));
exception when duplicate_object then null; end $$;

alter table public.categories add column if not exists image_url text;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort);

-- Options (e.g. length or curl). Each option has its own stock; price null = product price.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name_ar text not null,
  name_he text not null default '',
  name_en text not null default '',
  price numeric(10, 2) check (price is null or price >= 0),
  stock int,
  active boolean not null default true,
  sort int not null default 0
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, sort);

-- "Add the lash tweezers at a special price": shown with (and only priced specially next to) the main product.
create table if not exists public.product_addons (
  product_id uuid not null references public.products (id) on delete cascade,
  addon_id uuid not null references public.products (id) on delete cascade,
  special_price numeric(10, 2) not null check (special_price >= 0),
  sort int not null default 0,
  primary key (product_id, addon_id),
  check (product_id <> addon_id)
);

-- ───────────── Automatic offers (sale on products/groups, timed, quantity) ─────────────
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text not null default '',
  name_en text not null default '',
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(10, 2) not null check (value > 0),
  scope text not null default 'all' check (scope in ('all', 'products', 'categories')),
  product_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  min_qty int not null default 1 check (min_qty >= 1),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

-- ───────────── Coupons: scope, sale items, personal codes, source ─────────────
alter table public.coupons add column if not exists name text;
alter table public.coupons add column if not exists scope text not null default 'all';
alter table public.coupons add column if not exists product_ids uuid[] not null default '{}';
alter table public.coupons add column if not exists category_ids uuid[] not null default '{}';
alter table public.coupons add column if not exists exclude_sale boolean not null default false;
alter table public.coupons add column if not exists customer_ids uuid[] not null default '{}'; -- empty = anyone
alter table public.coupons add column if not exists purpose text not null default 'general';
alter table public.coupons add column if not exists source text; -- instagram, tiktok, campaign or influencer name
do $$ begin
  alter table public.coupons add constraint coupons_scope_check check (scope in ('all', 'products', 'categories'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.coupons add constraint coupons_purpose_check check (purpose in ('general', 'birthday', 'abandoned_cart', 'personal'));
exception when duplicate_object then null; end $$;
alter table public.coupon_redemptions add column if not exists discount_amount numeric(10, 2) not null default 0;

-- ───────────── Shipping ─────────────
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text not null default '',
  name_en text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  free_threshold numeric(10, 2) check (free_threshold >= 0), -- null = the general threshold in settings
  is_pickup boolean not null default false,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tracking_url text, -- use {number} where the tracking number goes
  active boolean not null default true
);

-- ───────────── Orders: new status, zone, tracking, notes, source, gift cards ─────────────
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'received', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'));
alter table public.orders drop constraint if exists orders_discount_kind_check;
alter table public.orders add constraint orders_discount_kind_check check (discount_kind in ('coupon', 'first_order'));
alter table public.orders add column if not exists zone_id uuid references public.shipping_zones (id) on delete set null;
alter table public.orders add column if not exists zone_name text;
alter table public.orders add column if not exists carrier_id uuid references public.carriers (id) on delete set null;
alter table public.orders add column if not exists carrier_name text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists customer_note text;
alter table public.orders add column if not exists source text;
alter table public.orders add column if not exists campaign text;
alter table public.orders add column if not exists sale_savings numeric(10, 2) not null default 0;
alter table public.orders add column if not exists gift_card_amount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists invoice_number text;
alter table public.orders add column if not exists invoice_url text;
alter table public.orders add column if not exists needs_shipping boolean not null default true;
alter table public.orders alter column ship_street drop not null;
alter table public.orders alter column ship_city drop not null;
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

alter table public.order_items add column if not exists variant_id uuid references public.product_variants (id) on delete set null;
alter table public.order_items add column if not exists variant_name text;
alter table public.order_items add column if not exists list_price numeric(10, 2);
alter table public.order_items add column if not exists is_gift_card boolean not null default false;

alter table public.order_events add column if not exists actor text;

-- ───────────── Gift cards ─────────────
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  paid_amount numeric(10, 2) not null check (paid_amount >= 0),
  initial_value numeric(10, 2) not null check (initial_value > 0),
  balance numeric(10, 2) not null check (balance >= 0),
  expires_at timestamptz,
  purchaser_id uuid references public.profiles (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.gift_card_transactions (
  id bigserial primary key,
  gift_card_id uuid not null references public.gift_cards (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(10, 2) not null, -- negative = spent, positive = returned
  created_at timestamptz not null default now()
);
create index if not exists gift_card_tx_card_idx on public.gift_card_transactions (gift_card_id, created_at);

-- ───────────── Points: expiry per earned batch (FIFO) ─────────────
alter table public.points_ledger add column if not exists expires_at timestamptz;
alter table public.points_ledger add column if not exists remaining int;
alter table public.points_ledger drop constraint if exists points_ledger_reason_check;
alter table public.points_ledger add constraint points_ledger_reason_check check (reason in ('earned', 'redeemed', 'refund', 'adjust', 'expired'));
update public.points_ledger set remaining = delta where delta > 0 and remaining is null;
-- Older redemptions were never matched to batches; settle them oldest-first once.
do $$
declare u record; owed int; b record; take int;
begin
  for u in select user_id, -sum(delta) filter (where delta < 0) as spent from public.points_ledger group by user_id loop
    owed := coalesce(u.spent, 0) - coalesce((select sum(delta - remaining) from public.points_ledger where user_id = u.user_id and delta > 0), 0);
    for b in select id, remaining from public.points_ledger where user_id = u.user_id and delta > 0 and remaining > 0 order by created_at loop
      exit when owed <= 0;
      take := least(owed, b.remaining);
      update public.points_ledger set remaining = remaining - take where id = b.id;
      owed := owed - take;
    end loop;
  end loop;
end $$;

-- ───────────── Favorites, stock alerts, reviews ─────────────
create table if not exists public.favorites (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  phone_norm text not null,
  customer_id uuid references public.profiles (id) on delete set null,
  lang text not null default 'ar',
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create unique index if not exists stock_alerts_waiting_key
  on public.stock_alerts (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), phone_norm) where notified_at is null;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  unique (product_id, order_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id, status, created_at desc);

-- ───────────── Messages (SMS) ─────────────
create table if not exists public.message_templates (
  key text not null,
  lang text not null check (lang in ('ar', 'he', 'en')),
  body text not null,
  enabled boolean not null default true,
  primary key (key, lang)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles (id) on delete set null,
  phone_norm text not null,
  kind text not null check (kind in ('transactional', 'marketing')),
  template text,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_ref text,
  error text,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- ───────────── Abandoned carts ─────────────
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid unique references public.profiles (id) on delete cascade,
  items jsonb not null default '[]',
  lang text not null default 'ar',
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  coupon_code text,
  recovered_order_id uuid references public.orders (id) on delete set null
);

-- ───────────── Staff, permissions, audit ─────────────
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone_norm text,
  permissions text[] not null default '{}', -- orders, products, customers, marketing, reports, settings, staff
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (email is not null or phone_norm is not null)
);
create unique index if not exists staff_email_key on public.staff (lower(email)) where email is not null;
create unique index if not exists staff_phone_key on public.staff (phone_norm) where phone_norm is not null;

create table if not exists public.audit_log (
  id bigserial primary key,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);

-- ───────────── Settings ─────────────
alter table public.settings add column if not exists points_expiry_months int check (points_expiry_months is null or points_expiry_months > 0);
alter table public.settings add column if not exists gift_card_bonus_pct numeric(5, 2) not null default 10 check (gift_card_bonus_pct between 0 and 100);
alter table public.settings add column if not exists gift_card_valid_months int default 12 check (gift_card_valid_months is null or gift_card_valid_months > 0);
alter table public.settings add column if not exists birthday_enabled boolean not null default true;
alter table public.settings add column if not exists birthday_kind text not null default 'percent' check (birthday_kind in ('percent', 'fixed'));
alter table public.settings add column if not exists birthday_value numeric(10, 2) not null default 15 check (birthday_value > 0);
alter table public.settings add column if not exists birthday_valid_days int not null default 14 check (birthday_valid_days > 0);
alter table public.settings add column if not exists abandoned_cart_enabled boolean not null default true;
alter table public.settings add column if not exists abandoned_cart_hours int not null default 3 check (abandoned_cart_hours > 0);
alter table public.settings add column if not exists unpaid_cancel_hours int not null default 24 check (unpaid_cancel_hours > 0);
alter table public.settings add column if not exists announcement_ar text;
alter table public.settings add column if not exists announcement_he text;
alter table public.settings add column if not exists announcement_en text;
alter table public.settings add column if not exists tiktok text;
alter table public.settings add column if not exists whatsapp text;
alter table public.settings add column if not exists owner_phone text; -- low-stock alerts by SMS
-- PayPlus Invoice+ document for cash orders: inv_tax_receipt (עוסק מורשה) or inv_receipt (עוסק פטור).
alter table public.settings add column if not exists invoice_doc_type text not null default 'inv_tax_receipt' check (invoice_doc_type in ('inv_tax_receipt', 'inv_receipt'));

-- ───────────── Lock down the new tables ─────────────
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_addons enable row level security;
alter table public.offers enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.carriers enable row level security;
alter table public.gift_cards enable row level security;
alter table public.gift_card_transactions enable row level security;
alter table public.favorites enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.reviews enable row level security;
alter table public.message_templates enable row level security;
alter table public.messages enable row level security;
alter table public.carts enable row level security;
alter table public.staff enable row level security;
alter table public.audit_log enable row level security;

-- ───────────── Starting data ─────────────
insert into public.shipping_zones (name_ar, name_he, name_en, price, is_pickup, sort)
select * from (values
  ('الشمال', 'צפון', 'North', 30::numeric, false, 1),
  ('حيفا والكريوت', 'חיפה והקריות', 'Haifa & Krayot', 30, false, 2),
  ('المركز', 'מרכז', 'Center', 30, false, 3),
  ('القدس', 'ירושלים', 'Jerusalem', 35, false, 4),
  ('الجنوب', 'דרום', 'South', 35, false, 5),
  ('استلام ذاتي', 'איסוף עצמי', 'Self pickup', 0, true, 6)
) as z(name_ar, name_he, name_en, price, is_pickup, sort)
where not exists (select 1 from public.shipping_zones);

insert into public.products (category_id, slug, kind, name_ar, name_he, name_en, description_ar, description_he, description_en, price, art_style, art_map, art_tone, sort, active)
select null, 'gift-card', 'gift_card', 'بطاقة هدية', 'כרטיס מתנה', 'Gift card',
  'كود إلكتروني يصل على الهاتف، مع زيادة على القيمة المدفوعة. يُستعمل في أي طلب.',
  'קוד דיגיטלי שמגיע לטלפון, עם תוספת על הסכום ששולם. למימוש בכל הזמנה.',
  'A digital code sent by text, worth more than you pay. Use it on any order.',
  200, 'classic', 'natural', 'berry', 99, false
where not exists (select 1 from public.products where slug = 'gift-card');
insert into public.product_variants (product_id, name_ar, name_he, name_en, price, sort)
select p.id, v.name, v.name, v.name, v.price, v.sort
from public.products p, (values ('200 ₪', 200::numeric, 1), ('300 ₪', 300, 2), ('400 ₪', 400, 3)) as v(name, price, sort)
where p.slug = 'gift-card' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id);

insert into public.message_templates (key, lang, body) values
  ('login_code', 'ar', 'رمز الدخول إلى Serag Lashes: {code}'),
  ('login_code', 'he', 'קוד הכניסה ל-Serag Lashes: {code}'),
  ('login_code', 'en', 'Your Serag Lashes code: {code}'),
  ('order_received', 'ar', 'شكرًا {name}! استلمنا طلبكِ رقم #{number} بقيمة {total}. تفاصيل الطلب: {link}'),
  ('order_received', 'he', 'תודה {name}! קיבלנו את הזמנה #{number} בסך {total}. פרטים: {link}'),
  ('order_received', 'en', 'Thank you {name}! We received order #{number} ({total}). Details: {link}'),
  ('order_preparing', 'ar', 'طلبكِ #{number} قيد التجهيز الآن.'),
  ('order_preparing', 'he', 'הזמנה #{number} בהכנה.'),
  ('order_preparing', 'en', 'Order #{number} is being prepared.'),
  ('order_shipped', 'ar', 'تم شحن طلبكِ #{number}. {tracking}'),
  ('order_shipped', 'he', 'הזמנה #{number} נשלחה. {tracking}'),
  ('order_shipped', 'en', 'Order #{number} has shipped. {tracking}'),
  ('order_out_for_delivery', 'ar', 'طلبكِ #{number} في الطريق إليكِ اليوم.'),
  ('order_out_for_delivery', 'he', 'הזמנה #{number} בדרך אלייך היום.'),
  ('order_out_for_delivery', 'en', 'Order #{number} is out for delivery today.'),
  ('order_delivered', 'ar', 'تم تسليم طلبكِ #{number}. نتمنى أن يعجبكِ! قيّمي مشترياتكِ: {link}'),
  ('order_delivered', 'he', 'הזמנה #{number} נמסרה. נשמח לדירוג שלך: {link}'),
  ('order_delivered', 'en', 'Order #{number} was delivered. Rate your items: {link}'),
  ('points_earned', 'ar', 'أُضيفت {points} نقطة إلى حسابكِ. رصيدكِ الآن {balance}.'),
  ('points_earned', 'he', 'נוספו {points} נקודות לחשבונך. היתרה: {balance}.'),
  ('points_earned', 'en', '{points} points added. Your balance: {balance}.'),
  ('gift_card', 'ar', 'بطاقة هدية من Serag Lashes بقيمة {value}. الكود: {code} (صالحة حتى {expires}). تُستعمل عند الدفع في {site}'),
  ('gift_card', 'he', 'כרטיס מתנה מ-Serag Lashes בשווי {value}. קוד: {code} (בתוקף עד {expires}). למימוש בתשלום ב-{site}'),
  ('gift_card', 'en', 'Serag Lashes gift card worth {value}. Code: {code} (valid until {expires}). Use it at checkout on {site}'),
  ('birthday', 'ar', 'عيد ميلاد سعيد {name}! هديتكِ خصم {discount} بالكود {code} حتى {expires}. {site}'),
  ('birthday', 'he', 'יום הולדת שמח {name}! מתנה: {discount} הנחה עם הקוד {code} עד {expires}. {site}'),
  ('birthday', 'en', 'Happy birthday {name}! Enjoy {discount} off with code {code} until {expires}. {site}'),
  ('back_in_stock', 'ar', '{product} عاد للمخزون! {link}'),
  ('back_in_stock', 'he', '{product} חזר למלאי! {link}'),
  ('back_in_stock', 'en', '{product} is back in stock! {link}'),
  ('favorite_sale', 'ar', '{product} من مفضلتكِ عليه خصم الآن: {price}. {link}'),
  ('favorite_sale', 'he', '{product} מהמועדפים שלך במבצע: {price}. {link}'),
  ('favorite_sale', 'en', '{product} from your favorites is on sale: {price}. {link}'),
  ('abandoned_cart', 'ar', 'نسيتِ شيئًا في السلة؟ أكملي طلبكِ: {link} {coupon}'),
  ('abandoned_cart', 'he', 'שכחת משהו בעגלה? להשלמת ההזמנה: {link} {coupon}'),
  ('abandoned_cart', 'en', 'You left something in your cart. Finish your order: {link} {coupon}')
on conflict (key, lang) do nothing;

commit;
