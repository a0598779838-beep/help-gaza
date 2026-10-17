import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { getDisplayStatus, statusLabels } from '../lib/status';
import { hostFromUrl } from '../lib/url';
import type { Aid } from '../types';

export function AidCard({ aid }: { aid: Aid }) {
  const status = getDisplayStatus(aid.status, aid.registration_end_at);
  const verified = aid.verification_status === 'verified';
  return (
    <article className="aid-card">
      <div className="card-topline">
        <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
        <span className="category-label">{aid.category?.name ?? 'تصنيف غير متوفر'}</span>
      </div>
      <h3><Link to={`/aids/${aid.slug}`}>{aid.title}</Link></h3>
      <p className="card-description">{aid.description}</p>
      <div className="card-details">
        <span><MapPin size={16} />{aid.target_areas?.join('، ') || 'المنطقة غير متوفرة'}</span>
        <span>{verified ? <ShieldCheck size={16} /> : <ShieldCheck size={16} className="muted-icon" />}{aid.organization?.name ?? 'الجهة غير متوفرة'}</span>
        <span><CalendarDays size={16} />آخر تحقق: {aid.last_verified_at ? new Date(aid.last_verified_at).toLocaleDateString('ar') : 'غير متوفر'}</span>
      </div>
      <div className="card-bottom">
        <span className={verified ? 'verification verified' : 'verification'}>{verified ? 'تم التحقق من المصدر' : 'لم يتم التحقق بعد'}</span>
        {aid.source_url && <span className="external-host" dir="ltr">{hostFromUrl(aid.source_url)}</span>}
      </div>
      <Link className="text-link" to={`/aids/${aid.slug}`}>تفاصيل المساعدة <span aria-hidden="true">←</span></Link>
    </article>
  );
}
