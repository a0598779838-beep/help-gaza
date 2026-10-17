import type { AidStatus } from '../types';

export const statusLabels: Record<AidStatus, string> = {
  pending_review: 'بانتظار المراجعة',
  open: 'التسجيل مفتوح',
  closing_soon: 'ينتهي التسجيل قريبًا',
  closed: 'التسجيل مغلق',
  expired: 'انتهى الموعد المعلن',
  suspicious: 'يحتاج إلى تحقق',
  rejected: 'غير معتمد',
};

export function getDisplayStatus(status: AidStatus, endAt?: string | null, now = new Date()): AidStatus {
  if (!endAt || (status !== 'open' && status !== 'closing_soon')) return status;
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return status;
  if (end.getTime() < now.getTime()) return 'expired';
  const daysUntilEnd = (end.getTime() - now.getTime()) / 86_400_000;
  return daysUntilEnd <= 3 ? 'closing_soon' : status;
}
