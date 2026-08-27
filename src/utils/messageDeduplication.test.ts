import { describe, expect, it } from 'vitest';
import { removeAccidentalRetryDuplicates } from './messageDeduplication';
import type { MarketplaceMessage } from '../types';
const message = (id: string, createdAt: string, text = 'Hello'): MarketplaceMessage => ({
  _id: id, conversation: 'c1', sender: 'u1', kind: 'user', text, attachments: [], createdAt,
});
describe('accidental message retry cleanup', () => {
  it('collapses the historical socket timeout retry pair', () => {
    const result = removeAccidentalRetryDuplicates([
      message('m1', '2026-08-27T21:08:11.000Z'),
      message('m2', '2026-08-27T21:08:23.000Z'),
    ]);
    expect(result.map((item) => item._id)).toEqual(['m1']);
  });
  it('preserves deliberate repeated messages outside the retry window', () => {
    const result = removeAccidentalRetryDuplicates([
      message('m1', '2026-08-27T21:08:11.000Z'),
      message('m2', '2026-08-27T21:09:11.000Z'),
    ]);
    expect(result).toHaveLength(2);
  });
});
