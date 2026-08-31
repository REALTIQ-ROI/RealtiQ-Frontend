/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/PublicLayout';
import { RoiEstimateView } from '../../../components/roiV1/RoiEstimateView';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { roiV1Cache } from '../../../features/roiV1/cache';
import { ApiRequestError } from '../../../lib/axios';
import { roiV1Service } from '../../../services/roiV1Service';
import type { RoiEstimate } from '../../../types/roiV1';

const RoiV1DetailPage = () => {
  const { estimateReference = '' } = useParams();
  const { user } = useAuth();
  const [roi, setRoi] = useState<RoiEstimate | null>(() => user ? roiV1Cache.getEstimate(user._id, estimateReference) ?? null : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!roi);
  useEffect(() => {
    if (!user || !/^RTQ-ROI-[A-Za-z0-9-]+$/.test(estimateReference)) { setError('Estimate not found.'); setLoading(false); return; }
    const controller = new AbortController();
    if (!roi) roiV1Service.getEstimate(estimateReference, controller.signal).then(({ roi: next }) => { if (!controller.signal.aborted) { roiV1Cache.setEstimate(user._id, next); setRoi(next); } }).catch((e) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiRequestError && e.status === 403) roiV1Cache.deleteEstimate(user._id, estimateReference);
      setError(e instanceof ApiRequestError && e.status === 403 ? 'You do not have access to this estimate.' : e instanceof ApiRequestError && e.status === 404 ? 'Estimate not found.' : e instanceof Error ? e.message : 'Unable to load estimate.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [estimateReference, user?._id]);
  return <PublicLayout><main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">{loading ? <LoadingState label="Loading evidence-backed estimateâ€¦"/> : error ? <div role="alert" className="rounded-lg border p-5"><h1 className="text-2xl font-bold">Estimate unavailable</h1><p>{error}</p></div> : roi ? <RoiEstimateView roi={roi}/> : null}</main></PublicLayout>;
};
export default RoiV1DetailPage;

