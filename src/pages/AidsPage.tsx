import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AidCard } from '../components/AidCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { Seo } from '../components/Seo';
import { fetchAids, fetchCategories, fetchOrganizations } from '../services/aids';
import type { AidFilters } from '../types';

const pageSize = 9;

export function AidsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [debouncedSearch, params, setParams]);

  const filters: AidFilters = {
    search: debouncedSearch,
    category: params.get('category') ?? '',
    area: params.get('area') ?? '',
    status: params.get('status') ?? '',
    organization: params.get('organization') ?? '',
    sort: params.get('sort') === 'updated' ? 'updated' : 'newest',
    page: Math.max(1, Number(params.get('page') || 1)),
    pageSize,
  };
  const aids = useQuery({ queryKey: ['aids', filters], queryFn: () => fetchAids(filters), placeholderData: (previous) => previous });
  const categories = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations });

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setParams({});
  }

  return (
    <section className="section container page-section">
      <Seo title="جميع المساعدات" description="ابحث وصفّ إعلانات المساعدات حسب النوع والمنطقة والجهة والحالة." />
      <div className="page-intro"><span className="eyebrow">دليل المساعدات</span><h1>جميع المساعدات</h1><p>استخدم البحث والتصفية للعثور على الإعلان الذي تبحث عنه. نتائج الدليل لا تعني ضمان القبول.</p></div>
      <div className="filters-panel">
        <label className="search-field"><span>البحث</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عنوان المساعدة أو الجهة…" /></label>
        <label><span>التصنيف</span><select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">كل التصنيفات</option>{categories.data?.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span>المنطقة</span><select value={filters.area} onChange={(event) => updateFilter('area', event.target.value)}><option value="">كل المناطق</option>{['شمال غزة', 'غزة', 'دير البلح', 'خانيونس', 'رفح', 'قطاع غزة'].map((area) => <option key={area}>{area}</option>)}</select></label>
        <label><span>حالة التسجيل</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">كل الحالات</option><option value="open">التسجيل مفتوح</option><option value="closing_soon">ينتهي قريبًا</option><option value="closed">مغلق</option><option value="expired">انتهى الموعد المعلن</option></select></label>
        <label><span>الجهة</span><select value={filters.organization} onChange={(event) => updateFilter('organization', event.target.value)}><option value="">كل الجهات</option>{organizations.data?.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span>الترتيب</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">الأحدث نشرًا</option><option value="updated">آخر تحديث</option></select></label>
        <button className="button button-quiet clear-filter" onClick={clearFilters}>مسح عوامل التصفية</button>
      </div>
      {(categories.isError || organizations.isError) && <p className="form-result error-result" role="alert">تعذر تحميل بعض خيارات التصفية. أعد تحميل الصفحة أو تحقق من الاتصال.</p>}
      {aids.isPending ? <LoadingState /> : aids.isError ? <ErrorState message={aids.error.message} retry={() => void aids.refetch()} /> : (
        <>
          <div className="results-caption"><span>{aids.data.total} نتيجة</span>{aids.isFetching && <span>يتم تحديث النتائج…</span>}</div>
          {aids.data.items.length ? <div className="aid-grid">{aids.data.items.map((aid) => <AidCard aid={aid} key={aid.id} />)}</div> : <EmptyState />}
          {aids.data.total > pageSize && <nav className="pagination" aria-label="صفحات النتائج">
            <button className="button button-light" disabled={filters.page <= 1} onClick={() => updateFilter('page', String(filters.page - 1))}>السابق</button>
            <span>صفحة {filters.page} من {Math.ceil(aids.data.total / pageSize)}</span>
            <button className="button button-light" disabled={filters.page >= Math.ceil(aids.data.total / pageSize)} onClick={() => updateFilter('page', String(filters.page + 1))}>التالي</button>
          </nav>}
        </>
      )}
      <p className="subtle-note">المعلومات التجريبية موسومة بوضوح. عند الاتصال بقاعدة البيانات، تتم التصفية والصفحات من Supabase مباشرة.</p>
      <Link className="text-link back-link" to="/">العودة للرئيسية</Link>
    </section>
  );
}
