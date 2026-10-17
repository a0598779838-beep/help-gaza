import { AlertCircle, LoaderCircle, SearchX } from 'lucide-react';

export function LoadingState() {
  return <div className="state-box" role="status"><LoaderCircle className="spin" /><span>جارٍ تحميل المعلومات…</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-box error-box" role="alert"><AlertCircle /><span>{message}</span>{retry && <button className="button button-light" onClick={retry}>إعادة المحاولة</button>}</div>;
}

export function EmptyState({ message = 'لا توجد نتائج مطابقة حاليًا.' }: { message?: string }) {
  return <div className="state-box"><SearchX /><span>{message}</span></div>;
}
