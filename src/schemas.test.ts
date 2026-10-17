import { describe, expect, it } from 'vitest';
import { aidSchema, reportSchema } from './schemas';

describe('form validation', () => {
  it('rejects unsafe report URLs and accepts omitted optional contact details', () => {
    const good = reportSchema.safeParse({ report_type: 'تصحيح رابط', description: 'وصف كاف للمشكلة', reported_url: '', contact_email: '' });
    expect(good.success).toBe(true);
    const unsafe = reportSchema.safeParse({ report_type: 'بلاغ', description: 'وصف كاف للمشكلة', reported_url: 'javascript:alert(1)' });
    expect(unsafe.success).toBe(false);
  });

  it('rejects invalid or reversed registration times', () => {
    const base = { title: 'عنوان مساعدة', slug: 'aid-title', description: 'وصف واضح ومفصل للمساعدة' };
    expect(aidSchema.safeParse({ ...base, registration_start_at: '2026-02-02T10:00', registration_end_at: '2026-02-01T10:00' }).success).toBe(false);
    expect(aidSchema.safeParse({ ...base, registration_start_at: 'not-a-date' }).success).toBe(false);
  });
});
