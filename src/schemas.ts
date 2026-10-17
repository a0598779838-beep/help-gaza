import { z } from 'zod';
import { isSafeHttpUrl } from './lib/url';

const optionalHttpUrl = z.string().trim().optional().or(z.literal('')).refine((value) => !value || isSafeHttpUrl(value), 'أدخل رابطًا صحيحًا يبدأ بـ http أو https');

export const reportSchema = z.object({
  report_type: z.string().min(1, 'اختر نوع البلاغ').max(80),
  reported_url: optionalHttpUrl,
  description: z.string().trim().min(10, 'اكتب وصفًا لا يقل عن 10 أحرف').max(2000),
  contact_email: z.string().trim().email('أدخل بريدًا صحيحًا').max(254).optional().or(z.literal('')),
});

export const aidSchema = z.object({
  title: z.string().trim().min(5).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(10000),
  organization_id: z.string().uuid().optional().or(z.literal('')),
  category_id: z.string().uuid().optional().or(z.literal('')),
  eligibility: z.string().max(5000).optional(),
  required_documents: z.string().max(5000).optional(),
  target_areas: z.string().max(500).optional(),
  registration_url: optionalHttpUrl,
  source_url: optionalHttpUrl,
  source_published_at: z.string().optional().or(z.literal('')),
  registration_start_at: z.string().optional().or(z.literal('')),
  registration_end_at: z.string().optional().or(z.literal('')),
}).superRefine((values, context) => {
  for (const field of ['source_published_at', 'registration_start_at', 'registration_end_at'] as const) {
    const value = values[field];
    if (value && Number.isNaN(new Date(value).getTime())) {
      context.addIssue({ code: 'custom', path: [field], message: 'أدخل تاريخًا ووقتًا صحيحين.' });
    }
  }
  if (values.registration_start_at && values.registration_end_at
    && new Date(values.registration_end_at).getTime() < new Date(values.registration_start_at).getTime()) {
    context.addIssue({ code: 'custom', path: ['registration_end_at'], message: 'موعد النهاية يجب ألا يسبق موعد البداية.' });
  }
});
