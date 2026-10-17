import { describe, expect, it } from 'vitest';
import { getDisplayStatus } from './status';

describe('aid display status', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('shows expired only from a documented end date', () => {
    expect(getDisplayStatus('open', '2025-12-31T23:00:00Z', now)).toBe('expired');
    expect(getDisplayStatus('open', null, now)).toBe('open');
  });
  it('marks deadlines within three days as closing soon', () => {
    expect(getDisplayStatus('open', '2026-01-03T00:00:00Z', now)).toBe('closing_soon');
    expect(getDisplayStatus('closed', '2026-01-02T00:00:00Z', now)).toBe('closed');
  });
});
