import type { RoiEstimate, RoiHistoryQuery } from '../../types/roiV1';

const details = new Map<string, RoiEstimate>();
const histories = new Map<string, readonly RoiEstimate[]>();
const userKey = (userId: string, reference: string) => `${userId}|${reference}`;
const historyKey = (userId: string, reference: string, query: RoiHistoryQuery) =>
  `${userId}|${reference}|${query.page ?? 1}|${query.limit ?? 20}|${query.asOf ?? ''}`;

export const roiV1Cache = {
  getEstimate: (userId: string, reference: string) => details.get(userKey(userId, reference)),
  setEstimate: (userId: string, roi: RoiEstimate) => details.set(userKey(userId, roi.publicReference), roi),
  deleteEstimate: (userId: string, reference: string) => details.delete(userKey(userId, reference)),
  getHistory: (userId: string, propertyReference: string, query: RoiHistoryQuery) => histories.get(historyKey(userId, propertyReference, query)),
  setHistory: (userId: string, propertyReference: string, query: RoiHistoryQuery, estimates: RoiEstimate[]) => histories.set(historyKey(userId, propertyReference, query), estimates),
  invalidateHistory: (userId: string, propertyReference: string) => {
    const prefix = `${userId}|${propertyReference}|`;
    for (const key of histories.keys()) if (key.startsWith(prefix)) histories.delete(key);
  },
  clear: () => { details.clear(); histories.clear(); },
};

if (typeof window !== 'undefined') window.addEventListener('realtiq:session-changed', roiV1Cache.clear);
