import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Send, ShieldAlert } from 'lucide-react';
import { Seo } from '../components/Seo';
import { reportSchema } from '../schemas';
import { submitReport } from '../services/reports';
import type { z } from 'zod';

type FormValues = z.infer<typeof reportSchema>;

export function ContactPage() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { report_type: 'رابط منتهي أو لا يعمل', reported_url: '', description: '', contact_email: '' },
  });
  async function onSubmit(values: FormValues) {
    setResult(null);
    try {
      await submitReport({ ...values, reported_url: values.reported_url || '', contact_email: values.contact_email || '', aid_post_id: params.get('aid') || undefined });
      setResult({ kind: 'success', text: 'تم إرسال البلاغ بنجاح. شكرًا لمساعدتنا في مراجعة المعلومات.' });
      reset();
    } catch (error) {
      setResult({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر إرسال البلاغ.' });
    }
  }
  return <section className="section container page-section">
    <Seo title="التواصل والإبلاغ" description="أرسل بلاغًا عن رابط منتهي أو مشبوه أو معلومة تحتاج إلى تصحيح." />
    <div className="page-intro"><span className="eyebrow">نراجع ملاحظاتكم</span><h1>تواصل معنا أو أبلغ عن رابط</h1><p>أرسل معلومات الرابط والمشكلة فقط. لا ترفق أرقام هوية أو بيانات مالية أو مستندات شخصية.</p></div>
    <div className="contact-layout">
      <form className="form-card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>نوع البلاغ<select {...register('report_type')}><option>رابط منتهي أو لا يعمل</option><option>رابط مشبوه أو ينتحل جهة</option><option>معلومة غير دقيقة</option><option>طلب إزالة أو تصحيح</option><option>استفسار عام</option></select></label>
        {errors.report_type && <span className="field-error">{errors.report_type.message}</span>}
        <label>رابط الصفحة المعنية (اختياري)<input {...register('reported_url')} placeholder="https://example.org/..." inputMode="url" dir="ltr" /></label>
        {errors.reported_url && <span className="field-error">{errors.reported_url.message}</span>}
        <label>وصف المشكلة<textarea {...register('description')} rows={5} placeholder="صف المشكلة دون تضمين معلومات شخصية…" /></label>
        {errors.description && <span className="field-error">{errors.description.message}</span>}
        <label>بريد إلكتروني للتواصل (اختياري)<input type="email" {...register('contact_email')} dir="ltr" autoComplete="email" /></label>
        {errors.contact_email && <span className="field-error">{errors.contact_email.message}</span>}
        {result && <div className={result.kind === 'success' ? 'form-result success-result' : 'form-result error-result'} role={result.kind === 'success' ? 'status' : 'alert'}>{result.text}</div>}
        <button className="button button-primary" disabled={isSubmitting}><Send size={17} />{isSubmitting ? 'جارٍ الإرسال…' : 'إرسال البلاغ'}</button>
      </form>
      <aside className="contact-safety"><ShieldAlert size={30} /><h2>سلامتك وخصوصيتك</h2><p>لا ترسل بيانات مستفيدين أو وثائق هوية أو كلمات مرور أو رموز تحقق. البلاغات ومعلومات التواصل لا تظهر للعامة.</p><p>تعتمد خدمة الإرسال على إعداد Supabase، وتُرفض الطلبات غير الصحيحة على الخادم أيضًا.</p></aside>
    </div>
  </section>;
}
