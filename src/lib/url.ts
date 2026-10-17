export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function hostFromUrl(value?: string | null): string {
  if (!value || !isSafeHttpUrl(value)) return 'رابط غير متوفر';
  return new URL(value).hostname;
}
