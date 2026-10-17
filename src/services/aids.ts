import { demoAids, demoCategories, demoOrganizations } from '../data/demo';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Aid, AidFilters, AidPage, Category, Organization } from '../types';

export async function fetchAids(filters: AidFilters): Promise<AidPage> {
  if (!supabase) return filterDemoAids(filters);
  const from = (filters.page - 1) * filters.pageSize;
  const { data, error } = await supabase.rpc('search_public_aids', {
    search_text: filters.search.trim() || null,
    category_slug: filters.category || null,
    target_area: filters.area || null,
    aid_status: filters.status || null,
    organization_slug: filters.organization || null,
    sort_by: filters.sort,
    page_size: filters.pageSize,
    page_offset: from,
  });
  if (error) throw new Error('تعذر تحميل المساعدات. تحقق من الاتصال أو إعداد قاعدة البيانات.');
  const rows = (data ?? []) as Array<Aid & { total_count: number }>;
  return { items: rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function fetchAid(slug: string): Promise<Aid | null> {
  if (!supabase) return demoAids.find((aid) => aid.slug === slug && aid.is_published) ?? null;
  const { data, error } = await supabase
    .from('aid_posts')
    .select('id,title,slug,description,organization_id,category_id,eligibility,required_documents,target_areas,registration_url,source_url,source_published_at,registration_start_at,registration_end_at,status,verification_status,last_verified_at,is_published,created_at,updated_at,published_at,organization:organizations(*),category:categories(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (error) throw new Error('تعذر تحميل تفاصيل المساعدة.');
  return data as Aid | null;
}

export async function fetchCategories(): Promise<Category[]> {
  if (!supabase) return demoCategories;
  const { data, error } = await supabase.from('categories').select('id,name,slug,description,is_active').eq('is_active', true).order('name');
  if (error) throw new Error('تعذر تحميل التصنيفات.');
  return data as Category[];
}

export async function fetchOrganizations(): Promise<Organization[]> {
  if (!supabase) return sortOrganizations(demoOrganizations);
  const { data, error } = await supabase.from('organizations').select('*').order('name');
  if (error) throw new Error('تعذر تحميل الجهات.');
  return sortOrganizations(data as Organization[]);
}

function sortOrganizations(organizations: Organization[]): Organization[] {
  return [...organizations].sort((left, right) => {
    if (left.slug === 'gaza-gas-registration') return -1;
    if (right.slug === 'gaza-gas-registration') return 1;
    return left.name.localeCompare(right.name, 'ar');
  });
}

function filterDemoAids(filters: AidFilters): AidPage {
  const query = filters.search.trim().toLocaleLowerCase();
  let results = demoAids.filter((aid) => aid.is_published);
  if (query) results = results.filter((aid) => `${aid.title} ${aid.description} ${aid.organization?.name ?? ''}`.toLocaleLowerCase().includes(query));
  if (filters.category) results = results.filter((aid) => aid.category?.slug === filters.category);
  if (filters.area) results = results.filter((aid) => aid.target_areas.includes(filters.area));
  if (filters.status) results = results.filter((aid) => aid.status === filters.status);
  if (filters.organization) results = results.filter((aid) => aid.organization?.slug === filters.organization);
  if (filters.sort === 'updated') results.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  else results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    items: results.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
    total: results.length,
  };
}

export const isDemoMode = !isSupabaseConfigured;
