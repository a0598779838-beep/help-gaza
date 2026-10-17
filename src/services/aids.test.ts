import { describe, expect, it } from 'vitest';
import { fetchAids } from './aids';

describe('demo aid search', () => {
  const defaults = { search: '', category: '', area: '', status: '', organization: '', sort: 'newest' as const, page: 1, pageSize: 9 };
  it('shows only explicitly published demo-labeled records', async () => {
    const result = await fetchAids(defaults);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toContain('توضيحي');
  });
  it('applies search, filters, and pagination', async () => {
    expect((await fetchAids({ ...defaults, search: 'توضيحي' })).total).toBe(1);
    expect((await fetchAids({ ...defaults, category: 'food' })).total).toBe(0);
    expect((await fetchAids({ ...defaults, page: 2 })).items).toHaveLength(0);
  });
});
