alter table public.organizations
  add column registration_url text
  check (registration_url is null or registration_url ~* '^https?://');
