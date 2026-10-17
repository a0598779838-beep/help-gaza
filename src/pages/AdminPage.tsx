import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LockKeyhole, LogOut, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Seo } from '../components/Seo';
import { ErrorState, LoadingState } from '../components/States';
import { supabase } from '../lib/supabase';
import { isSafeHttpUrl } from '../lib/url';
import { aidSchema } from '../schemas';
import type { Aid } from '../types';

type AidForm = z.infer<typeof aidSchema>;
type ActiveTab = 'aids' | 'organizations' | 'categories' | 'reports' | 'logs';
type AidAdminRow = Pick<Aid, 'id' | 'title' | 'slug' | 'description' | 'status' | 'is_published' | 'source_url' | 'registration_url'>;
type OrganizationAdminRow = { id: string; name: string; slug: string; verification_status: string; official_website: string | null; official_contact_url: string | null; is_archived: boolean };
type CategoryAdminRow = { id: string; name: string; slug: string; is_active: boolean };
type ReportAdminRow = { id: string; report_type: string; reported_url: string | null; description: string; status: string; created_at: string };
type AuditAdminRow = { id: string; action: string; entity_type: string; changes_summary: string; created_at: string };

function useAdminSession() {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let alive = true;
    async function check(userId: string | undefined) {
      if (!userId) {
        if (alive) { setSession(null); setIsAdmin(false); setChecking(false); }
        return;
      }
      const { data, error: profileError } = await supabase!.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (!alive) return;
      setIsAdmin(data?.role === 'admin');
      setError(profileError ? 'تعذر التحقق من صلاحية الحساب.' : '');
      setChecking(false);
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError('تعذر التحقق من جلسة الدخول.');
      if (alive) setSession(data.session);
      void check(data.session?.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(true);
      void check(nextSession?.user.id);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  return { session, isAdmin, checking, error };
}

export function AdminPage() {
  const auth = useAdminSession();
  const [tab, setTab] = useState<ActiveTab>('aids');
  const [message, setMessage] = useState('');
  const [loginError, setLoginError] = useState('');
  if (!supabase) return <section className="section container page-section"><Seo title="لوحة الإدارة" description="منطقة خاصة بالمشرفين." noindex /><div className="notice-box">لوحة الإدارة جاهزة، لكن يلزم إنشاء مشروع Supabase وضبط متغيرات البيئة أولًا. راجع تعليمات الإعداد في README.</div></section>;
  if (auth.checking) return <section className="section container page-section"><LoadingState /></section>;
  if (!auth.session) return <AdminLogin loginError={loginError || auth.error} onError={setLoginError} />;
  if (auth.error) return <section className="section container page-section"><ErrorState message={auth.error} /></section>;
  if (!auth.isAdmin) return <section className="section container page-section"><Seo title="لوحة الإدارة" description="منطقة خاصة بالمشرفين." noindex /><div className="notice-box warning-box"><LockKeyhole /> هذا الحساب ليس مخولًا لإدارة المحتوى. تواصل مع مسؤول المنصة.</div><button className="button button-light" onClick={() => void supabase?.auth.signOut()}>تسجيل الخروج</button></section>;
  return <AdminDashboard tab={tab} setTab={setTab} message={message} setMessage={setMessage} />;
}

function AdminLogin({ loginError, onError }: { loginError: string; onError: (message: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    onError('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) onError('تعذر تسجيل الدخول. تحقق من البيانات أو حالة حساب المشرف.');
  }
  return <section className="section container page-section admin-login">
    <Seo title="دخول المشرفين" description="تسجيل دخول المشرفين المصرح لهم." noindex />
    <form className="form-card" onSubmit={(event) => void signIn(event)}><div className="org-icon"><LockKeyhole /></div><h1>دخول المشرفين</h1><p>تسجيل الدخول متاح للحسابات التي عيّنها مسؤول قاعدة البيانات كمشرف.</p><label>البريد الإلكتروني<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" /></label><label>كلمة المرور<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" /></label>{loginError && <p className="field-error" role="alert">{loginError}</p>}<button className="button button-primary button-wide" disabled={busy}>{busy ? 'جارٍ التحقق…' : 'تسجيل الدخول'}</button></form>
  </section>;
}

function AdminDashboard({ tab, setTab, message, setMessage }: { tab: ActiveTab; setTab: (tab: ActiveTab) => void; message: string; setMessage: (message: string) => void }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', tab], queryFn: async () => {
    if (!supabase) throw new Error('اتصال قاعدة البيانات غير متاح.');
    if (tab === 'aids') {
      const { data, error } = await supabase.from('aid_posts').select('id,title,slug,description,status,is_published,verification_status,source_url,registration_url,created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw new Error('تعذر تحميل المساعدات.');
      return data ?? [];
    }
    if (tab === 'organizations') {
      const { data, error } = await supabase.from('organizations').select('id,name,slug,verification_status,official_website,official_contact_url,is_archived').order('name');
      if (error) throw new Error('تعذر تحميل الجهات.');
      return data ?? [];
    }
    if (tab === 'categories') {
      const { data, error } = await supabase.from('categories').select('id,name,slug,is_active').order('name');
      if (error) throw new Error('تعذر تحميل التصنيفات.');
      return data ?? [];
    }
    if (tab === 'reports') {
      const { data, error } = await supabase.from('reports').select('id,report_type,reported_url,description,status,created_at,contact_email').order('created_at', { ascending: false }).limit(100);
      if (error) throw new Error('تعذر تحميل البلاغات.');
      return data ?? [];
    }
    const { data, error } = await supabase.from('admin_audit_logs').select('id,action,entity_type,entity_id,changes_summary,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error('تعذر تحميل سجل التدقيق.');
    return data ?? [];
  } });
  async function setAidPublished(aid: Pick<Aid, 'id' | 'source_url' | 'registration_url' | 'is_published' | 'status'>) {
    if (!supabase) return;
    if (!aid.is_published && !aid.source_url) {
      setMessage('لا يمكن نشر الإعلان دون رابط مصدر رسمي موثق.');
      return;
    }
    if (!aid.is_published && ['pending_review', 'suspicious', 'rejected'].includes(aid.status)) {
      setMessage('غيّر حالة الإعلان إلى حالة مراجعة مناسبة قبل النشر.');
      return;
    }
    if (!aid.is_published) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) { setMessage('انتهت جلسة المشرف؛ سجّل الدخول مجددًا.'); return; }
      const { error: sourceError } = await supabase.from('aid_sources').insert({
        aid_post_id: aid.id,
        source_url: aid.source_url!,
        source_type: 'official_announcement',
        check_result: 'accessible',
        notes: 'راجع المشرف المصدر والرابط عند النشر.',
        checked_by: userData.user.id,
      });
      if (sourceError) { setMessage('تعذر تسجيل مراجعة المصدر؛ لم يتم نشر الإعلان.'); return; }
    }
    const { error } = await supabase.from('aid_posts').update({
      is_published: !aid.is_published,
      verification_status: aid.is_published ? 'pending' : 'verified',
      last_verified_at: aid.is_published ? null : new Date().toISOString(),
      published_at: aid.is_published ? null : new Date().toISOString(),
    }).eq('id', aid.id);
    if (error) { setMessage('تعذر تحديث حالة النشر. تحقق من الصلاحية والبيانات.'); return; }
    setMessage(aid.is_published ? 'تم إلغاء النشر.' : 'تم النشر بعد اعتماد المشرف للمصدر.');
    await client.invalidateQueries({ queryKey: ['admin'] });
  }
  return <section className="section container page-section admin-page">
    <Seo title="لوحة الإدارة" description="إدارة إعلانات المساعدات والجهات والبلاغات." noindex />
    <div className="admin-heading"><div><span className="eyebrow">إدارة المحتوى</span><h1>لوحة المشرف</h1><p>كل التغييرات الحساسة محمية بسياسات قاعدة البيانات.</p></div><button className="button button-light" onClick={() => void supabase?.auth.signOut()}><LogOut size={16} /> تسجيل الخروج</button></div>
    <nav className="admin-tabs" aria-label="أقسام لوحة الإدارة">{([['aids', 'المساعدات'], ['organizations', 'الجهات'], ['categories', 'التصنيفات'], ['reports', 'البلاغات'], ['logs', 'سجل التدقيق']] as const).map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setMessage(''); }}>{label}</button>)}</nav>
    <AdminStats />
    {message && <div className="form-result" role="status">{message}</div>}
    {tab === 'aids' && <AidCreateForm onCreated={async () => { setMessage('تم حفظ المساعدة كمسودة بانتظار المراجعة.'); await client.invalidateQueries({ queryKey: ['admin'] }); }} />}
    {tab === 'organizations' && <OrganizationManager onSaved={async () => { setMessage('تم حفظ بيانات الجهة.'); await client.invalidateQueries({ queryKey: ['admin'] }); }} />}
    {tab === 'categories' && <CategoryManager onSaved={async () => { setMessage('تم حفظ التصنيف.'); await client.invalidateQueries({ queryKey: ['admin'] }); }} />}
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} retry={() => void query.refetch()} /> : (
      <div className="admin-table-wrap">
        {tab === 'aids' && <table><thead><tr><th>العنوان</th><th>الحالة</th><th>النشر</th><th>إجراء</th></tr></thead><tbody>{(query.data as AidAdminRow[]).map((row) => <tr key={row.id}><td>{row.title}<br /><AidEditButton row={row} onSaved={() => { setMessage('تم تحديث بيانات المساعدة.'); void client.invalidateQueries({ queryKey: ['admin'] }); }} /></td><td><AidStatusControl row={row} onSaved={() => { setMessage('تم تحديث حالة المساعدة.'); void client.invalidateQueries({ queryKey: ['admin'] }); }} /></td><td>{row.is_published ? 'منشور' : 'مسودة'}</td><td><button className="button button-quiet" onClick={() => void setAidPublished(row)}>{row.is_published ? 'إلغاء النشر' : 'مراجعة ونشر'}</button></td></tr>)}</tbody></table>}
        {tab === 'organizations' && <table><thead><tr><th>الجهة</th><th>الرابط الرسمي</th><th>التحقق</th><th>الحالة</th></tr></thead><tbody>{(query.data as OrganizationAdminRow[]).map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.official_website || 'غير متوفر'}</td><td>{row.verification_status}</td><td><OrganizationActions row={row} onSaved={() => { setMessage('تم تحديث الجهة.'); void client.invalidateQueries({ queryKey: ['admin'] }); }} /></td></tr>)}</tbody></table>}
        {tab === 'categories' && <table><thead><tr><th>التصنيف</th><th>المعرّف</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{(query.data as CategoryAdminRow[]).map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.slug}</td><td>{row.is_active ? 'نشط' : 'مؤرشف'}</td><td><CategoryActions row={row} onSaved={() => { setMessage('تم تحديث التصنيف.'); void client.invalidateQueries({ queryKey: ['admin'] }); }} /></td></tr>)}</tbody></table>}
        {tab === 'reports' && <table><thead><tr><th>النوع</th><th>الوصف</th><th>الرابط</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>{(query.data as ReportAdminRow[]).map((row) => <tr key={row.id}><td>{row.report_type}</td><td>{row.description}</td><td>{row.reported_url || '—'}</td><td><ReportStatus reportId={row.id} currentStatus={row.status} onSaved={() => { setMessage('تم تحديث حالة البلاغ.'); void client.invalidateQueries({ queryKey: ['admin'] }); }} /></td><td>{new Date(row.created_at).toLocaleDateString('ar')}</td></tr>)}</tbody></table>}
        {tab === 'logs' && <table><thead><tr><th>العملية</th><th>السجل</th><th>ملخص التغيير</th><th>التاريخ</th></tr></thead><tbody>{(query.data as AuditAdminRow[]).map((row) => <tr key={row.id}><td>{row.action}</td><td>{row.entity_type}</td><td>{row.changes_summary}</td><td>{new Date(row.created_at).toLocaleString('ar')}</td></tr>)}</tbody></table>}
        {query.data.length === 0 && <p className="subtle-note">لا توجد سجلات بعد.</p>}
      </div>
    )}
    <p className="subtle-note"><ShieldCheck size={15} /> لا تنشر أي إعلان إلا بعد مراجعة المصدر رسميًا. حالة المسودة هي الافتراضية.</p>
  </section>;
}

function AdminStats() {
  const stats = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      if (!supabase) throw new Error('اتصال قاعدة البيانات غير متاح.');
      const needsReviewSince = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const [published, pending, needsUpdate, reports, organizations] = await Promise.all([
        supabase.from('aid_posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('aid_posts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('aid_posts').select('id', { count: 'exact', head: true }).eq('is_published', true).or(`last_verified_at.is.null,last_verified_at.lt.${needsReviewSince}`),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
      ]);
      if (published.error || pending.error || needsUpdate.error || reports.error || organizations.error) {
        throw new Error('تعذر حساب مؤشرات لوحة الإدارة.');
      }
      return [
        ['مساعدات منشورة', published.count],
        ['بانتظار المراجعة', pending.count],
        ['تحتاج إلى تحديث', needsUpdate.count],
        ['بلاغات جديدة', reports.count],
        ['جهات مسجلة', organizations.count],
      ] as const;
    },
  });
  if (stats.isPending) return <div className="stats-loading">جارٍ تحميل إحصاءات قاعدة البيانات…</div>;
  if (stats.isError) return <ErrorState message={stats.error.message} retry={() => void stats.refetch()} />;
  return <div className="stats-grid">{stats.data.map(([label, count]) => <div className="stat-card" key={label}><span>{label}</span><strong>{count ?? 0}</strong></div>)}</div>;
}

type ManagerFormProps = { onSaved: () => Promise<void> };

function OrganizationManager({ onSaved }: ManagerFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [website, setWebsite] = useState('');
  const [contactUrl, setContactUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('أدخل اسمًا ومعرّفًا صالحًا بالأحرف الإنجليزية الصغيرة.'); return; }
    if (website && !/^https?:\/\/\S+$/i.test(website)) { setError('رابط الموقع يجب أن يبدأ بـ http أو https.'); return; }
    if (contactUrl && !/^https?:\/\/\S+$/i.test(contactUrl)) { setError('رابط التواصل يجب أن يبدأ بـ http أو https.'); return; }
    const { error: saveError } = await supabase.from('organizations').insert({
      name: name.trim(), slug, official_website: website.trim() || null,
      official_contact_url: contactUrl.trim() || null,
      description: description.trim() || null, verification_status: 'unverified',
    });
    if (saveError) { setError('تعذر إضافة الجهة. تحقق من عدم تكرار المعرّف.'); return; }
    setName(''); setSlug(''); setWebsite(''); setContactUrl(''); setDescription(''); setError('');
    await onSaved();
  }
  return <form className="admin-form" onSubmit={(event) => void submit(event)}>
    <strong className="admin-form-title">إضافة جهة معلنة</strong>
    <label>اسم الجهة<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
    <label>المعرّف<input value={slug} onChange={(event) => setSlug(event.target.value)} dir="ltr" required /></label>
    <label>الموقع الرسمي<input value={website} onChange={(event) => setWebsite(event.target.value)} dir="ltr" /></label>
    <label>صفحة التواصل الرسمية<input value={contactUrl} onChange={(event) => setContactUrl(event.target.value)} dir="ltr" /></label>
    <label>وصف مختصر<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    {error && <span className="field-error">{error}</span>}
    <button className="button button-primary">إضافة جهة</button>
  </form>;
}

function OrganizationActions({ row, onSaved }: { row: { id: string; name: string; slug: string; official_website: string | null; official_contact_url: string | null; is_archived: boolean; verification_status: string }; onSaved: () => void }) {
  const [error, setError] = useState('');
  async function update(values: Record<string, string | boolean | null>) {
    if (!supabase) return;
    const { error } = await supabase.from('organizations').update(values).eq('id', row.id);
    if (error) { setError('تعذر حفظ التغيير.'); return; }
    setError('');
    onSaved();
  }
  async function edit() {
    const name = window.prompt('اسم الجهة', row.name);
    if (name === null || !name.trim()) return;
    const website = window.prompt('الموقع الرسمي (اتركه فارغًا للحذف)', row.official_website ?? '');
    if (website === null) return;
    const contactUrl = window.prompt('صفحة التواصل الرسمية', row.official_contact_url ?? '');
    if (contactUrl === null) return;
    if ((website && !/^https?:\/\/\S+$/i.test(website)) || (contactUrl && !/^https?:\/\/\S+$/i.test(contactUrl))) { setError('الرابط يجب أن يبدأ بـ http أو https.'); return; }
    await update({
      name: name.trim(),
      official_website: website.trim() || null,
      official_contact_url: contactUrl.trim() || null,
      ...(row.verification_status === 'verified' ? { verification_status: 'pending', verified_at: null } : {}),
    });
  }
  return <><span className="row-actions">
    <button className="button button-light" onClick={() => void edit()}>تعديل</button>
    <button className="button button-quiet" disabled={row.verification_status !== 'verified' && !row.official_website} title={!row.official_website ? 'أضف الموقع الرسمي قبل التحقق' : undefined} onClick={() => void update({ verification_status: row.verification_status === 'verified' ? 'unverified' : 'verified', verified_at: row.verification_status === 'verified' ? null : new Date().toISOString() })}>{row.verification_status === 'verified' ? 'إلغاء التحقق' : 'اعتماد الجهة'}</button>
    <button className="button button-light" onClick={() => void update({ is_archived: !row.is_archived })}>{row.is_archived ? 'استعادة' : 'أرشفة'}</button>
  </span>{error && <span className="field-error">{error}</span>}</>;
}

function CategoryManager({ onSaved }: ManagerFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('أدخل اسمًا ومعرّفًا صالحًا بالأحرف الإنجليزية الصغيرة.'); return; }
    const { error: saveError } = await supabase.from('categories').insert({ name: name.trim(), slug });
    if (saveError) { setError('تعذر إضافة التصنيف. تحقق من عدم تكرار الاسم أو المعرّف.'); return; }
    setName(''); setSlug(''); setError('');
    await onSaved();
  }
  return <form className="admin-form" onSubmit={(event) => void submit(event)}>
    <strong className="admin-form-title">إضافة تصنيف</strong>
    <label>اسم التصنيف<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
    <label>المعرّف<input value={slug} onChange={(event) => setSlug(event.target.value)} dir="ltr" required /></label>
    {error && <span className="field-error">{error}</span>}
    <button className="button button-primary">إضافة تصنيف</button>
  </form>;
}

function CategoryActions({ row, onSaved }: { row: { id: string; name: string; slug: string; is_active: boolean }; onSaved: () => void }) {
  const [error, setError] = useState('');
  async function edit() {
    const name = window.prompt('اسم التصنيف', row.name);
    if (name === null || !name.trim() || !supabase) return;
    const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', row.id);
    if (error) { setError('تعذر تعديل التصنيف.'); return; }
    setError('');
    onSaved();
  }
  async function archive() {
    if (!supabase) return;
    const { error } = await supabase.from('categories').update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) { setError('تعذر تحديث التصنيف.'); return; }
    setError('');
    onSaved();
  }
  return <><span className="row-actions"><button className="button button-quiet" onClick={() => void edit()}>تعديل الاسم</button><button className="button button-light" onClick={() => void archive()}>{row.is_active ? 'أرشفة' : 'استعادة'}</button></span>{error && <span className="field-error">{error}</span>}</>;
}

function AidCreateForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AidForm>({ resolver: zodResolver(aidSchema) });
  const organizations = useQuery({
    queryKey: ['admin', 'aid-options', 'organizations'],
    queryFn: async () => {
      const { data, error } = await supabase!.from('organizations').select('id,name').eq('is_archived', false).order('name');
      if (error) throw new Error('تعذر تحميل قائمة الجهات.');
      return data ?? [];
    },
    enabled: expanded,
  });
  const categories = useQuery({
    queryKey: ['admin', 'aid-options', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase!.from('categories').select('id,name').eq('is_active', true).order('name');
      if (error) throw new Error('تعذر تحميل قائمة التصنيفات.');
      return data ?? [];
    },
    enabled: expanded,
  });
  async function submit(values: AidForm) {
    if (!supabase) return;
    setError('');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setError('انتهت جلسة المشرف؛ سجّل الدخول مجددًا.'); return; }
    const { error: insertError } = await supabase.from('aid_posts').insert({
      title: values.title,
      slug: values.slug,
      description: values.description,
      organization_id: values.organization_id || null,
      category_id: values.category_id || null,
      eligibility: values.eligibility?.trim() || null,
      required_documents: values.required_documents?.trim() || null,
      target_areas: values.target_areas?.split(',').map((area) => area.trim()).filter(Boolean) ?? [],
      source_published_at: values.source_published_at ? new Date(values.source_published_at).toISOString() : null,
      registration_start_at: values.registration_start_at ? new Date(values.registration_start_at).toISOString() : null,
      registration_end_at: values.registration_end_at ? new Date(values.registration_end_at).toISOString() : null,
      registration_url: values.registration_url || null,
      source_url: values.source_url || null,
      status: 'pending_review',
      verification_status: 'pending',
      is_published: false,
      created_by: userData.user.id,
    });
    if (insertError) { setError('تعذر حفظ المسودة. تحقق من عدم تكرار الرابط أو المعرف.'); return; }
    reset();
    setExpanded(false);
    await onCreated();
  }
  return <div className="admin-editor">
    <button className="button button-light" onClick={() => setExpanded(!expanded)}><Plus size={16} /> إضافة مساعدة كمسودة</button>
    {expanded && <form className="admin-form" onSubmit={handleSubmit(submit)}>
      <label>العنوان<input {...register('title')} /></label>{errors.title && <span className="field-error">{errors.title.message}</span>}
      <label>المعرّف (بالإنجليزية)<input {...register('slug')} dir="ltr" placeholder="aid-title-here" /></label>{errors.slug && <span className="field-error">{errors.slug.message}</span>}
      <label>الوصف<textarea {...register('description')} rows={3} /></label>{errors.description && <span className="field-error">{errors.description.message}</span>}
      <label>الجهة<select {...register('organization_id')}><option value="">غير محددة</option>{organizations.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>التصنيف<select {...register('category_id')}><option value="">غير محدد</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {(organizations.isError || categories.isError) && <span className="field-error">تعذر تحميل قوائم الجهات والتصنيفات؛ تحقق من الاتصال.</span>}
      <label>شروط الاستفادة<textarea {...register('eligibility')} rows={2} /></label>
      <label>المستندات المذكورة رسميًا<textarea {...register('required_documents')} rows={2} /></label>
      <label>المناطق المستهدفة (افصل بينها بفاصلة)<input {...register('target_areas')} /></label>
      <label>تاريخ نشر الإعلان في المصدر<input type="datetime-local" {...register('source_published_at')} /></label>
      <label>بداية التسجيل<input type="datetime-local" {...register('registration_start_at')} /></label>
      <label>نهاية التسجيل المعلنة<input type="datetime-local" {...register('registration_end_at')} /></label>{errors.registration_end_at && <span className="field-error">{errors.registration_end_at.message}</span>}
      <label>رابط الإعلان الأصلي<input {...register('source_url')} dir="ltr" /></label>{errors.source_url && <span className="field-error">{errors.source_url.message}</span>}
      <label>رابط التسجيل الرسمي<input {...register('registration_url')} dir="ltr" /></label>{errors.registration_url && <span className="field-error">{errors.registration_url.message}</span>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? <RefreshCw className="spin" /> : 'حفظ المسودة'}</button>
    </form>}
  </div>;
}

function ReportStatus({ reportId, currentStatus, onSaved }: { reportId: string; currentStatus: string; onSaved: () => void }) {
  const [errorMessage, setErrorMessage] = useState('');
  async function update(event: React.ChangeEvent<HTMLSelectElement>) {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ status: event.target.value }).eq('id', reportId);
    if (error) { setErrorMessage('تعذر تحديث البلاغ.'); return; }
    setErrorMessage('');
    onSaved();
  }
  return <><select aria-label="حالة البلاغ" value={currentStatus} onChange={(event) => void update(event)}><option value="new">جديد</option><option value="reviewing">قيد المراجعة</option><option value="resolved">تمت المعالجة</option><option value="rejected">مرفوض</option></select>{errorMessage && <small className="field-error">{errorMessage}</small>}</>;
}

function AidStatusControl({ row, onSaved }: { row: { id: string; status: string }; onSaved: () => void }) {
  const [errorMessage, setErrorMessage] = useState('');
  async function update(status: string) {
    if (!supabase) return;
    const { error } = await supabase.from('aid_posts').update({ status }).eq('id', row.id);
    if (error) { setErrorMessage('تعذر تغيير الحالة.'); return; }
    setErrorMessage('');
    onSaved();
  }
  return <><select aria-label="حالة المساعدة" value={row.status} onChange={(event) => void update(event.target.value)}><option value="pending_review">بانتظار المراجعة</option><option value="open">التسجيل مفتوح</option><option value="closing_soon">ينتهي قريبًا</option><option value="closed">مغلق</option><option value="expired">انتهى الموعد</option><option value="suspicious">مشبوه</option><option value="rejected">مرفوض</option></select>{errorMessage && <small className="field-error">{errorMessage}</small>}</>;
}

function AidEditButton({ row, onSaved }: { row: AidAdminRow; onSaved: () => void }) {
  const [errorMessage, setErrorMessage] = useState('');
  async function edit() {
    if (!supabase) return;
    const title = window.prompt('عنوان المساعدة', row.title);
    if (title === null) return;
    const slug = window.prompt('المعرّف بالإنجليزية', row.slug);
    if (slug === null) return;
    const description = window.prompt('وصف المساعدة', row.description);
    if (description === null) return;
    const sourceUrl = window.prompt('رابط المصدر الرسمي', row.source_url ?? '');
    if (sourceUrl === null) return;
    const registrationUrl = window.prompt('رابط التسجيل الرسمي', row.registration_url ?? '');
    if (registrationUrl === null) return;
    if (title.trim().length < 5 || description.trim().length < 10 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setErrorMessage('العنوان أو الوصف أو المعرّف غير صالح.');
      return;
    }
    if ((sourceUrl && !isSafeHttpUrl(sourceUrl)) || (registrationUrl && !isSafeHttpUrl(registrationUrl))) {
      setErrorMessage('يجب أن تكون الروابط صالحة وبروتوكولها HTTP أو HTTPS.');
      return;
    }
    const { error } = await supabase.from('aid_posts').update({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      source_url: sourceUrl.trim() || null,
      registration_url: registrationUrl.trim() || null,
      ...(row.is_published ? {
        is_published: false,
        verification_status: 'pending',
        last_verified_at: null,
        published_at: null,
      } : {}),
    }).eq('id', row.id);
    if (error) { setErrorMessage('تعذر تحديث الإعلان. قد يكون المعرّف مستخدمًا من إعلان آخر.'); return; }
    setErrorMessage('');
    onSaved();
  }
  return <><button className="text-link admin-edit-link" onClick={() => void edit()}>تعديل البيانات</button>{errorMessage && <small className="field-error">{errorMessage}</small>}</>;
}
