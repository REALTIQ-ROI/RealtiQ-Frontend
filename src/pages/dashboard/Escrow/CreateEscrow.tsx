import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { propertyService } from '../../../services/propertyService';

export default function CreateEscrow() {
  const { propertyId = '' } = useParams();
  const navigate = useNavigate();
  const { activeProfile } = useAuth();
  const [resolvedPropertyId, setResolvedPropertyId] = useState('');
  const [loading, setLoading] = useState(Boolean(propertyId));
  const [error, setError] = useState('');
  const target = resolvedPropertyId ? `/dashboard/buyer/sale-negotiations/new?propertyId=${encodeURIComponent(resolvedPropertyId)}` : '/dashboard/buyer/sale-negotiations';

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    let current = true;
    setResolvedPropertyId('');
    setLoading(true);
    setError('');
    void propertyService.getPublicProperty(propertyId)
      .then((property) => { if (current) setResolvedPropertyId(property._id); })
      .catch(() => { if (current) setError('This property could not be resolved. Open its current public listing and start the purchase negotiation there.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [propertyId]);

  useEffect(() => {
    if (activeProfile?.kind === 'buyer' && !loading && (!propertyId || resolvedPropertyId)) navigate(target, { replace: true });
  }, [activeProfile?.kind, loading, navigate, propertyId, resolvedPropertyId, target]);

  return <BuyerPortalLayout pageTitle="Agree sale terms" pageSubtitle="Escrow conditions are agreed as part of the current purchase proposal.">
    <section className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Start from a purchase negotiation</h2>
      <p className="mt-2 text-sm text-secondary">Property escrow is created only after the Buyer and Seller agree the sale terms and checkout is confirmed. Set any protected amount and release conditions in the proposal; this page does not create a separate escrow or charge.</p>
      {loading ? <LoadingState label="Loading the current listing…" /> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-error">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={loading || Boolean(propertyId && !resolvedPropertyId)} onClick={() => navigate(target)}>Continue to purchase negotiation</Button><Link className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-bold" to="/dashboard/buyer/escrows">View existing escrows</Link></div>
    </section>
  </BuyerPortalLayout>;
}
