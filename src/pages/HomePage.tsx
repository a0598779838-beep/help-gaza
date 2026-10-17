import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUpRight, BadgeAlert, BookOpenCheck, HeartPulse, House, Search, ShieldCheck, Soup, Wallet } from 'lucide-react';
import { useState } from 'react';
import { AidCard } from '../components/AidCard';
import { ErrorState, LoadingState } from '../components/States';
import { Seo } from '../components/Seo';
import { fetchAids, fetchOrganizations } from '../services/aids';
import { isSafeHttpUrl } from '../lib/url';

const quickLinks = [
  { label: 'غذاء', slug: 'food', icon: Soup },
  { label: 'مساعدات نقدية', slug: 'cash', icon: Wallet },
  { label: 'صحة وعلاج', slug: 'health', icon: HeartPulse },
  { label: 'إيواء', slug: 'shelter', icon: House },
  { label: 'تعليم', slug: 'education', icon: BookOpenCheck },
];

export function HomePage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const aids = useQuery({
    queryKey: ['aids', 'home'],
    queryFn: () => fetchAids({ search: '', category: '', area: '', status: '', organization: '', sort: 'newest', page: 1, pageSize: 3 }),
  });
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations });
  return (
    <>
      <Seo title="الرئيسية" description="اعثر على إعلانات المساعدات الإنسانية في غزة من مصادرها، وتحقق من حالة التسجيل وتاريخ المراجعة." />
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> دليل معلوماتي مستقل</span>
            <h1>المعلومة الموثوقة<br /><em>تصل إليك بسهولة.</em></h1>
            <p>نجمع روابط إعلانات المساعدات المنشورة من مصادرها، ونوضح الجهة والمصدر وتاريخ آخر تحقق — دون جمع بيانات المستفيدين.</p>
            <form className="search-box" onSubmit={(event) => { event.preventDefault(); navigate(`/aids?q=${encodeURIComponent(search)}`); }}>
              <Search size={21} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ابحث عن المساعدات" placeholder="ابحث عن مساعدة أو جهة معلنة…" /><button className="button button-primary" type="submit">ابحث</button>
            </form>
            <a className="button button-light hero-registration-cta" href="#registration-links">روابط التسجيل المباشر <ArrowDown size={17} /></a>
            <p className="hero-hint">اكتب نوع المساعدة أو اسم المؤسسة</p>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="hero-circle"><HeartPulse size={90} strokeWidth={1.3} /></div><div className="hero-card hero-card-one"><ShieldCheck size={20} /> مصدر واضح</div><div className="hero-card hero-card-two"><BookOpenCheck size={20} /> معلومات محدثة</div></div>
        </div>
      </section>
      <section className="section container registration-section" id="registration-links">
        <div className="section-heading"><div><span className="eyebrow">الأهم لك</span><h2>روابط التسجيل المباشر</h2><p>اختر الجهة لفتح صفحة التسجيل في تبويب جديد، وتأكد من شروطها قبل إرسال بياناتك.</p></div><Link className="text-link" to="/organizations">كل الجهات <ArrowLeft size={16} /></Link></div>
        {organizations.isPending ? <LoadingState /> : organizations.isError ? <ErrorState message={organizations.error.message} retry={() => void organizations.refetch()} /> : organizations.data.filter((organization) => organization.registration_url && isSafeHttpUrl(organization.registration_url)).length ? <div className="organization-grid">{organizations.data.filter((organization) => organization.registration_url && isSafeHttpUrl(organization.registration_url)).map((organization) => <article className="organization-card registration-card" key={organization.id}><div className="org-icon"><ArrowUpRight /></div><span className={organization.verification_status === 'verified' ? 'verification verified' : 'verification'}>{organization.verification_status === 'verified' ? 'تم التحقق من المصدر الرسمي' : 'لم يتم التحقق من الهوية'}</span><h2>{organization.name}</h2><p>{organization.description || 'راجع الموقع الرسمي للتفاصيل.'}</p><a className="button button-primary button-wide org-register" href={organization.registration_url!} target="_blank" rel="noopener noreferrer">تسجيل مباشر <ArrowUpRight size={17} /></a></article>)}</div> : <div className="state-box">لا تتوفر حاليًا روابط تسجيل مباشرة.</div>}
        <p className="registration-warning"><ShieldCheck size={17} /> دليلنا لا يستقبل طلبات المساعدة ولا يضمن قبول التسجيل. لا ترسل بياناتك إلا بعد التحقق من الجهة.</p>
      </section>
      <aside className="container ad-slot" aria-label="مساحة إعلانية غير مفعلة"><span>مساحة إعلانية — غير مفعّلة</span></aside>
      <section className="section container">
        <div className="section-heading"><div><span className="eyebrow">استكشف حسب النوع</span><h2>كيف يمكننا مساعدتك؟</h2></div><Link className="text-link" to="/aids">كل المساعدات <ArrowLeft size={16} /></Link></div>
        <div className="quick-grid">{quickLinks.map(({ label, slug, icon: Icon }) => <Link className="quick-card" key={slug} to={`/aids?category=${slug}`}><span><Icon /></span><strong>{label}</strong><ArrowLeft size={16} /></Link>)}</div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">أحدث الإعلانات</span><h2>معلومات المساعدات</h2><p>كل بطاقة تعرض المصدر وحالة التحقق بوضوح.</p></div><Link className="button button-light" to="/aids">عرض الكل <ArrowLeft size={16} /></Link></div>
          {aids.isPending ? <LoadingState /> : aids.isError ? <ErrorState message={aids.error.message} retry={() => void aids.refetch()} /> : <div className="aid-grid">{aids.data.items.map((aid) => <AidCard key={aid.id} aid={aid} />)}</div>}
        </div>
      </section>
      <section className="section container trust-section">
        <div className="trust-copy"><span className="eyebrow">سلامتك أولًا</span><h2>تعرّف على المصدر قبل مشاركة معلوماتك</h2><p>لا تدخل رقم الهوية أو معلومات الحساب البنكي في أي نموذج إلا بعد التحقق من الجهة الرسمية. دليلنا لا يطلب هذه البيانات ولا يحتفظ بها.</p><Link className="text-link" to="/about">كيف نراجع الروابط؟ <ArrowLeft size={16} /></Link></div>
        <div className="safety-card"><BadgeAlert size={27} /><h3>إرشادات سريعة للحماية</h3><ul><li>تحقق من نطاق الموقع الرسمي قبل التسجيل.</li><li>لا تدفع رسومًا للحصول على مساعدة.</li><li>لا تشارك كلمات المرور أو رموز التحقق.</li><li>أبلغنا عن أي رابط مشبوه أو منتهي.</li></ul><Link to="/contact">إرسال بلاغ عن رابط <ArrowLeft size={15} /></Link></div>
      </section>
      <section className="independent-note"><div className="container"><ShieldCheck /><p><strong>لسنا جهة مانحة.</strong> هذا الموقع دليل معلوماتي مستقل، ولا يمثل المؤسسات ولا يضمن قبول طلبات التسجيل.</p></div></section>
    </>
  );
}
