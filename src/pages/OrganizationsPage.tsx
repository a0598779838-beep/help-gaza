import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Building2, ShieldCheck } from 'lucide-react';
import { Seo } from '../components/Seo';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { fetchOrganizations } from '../services/aids';
import { isSafeHttpUrl } from '../lib/url';

export function OrganizationsPage() {
  const query = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations });
  return <section className="section container page-section">
    <Seo title="الجهات والمؤسسات" description="دليل الجهات وروابطها الرسمية وخطوط المساعدة المتاحة، مع التمييز بينها وبين روابط التسجيل." />
    <div className="page-intro"><span className="eyebrow">الجهات المعلنة</span><h1>المؤسسات والجهات</h1><p>لا تعني شهرة الاسم أو تداول الرابط التحقق من هوية الجهة. روابط المواقع وخطوط الاستفسار ليست بالضرورة روابط تسجيل لمساعدة متاحة.</p></div>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} retry={() => void query.refetch()} /> : query.data.length ? <div className="organization-grid">{query.data.map((org) => <article className="organization-card" key={org.id}><div className="org-icon"><Building2 /></div><span className={org.verification_status === 'verified' ? 'verification verified' : 'verification'}>{org.verification_status === 'verified' ? <><ShieldCheck size={14} /> تم التحقق من المصدر الرسمي</> : 'لم يتم التحقق من الهوية'}</span><h2>{org.name}</h2><p>{org.description || 'لا يتوفر وصف موثق.'}</p><div className="org-links">{org.official_website && isSafeHttpUrl(org.official_website) ? <a className={!org.registration_url ? 'button button-primary button-wide org-register' : undefined} href={org.official_website} target="_blank" rel="noopener noreferrer">{org.slug === 'fpya' ? 'تسجيل مباشر' : org.registration_url ? 'الموقع الرسمي' : 'زيارة الموقع'} <ArrowUpRight size={16} /></a> : <span>الموقع الرسمي غير متوفر</span>}{org.official_contact_url && isSafeHttpUrl(org.official_contact_url) && <a href={org.official_contact_url} target="_blank" rel="noopener noreferrer">التواصل الرسمي <ArrowUpRight size={16} /></a>}{org.support_url && isSafeHttpUrl(org.support_url) && <a href={org.support_url} target="_blank" rel="noopener noreferrer">خط المساعدة والاستفسار (ليس تسجيلًا) <ArrowUpRight size={16} /></a>}{org.registration_url && isSafeHttpUrl(org.registration_url) && <a className="button button-primary button-wide org-register" href={org.registration_url} target="_blank" rel="noopener noreferrer">تسجيل مباشر <ArrowUpRight size={17} /></a>}</div><p className="subtle-note">آخر تحقق: {org.verified_at ? new Date(org.verified_at).toLocaleDateString('ar') : 'غير متوفر'}</p><Link className="text-link" to={`/aids?organization=${org.slug}`}>المساعدات المرتبطة <ArrowUpRight size={15} /></Link></article>)}</div> : <EmptyState message="لا توجد جهات مدرجة حاليًا." />}
  </section>;
}
