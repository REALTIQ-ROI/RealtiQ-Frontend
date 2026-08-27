import { describe, expect, it } from 'vitest';
import { mergeMessage } from './RealtimeContext';
import type { MarketplaceMessage } from '../types';
const message = (id: string, createdAt: string, text = id): MarketplaceMessage => ({ _id: id, conversation: 'c1', sender: 'u1', kind: 'user', text, attachments: [], createdAt });
describe('realtime message reconciliation', () => {
  it('deduplicates acknowledgements and message:new by persisted ID', () => {
    const first = message('m1', '2026-08-27T09:00:00Z');
    expect(mergeMessage([first], { ...first, text: 'server-safe' })).toEqual([{ ...first, text: 'server-safe' }]);
  });
  it('orders out-of-order events chronologically', () => {
    expect(mergeMessage([message('m2', '2026-08-27T09:02:00Z')], message('m1', '2026-08-27T09:01:00Z')).map((item) => item._id)).toEqual(['m1', 'm2']);
  });
});
