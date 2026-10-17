import { supabase } from '../lib/supabase';
import type { ReportInput } from '../types';

export async function submitReport(input: ReportInput): Promise<void> {
  if (!supabase) throw new Error('الإرسال غير متاح قبل إعداد اتصال قاعدة البيانات.');
  const { error } = await supabase.functions.invoke('submit-report', { body: input });
  if (error) throw new Error('تعذر إرسال البلاغ الآن. حاول مجددًا لاحقًا.');
}
