import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, CalendarDays, Copy, MapPin, Share2, ShieldCheck } from 'lucide-react';
import { Seo } from '../components/Seo';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { getDisplayStatus, statusLabels } from '../lib/status';
import { hostFromUrl, isSafeHttpUrl } from '../lib/url';
import { fetchAid } from '../services/aids';

function display(value?: string | null) {
  return value?.trim() || 'غير متوفر';
}

export function AidDetailPage() {
  const { slug = '' } = useParams();
  const aidQuery = useQuery({ queryKey: ['aid', slug], queryFn: () => fetchAid(slug) });
  const [notice, setNotice] = useState('');
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice('تم نسخ رابط الصفحة.');
    } catch {
      setNotice('تعذر نسخ الرابط من هذا المتصفح. انسخه من شريط العنوان.');
    }
  }
  async function shareLink() {
    if (navigator.share) {
      try { await navigator.share({ title: aidQuery.data?.title, url: window.location.href }); }
      catch (error) { if (error instanceof Error && error.name !== 'AbortError') setNotice('تعذرت مشاركة الرابط.'); }
    } else {
      await copyLink();
    }
  }
  if (aidQuery.isPending) return <section className="container section page-section"><LoadingState /></section>;
  if (aidQuery.isError) return <section className="container section page-section"><ErrorState message={aidQuery.error.message} retry={() => void aidQuery.refetch()} /></section>;
  const aid = aidQuery.data;
  if (!aid) return <section className="container section page-section"><EmptyState message="لم يتم العثور على المساعدة أو أنها غير منشورة." /><Link to="/aids" className="button button-light">العودة إلى المساعدات</Link></section>;
  const status = getDisplayStatus(aid.status, aid.registration_end_at);
  const validRegistrationUrl = aid.registration_url && isSafeHttpUrl(aid.registration_url);
  const validSourceUrl = aid.source_url && isSafeHttpUrl(aid.source_url);
  return (
    <article className="container section page-section detail-page">
      <Seo title={aid.title} description={aid.description.slice(0, 155)} />
      <Link to="/aids" className="text-link">← كل المساعدات</Link>
      <header className="detail-header">
        <div className="card-topline"><span className={`status-pill status-${status}`}>{statusLabels[status]}</span><span className="category-label">{aid.category?.name ?? 'تصنيف غير متوفر'}</span></div>
        <h1>{aid.title}</h1><p>{aid.description}</p>
        <div className="detail-quick"><span><MapPin />{aid.target_areas?.join('، ') || 'المنطقة غير متوفرة'}</span><span><ShieldCheck />{aid.organization?.name ?? 'الجهة غير متوفرة'}</span></div>
      </header>
      <div className="detail-layout">
        <div className="detail-content">
          <section className="detail-box"><h2>عن المساعدة</h2><p className="preserve-lines">{aid.description}</p></section>
          <section className="detail-box"><h2>الشروط والمستندات</h2><dl className="info-list"><div><dt>شروط الاستفادة</dt><dd>{display(aid.eligibility)}</dd></div><div><dt>المستندات المذكورة</dt><dd>{display(aid.required_documents)}</dd></div></dl></section>
          <section className="detail-box"><h2>التواريخ والمراجعة</h2><dl className="info-list">
            <div><dt>بداية التسجيل</dt><dd>{aid.registration_start_at ? new Date(aid.registration_start_at).toLocaleDateString('ar') : 'غير متوفر'}</dd></div>
            <div><dt>نهاية التسجيل المعلنة</dt><dd>{aid.registration_end_at ? new Date(aid.registration_end_at).toLocaleDateString('ar') : 'غير متوفر'}</dd></div>
            <div><dt>تاريخ الإعلان</dt><dd>{aid.source_published_at ? new Date(aid.source_published_at).toLocaleDateString('ar') : 'غير متوفر'}</dd></div>
            <div><dt>آخر تحقق</dt><dd>{aid.last_verified_at ? new Date(aid.last_verified_at).toLocaleDateString('ar') : 'غير متوفر'}</dd></div>
          </dl></section>
          <section className="detail-box source-box"><h2>المصادر</h2>
            <p>الموقع الرسمي للجهة: {display(aid.organization?.official_website)}</p>
            {validSourceUrl ? <a className="source-link" href={aid.source_url!} target="_blank" rel="noopener noreferrer">الإعلان الأصلي <span dir="ltr">{hostFromUrl(aid.source_url)}</span><ArrowUpRight size={17} /></a> : <p>رابط المصدر: غير متوفر</p>}
          </section>
        </div>
        <aside className="detail-aside">
          <div className="register-card"><h2>رابط التسجيل</h2><p>تحقق من النطاق قبل مشاركة أي بيانات مع الجهة.</p>
            {validRegistrationUrl ? <a className="button button-primary button-wide" href={aid.registration_url!} target="_blank" rel="noopener noreferrer">الانتقال إلى موقع الجهة <ArrowUpRight size={18} /></a> : <div className="not-available">رابط التسجيل غير متوفر</div>}
            <p className="domain-display" dir="ltr">{validRegistrationUrl ? hostFromUrl(aid.registration_url) : '—'}</p>
          </div>
          <div className="safety-inline"><AlertTriangle size={20} /><p>لا تدفع رسومًا ولا تشارك كلمات المرور أو رموز التحقق. هذا الدليل لا يطلب بيانات شخصية.</p></div>
          <div className="share-actions"><button className="button button-light" onClick={() => void copyLink()}><Copy size={16} /> نسخ الرابط</button><button className="button button-light" onClick={() => void shareLink()}><Share2 size={16} /> مشاركة</button></div>
          <Link to={`/contact?aid=${aid.id}`} className="report-link">الإبلاغ عن رابط مشبوه أو منتهي <ArrowUpRight size={15} /></Link>
          {notice && <p className="inline-notice" role="status">{notice}</p>}
          <p className="subtle-note"><CalendarDays size={15} /> يتم تحديد حالة التسجيل بناءً على آخر المعلومات الموثقة. انتهاء الموعد لا يؤكد إغلاق النموذج.</p>
        </aside>
      </div>
    </article>
  );
}
