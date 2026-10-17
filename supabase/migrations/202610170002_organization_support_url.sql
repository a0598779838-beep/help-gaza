alter table public.organizations
  add column support_url text
  check (support_url is null or support_url ~* '^https?://');
