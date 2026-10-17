import { describe, expect, it } from 'vitest';
import { hostFromUrl, isSafeHttpUrl } from './url';

describe('safe external URLs', () => {
  it('allows HTTP and HTTPS URLs only', () => {
    expect(isSafeHttpUrl('https://example.org/register')).toBe(true);
    expect(isSafeHttpUrl('http://example.org')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hello')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });

  it('returns host only for a safe URL', () => {
    expect(hostFromUrl('https://forms.example.org/apply')).toBe('forms.example.org');
    expect(hostFromUrl('javascript:alert(1)')).toBe('رابط غير متوفر');
  });
});
