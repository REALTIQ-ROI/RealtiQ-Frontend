import type { ProfileEvidence } from '../services/verificationCaseService';

export const profileEvidenceFor = (records: readonly ProfileEvidence[], profileId: string): ProfileEvidence[] =>
  records.filter((item) => item.profileId === profileId);

/** Returns the latest version token for one profile/purpose/subject tuple, including tombstones. */
export const latestProfileEvidence = (
  records: readonly ProfileEvidence[], profileId: string, purpose: string, subject: string,
): ProfileEvidence | null => records
  .filter((item) => item.profileId === profileId && item.purpose === purpose && item.subject === subject)
  .reduce<ProfileEvidence | null>((latest, item) => {
    if (!latest || item.version > latest.version) return item;
    if (item.version < latest.version) return latest;
    const itemTime = Date.parse(item.createdAt);
    const latestTime = Date.parse(latest.createdAt);
    if (Number.isFinite(itemTime) && Number.isFinite(latestTime) && itemTime !== latestTime) {
      return itemTime > latestTime ? item : latest;
    }
    return item.id.localeCompare(latest.id) > 0 ? item : latest;
  }, null);

export const mergeProfileEvidence = (
  existing: readonly ProfileEvidence[], incoming: readonly ProfileEvidence[],
): ProfileEvidence[] => {
  const byId = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
};
