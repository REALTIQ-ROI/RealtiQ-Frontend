import { useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { group07Service, type Group07Trust } from '../../services/group07Service';

type SourceKind = 'escrow' | 'partner_job';

export default function BuyerRelationshipTrust({ buyerProfileId, sourceKind, sourceId, eligibleSource }: {
  buyerProfileId: string;
  sourceKind: SourceKind;
  sourceId: string;
  eligibleSource: boolean;
}) {
  const { activeProfile } = useAuth();
  const scope = `${activeProfile?.id ?? ''}:${buyerProfileId}:${sourceKind}:${sourceId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [trust, setTrust] = useState<Group07Trust | null>(null);
  const [rating, setRating] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setTrust(null);
    setRating('');
    setAlreadyRated(false);
    setError('');
    setNotice('');
  }, [scope]);

  const load = async () => {
    if (!activeProfile?.id || loading) return;
    const requestScope = scope;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await group07Service.trustRelationship(buyerProfileId);
      if (scopeRef.current === requestScope) setTrust(result.trust);
    } catch (raw) {
      if (scopeRef.current === requestScope) setError(raw instanceof Error ? raw.message : 'Buyer relationship details are unavailable.');
    } finally {
      if (scopeRef.current === requestScope) setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!trust || !eligibleSource || alreadyRated || saving || !rating) return;
    const requestScope = scope;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await group07Service.createTrustReview(buyerProfileId, { sourceKind, sourceId, rating: Number(rating) });
      if (scopeRef.current === requestScope) {
        setAlreadyRated(true);
        setNotice(result.changed ? 'Your rating was recorded for this completed relationship.' : 'A rating is already recorded for this relationship.');
      }
    } catch (raw) {
      if (scopeRef.current !== requestScope) return;
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_BUYER_REVIEW_EXISTS') {
        setAlreadyRated(true);
        setNotice('A rating already exists for this relationship and cannot be changed.');
      } else {
        setError(raw instanceof Error ? raw.message : 'Your rating could not be recorded.');
      }
    } finally {
      if (scopeRef.current === requestScope) setSaving(false);
    }
  };

  return <section className="mt-4 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Buyer relationship trust</h3><p className="mt-1 text-xs text-secondary">Private to this on-platform relationship. A rating can be submitted only for this completed {sourceKind === 'escrow' ? 'purchase' : 'service job'}.</p></div><button type="button" disabled={loading || !activeProfile?.id} onClick={() => void load()} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">{loading ? 'Loading…' : trust ? 'Refresh relationship' : 'View relationship'}</button></div>
    {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm">{notice}</p> : null}
    {trust ? <div className="mt-3 rounded-lg bg-white p-3"><p className="text-sm">{trust.state === 'established' && trust.score !== null ? `Current relationship trust: ${trust.score}/100${trust.tier ? ` · ${trust.tier}` : ''}` : trust.state === 'new' ? 'New buyer profile — building history.' : 'Relationship trust is currently unavailable.'}</p>{trust.rating?.average !== null && trust.rating?.average !== undefined ? <p className="mt-1 text-xs text-secondary">Private relationship rating: {trust.rating.average.toFixed(1)}/5 from {trust.rating.qualifyingReviewCount} qualifying reviews.</p> : null}
      {eligibleSource && !alreadyRated ? <div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Rate this relationship<select value={rating} onChange={(event) => setRating(event.target.value)} className="mt-1 block rounded-lg border p-2"><option value="">Choose 1–5</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button type="button" disabled={!rating || saving} onClick={() => void submitRating()} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">{saving ? 'Saving…' : 'Submit rating'}</button><span className="text-xs text-secondary">This rating is private and cannot be changed after submission.</span></div> : null}
    </div> : null}
  </section>;
}
