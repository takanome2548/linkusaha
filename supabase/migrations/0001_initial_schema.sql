-- LinkUsaha initial schema. Apply to a NEW Supabase project only.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'user' check (role in ('super_admin','admin','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60 and slug not in ('login','register','dashboard','api','auth','pricing','about','contact','faq','reset-password','forgot-password','sitemap.xml','robots.txt')),
  category text not null default 'Lainnya',
  description text not null default '',
  logo_path text,
  cover_path text,
  whatsapp_number text not null check (whatsapp_number ~ '^(62|0|8)[0-9]{8,14}$'),
  address text not null default '',
  google_maps_url text,
  opening_hours jsonb not null default '{}'::jsonb,
  instagram_url text,
  facebook_url text,
  additional_contact text,
  publication_status text not null default 'draft' check (publication_status in ('draft','published','unpublished')),
  template text not null default 'default' check (template = 'default'),
  theme text not null default 'ocean-blue' check (theme in ('ocean-blue','fresh-green','warm-orange','soft-purple','rose')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  cart_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price numeric(14,0) not null check (price >= 0 and price <= 1000000000000),
  image_path text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_public_slug_idx on public.businesses(slug) where publication_status = 'published';
create index if not exists products_business_sort_idx on public.products(business_id, sort_order, created_at);
create index if not exists products_public_active_idx on public.products(business_id, is_active, is_available);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses for each row execute procedure public.set_updated_at();
drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at before update on public.business_settings for each row execute procedure public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), 'user')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Prevent users from escalating their own platform role, including via direct API calls.
create or replace function public.prevent_profile_role_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(auth.jwt() ->> 'role','') <> 'service_role' and current_user not in ('postgres','supabase_admin') then
    raise exception 'Platform role cannot be changed by the account owner';
  end if;
  return new;
end; $$;
drop trigger if exists prevent_profile_role_escalation_trigger on public.profiles;
create trigger prevent_profile_role_escalation_trigger before update on public.profiles
for each row execute procedure public.prevent_profile_role_escalation();

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('super_admin','admin'));
$$;

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b where b.id = target_business_id and b.owner_id = (select auth.uid()));
$$;

create or replace function public.is_published_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b where b.id = target_business_id and b.publication_status = 'published');
$$;

create or replace function public.create_business_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.business_settings (business_id, cart_enabled) values (new.id, false) on conflict (business_id) do nothing;
  return new;
end; $$;
drop trigger if exists create_business_settings_trigger on public.businesses;
create trigger create_business_settings_trigger after insert on public.businesses
for each row execute procedure public.create_business_settings();


-- Public-safe projection: never expose internal owner_id through the anonymous storefront API.
create or replace view public.business_storefronts as
select id, name, slug, category, description, logo_path, cover_path, whatsapp_number,
       address, google_maps_url, opening_hours, instagram_url, facebook_url,
       additional_contact, publication_status, template, theme, updated_at
from public.businesses
where publication_status = 'published';
revoke all on public.business_storefronts from public;
grant select on public.business_storefronts to anon, authenticated;
grant select on public.business_settings to anon, authenticated;
grant select on public.products to anon, authenticated;
revoke select on public.businesses from anon;
grant select on public.businesses to authenticated;

-- RLS is enabled on every application table.
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_settings enable row level security;
alter table public.products enable row level security;

-- Profiles: users read/update their own profile. Role escalation is additionally blocked by trigger.
drop policy if exists "profile_select_own_or_admin" on public.profiles;
create policy "profile_select_own_or_admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Business owners and platform admins can manage records. Public visitors see published businesses only.
drop policy if exists "business_select_owner_admin_or_published" on public.businesses;
create policy "business_select_owner_admin_or_published" on public.businesses for select
using (owner_id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists "business_insert_owner" on public.businesses;
create policy "business_insert_owner" on public.businesses for insert to authenticated
with check (owner_id = (select auth.uid()) and not public.is_platform_admin());
drop policy if exists "business_update_owner_admin" on public.businesses;
create policy "business_update_owner_admin" on public.businesses for update to authenticated
using (owner_id = (select auth.uid()) or public.is_platform_admin())
with check (owner_id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists "business_delete_owner_admin" on public.businesses;
create policy "business_delete_owner_admin" on public.businesses for delete to authenticated
using (owner_id = (select auth.uid()) or public.is_platform_admin());

-- Settings are private to the owner/admin; storefront reads only cart flag for published businesses.
drop policy if exists "settings_select_owner_admin_or_published" on public.business_settings;
create policy "settings_select_owner_admin_or_published" on public.business_settings for select
using (public.is_platform_admin() or public.is_business_owner(business_id) or public.is_published_business(business_id));
drop policy if exists "settings_insert_owner_admin" on public.business_settings;
create policy "settings_insert_owner_admin" on public.business_settings for insert to authenticated
with check (public.is_platform_admin() or public.is_business_owner(business_id));
drop policy if exists "settings_update_owner_admin" on public.business_settings;
create policy "settings_update_owner_admin" on public.business_settings for update to authenticated
using (public.is_platform_admin() or public.is_business_owner(business_id))
with check (public.is_platform_admin() or public.is_business_owner(business_id));

-- Product owners/admins manage all fields. Public visitors see active products of published businesses.
drop policy if exists "products_select_owner_admin_or_public" on public.products;
create policy "products_select_owner_admin_or_public" on public.products for select
using (
  public.is_platform_admin()
  or public.is_business_owner(business_id)
  or (is_active = true and public.is_published_business(business_id))
);
drop policy if exists "products_insert_owner_admin" on public.products;
create policy "products_insert_owner_admin" on public.products for insert to authenticated
with check (public.is_platform_admin() or public.is_business_owner(business_id));
drop policy if exists "products_update_owner_admin" on public.products;
create policy "products_update_owner_admin" on public.products for update to authenticated
using (public.is_platform_admin() or public.is_business_owner(business_id))
with check (public.is_platform_admin() or public.is_business_owner(business_id));
drop policy if exists "products_delete_owner_admin" on public.products;
create policy "products_delete_owner_admin" on public.products for delete to authenticated
using (public.is_platform_admin() or public.is_business_owner(business_id));

-- Public storage bucket for storefront media. Write access is restricted to the owning business folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-assets','business-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "public_read_business_assets" on storage.objects;
create policy "public_read_business_assets" on storage.objects for select to public
using (bucket_id = 'business-assets');
drop policy if exists "owner_upload_business_assets" on storage.objects;
create policy "owner_upload_business_assets" on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-assets' and (
    public.is_platform_admin() or public.is_business_owner((storage.foldername(name))[1]::uuid)
  )
);
drop policy if exists "owner_update_business_assets" on storage.objects;
create policy "owner_update_business_assets" on storage.objects for update to authenticated
using (
  bucket_id = 'business-assets' and (
    public.is_platform_admin() or public.is_business_owner((storage.foldername(name))[1]::uuid)
  )
)
with check (
  bucket_id = 'business-assets' and (
    public.is_platform_admin() or public.is_business_owner((storage.foldername(name))[1]::uuid)
  )
);
drop policy if exists "owner_delete_business_assets" on storage.objects;
create policy "owner_delete_business_assets" on storage.objects for delete to authenticated
using (
  bucket_id = 'business-assets' and (
    public.is_platform_admin() or public.is_business_owner((storage.foldername(name))[1]::uuid)
  )
);
