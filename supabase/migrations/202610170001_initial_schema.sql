create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.aid_status as enum (
  'pending_review', 'open', 'closing_soon', 'closed', 'expired', 'suspicious', 'rejected'
);
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.report_status as enum ('new', 'reviewing', 'resolved', 'rejected');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  official_website text check (official_website is null or official_website ~* '^https?://'),
  official_contact_url text check (official_contact_url is null or official_contact_url ~* '^https?://'),
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('editor', 'admin')),
  created_at timestamptz not null default now()
);

create table public.aid_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 5 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (length(trim(description)) >= 10),
  organization_id uuid references public.organizations(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  eligibility text,
  required_documents text,
  target_areas text[] not null default '{}',
  registration_url text check (registration_url is null or registration_url ~* '^https?://'),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  source_published_at timestamptz,
  registration_start_at timestamptz,
  registration_end_at timestamptz,
  status public.aid_status not null default 'pending_review',
  verification_status public.verification_status not null default 'pending',
  last_verified_at timestamptz,
  verification_notes text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint aid_dates_valid check (
    registration_start_at is null or registration_end_at is null or registration_end_at >= registration_start_at
  )
);

create table public.aid_sources (
  id uuid primary key default gen_random_uuid(),
  aid_post_id uuid not null references public.aid_posts(id) on delete cascade,
  source_url text not null check (source_url ~* '^https?://'),
  source_type text not null check (source_type in ('official_announcement', 'official_website', 'official_social', 'other')),
  checked_at timestamptz not null default now(),
  check_result text not null check (check_result in ('accessible', 'unavailable', 'changed', 'unverified')),
  notes text,
  checked_by uuid references auth.users(id) on delete set null
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  aid_post_id uuid references public.aid_posts(id) on delete set null,
  report_type text not null check (length(trim(report_type)) between 2 and 80),
  reported_url text check (reported_url is null or reported_url ~* '^https?://'),
  description text not null check (length(trim(description)) between 10 and 2000),
  contact_email text check (contact_email is null or length(contact_email) <= 254),
  status public.report_status not null default 'new',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes_summary text not null,
  created_at timestamptz not null default now()
);

create table public.report_rate_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null,
  submissions integer not null default 1 check (submissions > 0)
);

create index aid_posts_public_created_idx on public.aid_posts (published_at desc) where is_published = true;
create index aid_posts_public_updated_idx on public.aid_posts (updated_at desc) where is_published = true;
create index aid_posts_category_idx on public.aid_posts (category_id);
create index aid_posts_organization_idx on public.aid_posts (organization_id);
create index aid_posts_status_idx on public.aid_posts (status);
create index aid_posts_areas_idx on public.aid_posts using gin (target_areas);
create index aid_posts_search_idx on public.aid_posts using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);
create index aid_posts_title_trgm_idx on public.aid_posts using gin (title gin_trgm_ops);
create index aid_posts_description_trgm_idx on public.aid_posts using gin (description gin_trgm_ops);
create index organizations_name_trgm_idx on public.organizations using gin (name gin_trgm_ops);
create index reports_status_created_idx on public.reports (status, created_at desc);
create index audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index report_rate_limits_window_idx on public.report_rate_limits (window_started_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger aid_posts_set_updated_at before update on public.aid_posts
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.write_admin_audit()
returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  target_id uuid;
  action_name text;
  summary text;
begin
  if tg_op = 'DELETE' then
    target_id := old.id;
    action_name := 'delete';
    summary := 'Record deleted';
  elsif tg_op = 'INSERT' then
    target_id := new.id;
    action_name := 'create';
    summary := 'Record created';
  else
    target_id := new.id;
    action_name := 'update';
    summary := 'Record updated';
    if tg_table_name = 'aid_posts' then
      summary := 'status=' || new.status::text || ', published=' || new.is_published::text;
    elsif tg_table_name = 'reports' then
      summary := 'report status=' || new.status::text;
    end if;
  end if;
  insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, changes_summary)
  values ((select auth.uid()), action_name, tg_table_name, target_id, summary);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger aid_posts_audit after insert or update or delete on public.aid_posts
for each row execute function public.write_admin_audit();
create trigger organizations_audit after insert or update or delete on public.organizations
for each row execute function public.write_admin_audit();
create trigger categories_audit after insert or update or delete on public.categories
for each row execute function public.write_admin_audit();
create trigger reports_audit after update on public.reports
for each row execute function public.write_admin_audit();

create or replace function public.search_public_aids(
  search_text text default null,
  category_slug text default null,
  target_area text default null,
  aid_status text default null,
  organization_slug text default null,
  sort_by text default 'newest',
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  id uuid, title text, slug text, description text, organization_id uuid, category_id uuid,
  eligibility text, required_documents text, target_areas text[], registration_url text,
  source_url text, source_published_at timestamptz, registration_start_at timestamptz,
  registration_end_at timestamptz, status public.aid_status,
  verification_status public.verification_status, last_verified_at timestamptz,
  is_published boolean, created_at timestamptz, updated_at timestamptz, published_at timestamptz,
  organization jsonb, category jsonb, total_count bigint
)
language sql stable security invoker
set search_path = '' as $$
  with filtered as (
  select ap.id, ap.title, ap.slug, ap.description, ap.organization_id, ap.category_id,
    ap.eligibility, ap.required_documents, ap.target_areas, ap.registration_url, ap.source_url,
    ap.source_published_at, ap.registration_start_at, ap.registration_end_at, ap.status,
    ap.verification_status, ap.last_verified_at, ap.is_published, ap.created_at,
    ap.updated_at, ap.published_at, o.name as org_name, o.slug as org_slug, o.description as org_description,
      o.official_website, o.official_contact_url, o.verification_status as org_verification_status,
      o.verified_at as org_verified_at, c.name as category_name, c.slug as category_slug_value,
      c.description as category_description
    from public.aid_posts ap
    left join public.organizations o on o.id = ap.organization_id
    left join public.categories c on c.id = ap.category_id
    where ap.is_published and ap.verification_status = 'verified'
      and ap.status not in ('pending_review', 'suspicious', 'rejected')
      and (search_text is null or ap.title ilike '%' || search_text || '%'
        or ap.description ilike '%' || search_text || '%'
        or coalesce(o.name, '') ilike '%' || search_text || '%')
      and (category_slug is null or c.slug = category_slug)
      and (target_area is null or target_area = any(ap.target_areas))
      and (aid_status is null or case
        when ap.status in ('open', 'closing_soon') and ap.registration_end_at < now() then 'expired'
        when ap.status in ('open', 'closing_soon') and ap.registration_end_at <= now() + interval '3 days' then 'closing_soon'
        else ap.status::text end = aid_status)
      and (organization_slug is null or o.slug = organization_slug)
  ), counted as (
    select filtered.*, count(*) over() as result_count from filtered
  )
  select counted.id, counted.title, counted.slug, counted.description, counted.organization_id,
    counted.category_id, counted.eligibility, counted.required_documents, counted.target_areas,
    counted.registration_url, counted.source_url, counted.source_published_at,
    counted.registration_start_at, counted.registration_end_at, counted.status,
    counted.verification_status, counted.last_verified_at, counted.is_published,
    counted.created_at, counted.updated_at, counted.published_at,
    case when counted.organization_id is null then null else jsonb_build_object(
      'id', counted.organization_id, 'name', counted.org_name, 'slug', counted.org_slug,
      'description', counted.org_description, 'official_website', counted.official_website,
      'official_contact_url', counted.official_contact_url,
      'verification_status', counted.org_verification_status, 'verified_at', counted.org_verified_at
    ) end,
    case when counted.category_id is null then null else jsonb_build_object(
      'id', counted.category_id, 'name', counted.category_name, 'slug', counted.category_slug_value,
      'description', counted.category_description
    ) end,
    counted.result_count
  from counted
  order by
    case when sort_by = 'updated' then counted.updated_at end desc nulls last,
    case when sort_by <> 'updated' then counted.published_at end desc nulls last
  limit greatest(1, least(page_size, 50))
  offset greatest(0, page_offset);
$$;

revoke all on function public.search_public_aids(text,text,text,text,text,text,integer,integer) from public;
grant execute on function public.search_public_aids(text,text,text,text,text,text,integer,integer) to anon, authenticated;

create or replace function public.take_report_rate_limit(fingerprint_value text)
returns boolean language plpgsql security definer
set search_path = '' as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if fingerprint_value !~ '^[a-f0-9]{64}$' then return false; end if;
  if mod(extract(epoch from now())::bigint, 60) = 0 then
    delete from public.report_rate_limits where window_started_at < now() - interval '1 day';
  end if;
  insert into public.report_rate_limits(fingerprint, window_started_at, submissions)
  values (fingerprint_value, now(), 1)
  on conflict (fingerprint) do update
    set window_started_at = case
      when public.report_rate_limits.window_started_at < now() - interval '1 hour' then now()
      else public.report_rate_limits.window_started_at end,
    submissions = case
      when public.report_rate_limits.window_started_at < now() - interval '1 hour' then 1
      else public.report_rate_limits.submissions + 1 end
  returning window_started_at, submissions into current_window, current_count;
  return current_count <= 3;
end;
$$;
revoke all on function public.take_report_rate_limit(text) from public, anon, authenticated;
grant execute on function public.take_report_rate_limit(text) to service_role;

alter table public.organizations enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.aid_posts enable row level security;
alter table public.aid_sources enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.report_rate_limits enable row level security;

revoke all on public.organizations, public.categories, public.aid_posts, public.aid_sources,
  public.profiles, public.reports, public.admin_audit_logs, public.report_rate_limits
from public, anon, authenticated;

grant select on public.organizations, public.categories to anon, authenticated;
grant select (
  id, title, slug, description, organization_id, category_id, eligibility, required_documents,
  target_areas, registration_url, source_url, source_published_at, registration_start_at,
  registration_end_at, status, verification_status, last_verified_at, is_published,
  created_at, updated_at, published_at
) on public.aid_posts to anon, authenticated;
grant select on public.aid_sources to authenticated;
grant insert, update, delete on public.organizations, public.categories, public.aid_posts, public.aid_sources to authenticated;
grant select, update on public.reports to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.admin_audit_logs to authenticated;
revoke all on public.reports, public.report_rate_limits from anon;
revoke all on public.report_rate_limits from authenticated;
grant all on public.reports, public.report_rate_limits to service_role;

create policy "Public reads verified organizations" on public.organizations
for select to anon, authenticated using (verification_status = 'verified' and not is_archived or public.is_admin());
create policy "Admins manage organizations" on public.organizations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public reads active categories" on public.categories
for select to anon, authenticated using (is_active or public.is_admin());
create policy "Admins manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Users read own profile, admins read all" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "Admins update profiles" on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public reads published verified aids" on public.aid_posts
for select to anon, authenticated using (
  (is_published and verification_status = 'verified' and status not in ('pending_review', 'suspicious', 'rejected'))
  or public.is_admin()
);
create policy "Admins manage aids" on public.aid_posts
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage aid sources" on public.aid_sources
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read reports" on public.reports
for select to authenticated using (public.is_admin());
create policy "Admins update reports" on public.reports
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read audit logs" on public.admin_audit_logs
for select to authenticated using (public.is_admin());
create policy "No direct access to report rate limits" on public.report_rate_limits
for all to anon, authenticated using (false) with check (false);

insert into public.categories(name, slug) values
  ('المساعدات الغذائية', 'food'),
  ('المساعدات النقدية', 'cash'),
  ('المساعدات الصحية والعلاجية', 'health'),
  ('مساعدات الإيواء والخيام', 'shelter'),
  ('المساعدات التعليمية والمنح', 'education'),
  ('مساعدات الأيتام والأطفال', 'children'),
  ('مساعدات ذوي الإعاقة', 'disability'),
  ('مساعدات النساء والأسر', 'families'),
  ('المساعدات الشتوية', 'winter'),
  ('مساعدات عامة', 'general')
on conflict (slug) do nothing;

insert into public.organizations (
  name, slug, description, official_website, verification_status, verified_at
) values (
  'برنامج الأغذية العالمي (WFP)',
  'wfp-palestine',
  'صفحة البرنامج الرسمية بشأن فلسطين. راجع المصدر للاطلاع على معلوماته وتحديثاته.',
  'https://www.wfp.org/countries/palestine',
  'verified',
  now()
)
on conflict (slug) do nothing;
