import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../components/auth/StepUpDialog';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { RULE_TYPES } from '../../components/escrow/escrowConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { paymentService } from '../../services/paymentService';
import { projectService } from '../../services/projectService';
import { propertyService } from '../../services/propertyService';
import {
  saleNegotiationService,
  type SaleEscrowCondition,
  type SaleNegotiation,
  type SalePaymentType,
  type SaleProposalItem,
  type SaleProposalTerms,
  type SaleReceipt,
} from '../../services/saleNegotiationService';
import type { Property } from '../../types';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

const BUNDLE_CLAUSE = 'seller_fault_discount_preserved_buyer_withdrawal_may_reprice';
const statesThatBlockCheckout = new Set(['reserved', 'initializing', 'outcome_unknown', 'initialized', 'paid', 'reversed_held']);
const money = (minor: number | undefined, currency = 'NGN') => typeof minor === 'number' && Number.isFinite(minor)
  ? new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100)
  : 'Amount not returned';
const displayStatus = (value?: string) => value ? value.replaceAll('_', ' ') : 'Not available';
const permissionSet = (permissions: unknown) => new Set(Array.isArray(permissions) ? permissions.filter((item): item is string => typeof item === 'string') : []);
const termsVersionId = (terms: SaleNegotiation['currentTermsVersion']) => {
  if (!terms) return '';
  return terms.id ?? terms.versionId ?? terms.termsVersionId ?? (typeof terms.version === 'string' ? terms.version : '');
};
const majorToMinor = (value: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : null;
};
const randomOperationKey = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const propertyTitle = (property?: Property) => property?.title?.trim() || property?.publicReference || 'Selected property';
const currencyOf = (property?: Property) => typeof property?.currency === 'string' && property.currency ? property.currency : '';
const paymentOptionsFor = (property?: Property): SalePaymentType[] => {
  const raw = property?.paymentTypes ?? [];
  const normalized = new Set(raw.map((item) => String(item).toLowerCase().replaceAll(/[^a-z]/g, '')));
  const options: SalePaymentType[] = [];
  if (normalized.has('outright') || normalized.has('outrightpurchase')) options.push('Outright Purchase');
  if (normalized.has('installment') || normalized.has('installmentplan')) options.push('Instalment Plan');
  // Mortgage Accepted remains unavailable until the backend's lender gate is active.
  return options;
};

interface ScheduleDraft { id: string; amount: string; dueAt: string }
interface ConditionDraft {
  id: string;
  type: string;
  description: string;
  required: '' | 'true' | 'false';
  scope: '' | SaleEscrowCondition['scope'];
  sharedMilestoneKey: string;
}
interface TermsDraft {
  price: string;
  paymentType: SalePaymentType | '';
  initialPayment: string;
  feePayer: '' | 'buyer' | 'seller' | 'split';
  buyerSharePercent: string;
  schedule: ScheduleDraft[];
  escrowAmount: string;
  conditions: ConditionDraft[];
  optionalTerms: { refundTerms: string; cancellationTerms: string; latePaymentTerms: string; defaultTerms: string };
}
const blankTerms = (property?: Property): TermsDraft => ({
  price: typeof property?.price === 'number' ? String(property.price) : '',
  paymentType: '',
  initialPayment: '',
  feePayer: '',
  buyerSharePercent: '',
  schedule: [],
  escrowAmount: '',
  conditions: [],
  optionalTerms: { refundTerms: '', cancellationTerms: '', latePaymentTerms: '', defaultTerms: '' },
});

const SaleNegotiationsContent = () => {
  const { id } = useParams<{ id?: string }>();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const { activeProfile } = useAuth();
  const permissions = permissionSet(activeProfile?.permissions);
  const canRead = permissions.has('negotiation.read');
  const canPropose = permissions.has('negotiation.propose');
  const canAcceptTerms = permissions.has('terms.accept');
  const canPay = permissions.has('payment.initiate');
  const isBuyer = activeProfile?.kind === 'buyer';
  const isSeller = activeProfile?.kind === 'owner' || activeProfile?.kind === 'agency' || activeProfile?.kind === 'developer';
  const isNew = id === 'new';
  const root = isBuyer ? '/dashboard/buyer/sale-negotiations' : '/dashboard/landlord/sale-negotiations';
  const stepUp = useBoundStepUp<unknown>();

  const [negotiations, setNegotiations] = useState<SaleNegotiation[]>([]);
  const [pageInfo, setPageInfo] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const [negotiation, setNegotiation] = useState<SaleNegotiation | null>(null);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [sellerProperties, setSellerProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [receipts, setReceipts] = useState<SaleReceipt[]>([]);
  const [receiptError, setReceiptError] = useState('');
  const [checkout, setCheckout] = useState<Awaited<ReturnType<typeof saleNegotiationService.getCheckout>>>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [allocationSelections, setAllocationSelections] = useState<Record<string, string[]>>({});
  const [termsDrafts, setTermsDrafts] = useState<Record<string, TermsDraft>>({});
  const [project, setProject] = useState<{ id: string; name: string; types: Array<{ id: string; label: string }> } | null>(null);
  const [projectQuantities, setProjectQuantities] = useState<Record<string, string>>({});

  const requestedPropertyIds = useMemo(() => {
    const ids = [...query.getAll('propertyIds'), ...query.getAll('propertyId')].flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
    return [...new Set(ids)];
  }, [query]);
  const projectId = query.get('projectId') ?? '';

  useEffect(() => {
    if (!isNew || projectId || !requestedPropertyIds.length) { if (!isNew || projectId) setPropertyMap({}); return; }
    let current = true;
    void Promise.allSettled(requestedPropertyIds.map((propertyId) => propertyService.getPublicProperty(propertyId)))
      .then((resolved) => {
        if (current) setPropertyMap(Object.fromEntries(resolved.flatMap((result, index) => result.status === 'fulfilled' ? [[requestedPropertyIds[index], result.value]] : [])));
      });
    return () => { current = false; };
  }, [isNew, projectId, requestedPropertyIds]);

  const loadDetail = useCallback(async (negotiationId: string) => {
    setLoading(true);
    setError('');
    try {
      const [detail, checkoutResult, receiptResult] = await Promise.all([
        saleNegotiationService.get(negotiationId),
        saleNegotiationService.getCheckout(negotiationId),
        saleNegotiationService.getReceipts(negotiationId)
          .then((value) => ({ value, error: '' }))
          .catch((raw) => ({ value: [] as SaleReceipt[], error: apiErrorMessage(raw, 'Unable to load purchase receipts.') })),
      ]);
      setNegotiation(detail);
      setCheckout(checkoutResult);
      setReceipts(receiptResult.value);
      setReceiptError(receiptResult.error);
      if (detail.propertyIds.length) {
        const resolved = await Promise.allSettled(detail.propertyIds.map((propertyId) => propertyService.getPublicProperty(propertyId)));
        setPropertyMap(Object.fromEntries(resolved.flatMap((result, index) => result.status === 'fulfilled' ? [[detail.propertyIds[index], result.value]] : [])));
      } else setPropertyMap({});
    } catch (raw) {
      setError(apiErrorMessage(raw, 'Unable to load this purchase negotiation.'));
      setNegotiation(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setNegotiation(null); setPropertyMap({}); setSellerProperties([]); setCheckout(null); setReceipts([]); setReceiptError(''); setError('');
    if (!activeProfile?.id || !canRead || isNew || !id) return;
    void loadDetail(id);
  }, [activeProfile?.id, canRead, id, isNew, loadDetail, refreshKey]);

  useEffect(() => {
    setNegotiations([]); setPageInfo({ hasMore: false, nextCursor: null });
    if (!activeProfile?.id || !canRead || id || isNew) return;
    setLoading(true); setError('');
    void saleNegotiationService.list({ limit: 25 })
      .then((result) => { setNegotiations(result.negotiations ?? []); setPageInfo(result.pageInfo ?? { hasMore: false, nextCursor: null }); })
      .catch((raw) => setError(apiErrorMessage(raw, 'Unable to load purchase negotiations.')))
      .finally(() => setLoading(false));
  }, [activeProfile?.id, canRead, id, isNew, refreshKey]);

  useEffect(() => {
    if (!isNew || !projectId) { setProject(null); return; }
    let current = true;
    setLoading(true); setError('');
    void projectService.getProject(projectId)
      .then(({ project: result }) => {
        if (!current) return;
        const types = (result.unitTypes ?? []).map((unitType) => {
          const fields = unitType.effectiveFields ?? unitType.canonicalFields ?? {};
          const name = [fields.propertyType, fields.unitTypeName, fields.bedrooms ? `${fields.bedrooms} bedroom` : null].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
          return { id: unitType.id, label: name || 'Project unit type' };
        });
        setProject({ id: result._id, name: result.name, types });
      })
      .catch((raw) => { if (current) setError(apiErrorMessage(raw, 'Unable to load the current project unit choices.')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [isNew, projectId, refreshKey]);

  useEffect(() => {
    if (!negotiation || negotiation.status !== 'awaiting_seller_allocation' || activeProfile?.id !== negotiation.sellerProfileId || !canPropose) { setSellerProperties([]); return; }
    let current = true;
    setLoadingProperties(true);
    void (async () => {
      const first = await propertyService.getMyProperties(1, 100);
      const pages = Math.max(1, Math.ceil((first.total ?? first.properties.length) / 100));
      const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => propertyService.getMyProperties(index + 2, 100)));
      if (current) setSellerProperties([first, ...rest].flatMap((page) => page.properties));
    })().catch((raw) => { if (current) setError(apiErrorMessage(raw, 'Unable to load the seller’s current inventory for allocation.')); })
      .finally(() => { if (current) setLoadingProperties(false); });
    return () => { current = false; };
  }, [activeProfile?.id, canPropose, negotiation]);

  useEffect(() => {
    if (!negotiation) return;
    setTermsDrafts((current) => {
      const next = { ...current };
      negotiation.propertyIds.forEach((propertyId) => {
        const property = propertyMap[propertyId];
        if (!next[propertyId]) next[propertyId] = blankTerms(property);
        else if (!next[propertyId].price && property?.price !== undefined) next[propertyId] = { ...next[propertyId], price: String(property.price) };
      });
      return next;
    });
  }, [negotiation, propertyMap]);

  const reload = () => setRefreshKey((value) => value + 1);
  const beginProtected = <B extends object>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body: B, label: string, execute: (challengeId: string, exactBody: B) => Promise<unknown>) =>
    stepUp.begin({ method, path, body, label, execute });
  const completeStepUp = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok && result.error) toast.error(result.error);
    if (result.ok && id && !isNew) {
      setBusy(false);
      reload();
    }
    return result.ok;
  };

  const startNegotiation = async (event: FormEvent) => {
    event.preventDefault();
    if (!isBuyer || !canPropose || busy) return;
    let body: Parameters<typeof saleNegotiationService.create>[0];
    if (projectId) {
      const quantities = Object.entries(projectQuantities).flatMap(([unitTypeId, raw]) => {
        const quantity = Number(raw);
        return Number.isSafeInteger(quantity) && quantity > 0 ? [{ unitTypeId, quantity }] : [];
      });
      if (!project || !quantities.length || quantities.some(({ unitTypeId }) => !project.types.some((item) => item.id === unitTypeId))) {
        setError('Choose at least one current project unit type and enter a positive whole-number quantity.'); return;
      }
      if (quantities.reduce((sum, item) => sum + item.quantity, 0) > 100) { setError('A negotiation can include up to 100 units.'); return; }
      body = { projectId: project.id, unitTypeQuantities: quantities };
    } else {
      if (!requestedPropertyIds.length || requestedPropertyIds.length > 100) { setError('Select between 1 and 100 properties from current listings.'); return; }
      body = { propertyIds: requestedPropertyIds };
    }
    setBusy(true); setError('');
    try {
      const created = await saleNegotiationService.create(body);
      toast.success('Purchase negotiation started. No unit is reserved until both parties agree to terms.');
      navigate(`${root}/${encodeURIComponent(created.id)}`, { replace: true });
    } catch (raw) { setError(apiErrorMessage(raw, 'Unable to start this negotiation.')); }
    finally { setBusy(false); }
  };

  const updateTermsDraft = (propertyId: string, patch: Partial<TermsDraft>) => setTermsDrafts((current) => ({ ...current, [propertyId]: { ...(current[propertyId] ?? blankTerms(propertyMap[propertyId])), ...patch } }));
  const buildProposalItems = (): SaleProposalItem[] | null => {
    if (!negotiation) return null;
    const built: SaleProposalItem[] = [];
    for (const propertyId of negotiation.propertyIds) {
      const property = propertyMap[propertyId];
      const draft = termsDrafts[propertyId] ?? blankTerms(property);
      const currency = currencyOf(property);
      const priceMinor = majorToMinor(draft.price);
      if (!property || !currency || priceMinor === null || !draft.paymentType || !paymentOptionsFor(property).includes(draft.paymentType) || !draft.feePayer) {
        setError(`Complete the current price, currency, supported payment type and fee-payer terms for ${propertyTitle(property)}.`); return null;
      }
      if (draft.feePayer === 'split' && (draft.buyerSharePercent.trim() === '' || !Number.isFinite(Number(draft.buyerSharePercent)) || Number(draft.buyerSharePercent) < 0 || Number(draft.buyerSharePercent) > 100 || Math.round(Number(draft.buyerSharePercent) * 100) !== Number(draft.buyerSharePercent) * 100)) {
        setError(`Enter a buyer fee share from 0 to 100 with at most two decimal places for ${propertyTitle(property)}.`); return null;
      }
      const initialPaymentMinor = draft.paymentType === 'Outright Purchase' ? priceMinor : majorToMinor(draft.initialPayment);
      if (initialPaymentMinor === null || initialPaymentMinor > priceMinor) { setError(`Enter a valid initial payment up to the agreed price for ${propertyTitle(property)}.`); return null; }
      const schedule = draft.paymentType === 'Instalment Plan' ? draft.schedule.map((row) => ({ amountMinor: majorToMinor(row.amount), dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : '' })) : [];
      if (draft.paymentType === 'Instalment Plan') {
        if (!schedule.length || schedule.length > 120 || schedule.some((row) => row.amountMinor === null || row.amountMinor <= 0 || !row.dueAt)) { setError(`Enter 1–120 positive instalment amounts and due dates for ${propertyTitle(property)}.`); return null; }
        if (schedule.reduce((sum, row) => sum + (row.amountMinor ?? 0), 0) !== priceMinor - initialPaymentMinor) { setError(`The instalment schedule must cover the balance after the initial payment for ${propertyTitle(property)}.`); return null; }
        if (schedule.some((row, index) => index > 0 && Date.parse(row.dueAt) <= Date.parse(schedule[index - 1].dueAt))) { setError(`Instalment due dates must be strictly increasing for ${propertyTitle(property)}.`); return null; }
      }
      const conditions: SaleEscrowCondition[] = [];
      if (draft.conditions.length) {
        const escrowAmountMinor = majorToMinor(draft.escrowAmount);
        if (escrowAmountMinor === null || escrowAmountMinor <= 0) { setError(`Enter the protected amount for ${propertyTitle(property)}.`); return null; }
        for (const condition of draft.conditions) {
          if (!RULE_TYPES.some((item) => item.value === condition.type) || !condition.description.trim() || condition.required === '' || condition.scope === '' || (condition.scope === 'shared_milestone' && !condition.sharedMilestoneKey.trim())) {
            setError(`Complete every escrow condition’s type, description, required status and scope for ${propertyTitle(property)}.`); return null;
          }
          conditions.push({ type: condition.type, description: condition.description.trim(), required: condition.required === 'true', scope: condition.scope, visibleToProfiles: [negotiation.buyerProfileId, negotiation.sellerProfileId], ...(condition.scope === 'shared_milestone' ? { sharedMilestoneKey: condition.sharedMilestoneKey.trim() } : {}) });
        }
      }
      const optionalTerms: Partial<Pick<SaleProposalTerms, 'refundTerms' | 'cancellationTerms' | 'latePaymentTerms' | 'defaultTerms'>> = {
        ...(draft.optionalTerms.refundTerms.trim() ? { refundTerms: draft.optionalTerms.refundTerms.trim() } : {}),
        ...(draft.optionalTerms.cancellationTerms.trim() ? { cancellationTerms: draft.optionalTerms.cancellationTerms.trim() } : {}),
        ...(draft.optionalTerms.latePaymentTerms.trim() ? { latePaymentTerms: draft.optionalTerms.latePaymentTerms.trim() } : {}),
        ...(draft.optionalTerms.defaultTerms.trim() ? { defaultTerms: draft.optionalTerms.defaultTerms.trim() } : {}),
      };
      const terms: SaleProposalTerms = {
        priceMinor,
        currency,
        paymentType: draft.paymentType,
        initialPaymentMinor,
        ...(draft.paymentType === 'Instalment Plan' ? { schedule: schedule.map((row) => ({ amountMinor: row.amountMinor!, dueAt: row.dueAt })) } : { schedule: [] }),
        ...(conditions.length ? { escrowAmountMinor: majorToMinor(draft.escrowAmount)!, escrowConditions: conditions } : {}),
        feePayer: draft.feePayer,
        ...(draft.feePayer === 'split' ? { buyerSharePercent: Number(draft.buyerSharePercent) } : {}),
        ...optionalTerms,
      };
      built.push({ propertyId, terms });
    }
    if (new Set(built.map((item) => item.terms.currency)).size !== 1) { setError('All selected properties must use the same currency for one negotiation.'); return null; }
    return built;
  };

  const submitProposal = (event: FormEvent) => {
    event.preventDefault();
    if (!negotiation || !canPropose || busy) return;
    const items = buildProposalItems();
    if (!items) return;
    setError('');
    const body = { expectedVersion: negotiation.version, ...(items.length > 1 ? { bundleDiscountClause: BUNDLE_CLAUSE } : {}), items };
    void beginProtected('POST', `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/proposals`, body, 'Submit purchase proposal or counteroffer', async (challengeId, exactBody) => {
      setBusy(true);
      try {
        const result = await saleNegotiationService.propose(negotiation.id, exactBody, challengeId);
        setNegotiation(result); toast.success('Proposal submitted. The other party must respond to this current version.'); return result;
      } catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) reload(); setError(apiErrorMessage(raw, 'Unable to submit the proposal.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const acceptProposal = () => {
    if (!negotiation?.currentProposal || !canAcceptTerms || busy) return;
    const body = { expectedVersion: negotiation.version, proposalId: negotiation.currentProposal.id };
    void beginProtected('POST', `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/proposals/accept`, body, 'Accept the current purchase proposal', async (challengeId, exactBody) => {
      setBusy(true);
      try { const result = await saleNegotiationService.accept(negotiation.id, exactBody, challengeId); setNegotiation(result); toast.success(result.status === 'terms_agreed' ? 'Both parties accepted. Terms Agreed is now recorded by the server.' : 'Your acceptance is recorded for this proposal.'); return result; }
      catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) reload(); setError(apiErrorMessage(raw, 'Unable to accept this proposal.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const rejectProposal = (event: FormEvent) => {
    event.preventDefault();
    if (!negotiation?.currentProposal || !canPropose || !rejectReason.trim() || busy) return;
    const body = { expectedVersion: negotiation.version, proposalId: negotiation.currentProposal.id, reason: rejectReason.trim() };
    void beginProtected('POST', `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/proposals/reject`, body, 'Reject the current proposal', async (challengeId, exactBody) => {
      setBusy(true);
      try { const result = await saleNegotiationService.reject(negotiation.id, exactBody, challengeId); setNegotiation(result); setRejectReason(''); toast.success('Proposal rejected. A new proposal can be submitted with the current version.'); return result; }
      catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) reload(); setError(apiErrorMessage(raw, 'Unable to reject this proposal.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const loadMore = async () => {
    if (!pageInfo.nextCursor || loading) return;
    setLoading(true);
    try { const result = await saleNegotiationService.list({ limit: 25, after: pageInfo.nextCursor }); setNegotiations((current) => [...current, ...result.negotiations]); setPageInfo(result.pageInfo); }
    catch (raw) { setError(apiErrorMessage(raw, 'Unable to load more negotiations.')); }
    finally { setLoading(false); }
  };

  const initiateCheckout = () => {
    if (!negotiation || !negotiation.currentTermsVersion || !canPay || !isBuyer || busy || !termsVersionId(negotiation.currentTermsVersion)) return;
    if (checkout && statesThatBlockCheckout.has(checkout.state)) { setPaymentMessage('A checkout already exists for these agreed terms. Check its current payment reference before taking another action.'); return; }
    if (negotiation.currentTermsVersion.items?.some((item) => item.terms.currency !== 'NGN')) { setPaymentMessage('Checkout for this currency is not currently available. The agreed terms are preserved; do not change the currency to retry.'); return; }
    const versionId = termsVersionId(negotiation.currentTermsVersion);
    const storageKey = `realtiq.saleCheckoutKey:${activeProfile?.id}:${negotiation.id}:${versionId}`;
    const idempotencyKey = sessionStorage.getItem(storageKey) ?? randomOperationKey('sale-checkout');
    sessionStorage.setItem(storageKey, idempotencyKey);
    const body = { idempotencyKey };
    const path = `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/terms/${encodeURIComponent(versionId)}/checkout`;
    setPaymentMessage('');
    void beginProtected('POST', path, body, 'Initialize payment for the current agreed terms', async (challengeId, exactBody) => {
      setBusy(true);
      try {
        const result = await saleNegotiationService.checkout(negotiation.id, versionId, exactBody, challengeId);
        const currentCheckout = result.checkout ?? await saleNegotiationService.getCheckout(negotiation.id);
        if (currentCheckout) {
          setCheckout(currentCheckout);
          paymentService.persistPaymentReference(currentCheckout.reference, undefined, `sale:${activeProfile?.id}:${negotiation.id}:${versionId}`);
          if (currentCheckout.state === 'initialized' && currentCheckout.redirectUrl) paymentService.redirectToCheckout({ redirectUrl: currentCheckout.redirectUrl, reference: currentCheckout.reference }, undefined, `sale:${activeProfile?.id}:${negotiation.id}:${versionId}`);
          else setPaymentMessage(`Checkout status: ${displayStatus(currentCheckout.state)}. Check this same payment reference before taking another action.`);
        } else {
          if (result.reference) paymentService.persistPaymentReference(result.reference, undefined, `sale:${activeProfile?.id}:${negotiation.id}:${versionId}`);
          setPaymentMessage(result.reconciliationRequired ? 'The checkout outcome is unresolved. Keep the same reference and refresh checkout status; do not start another payment.' : 'The server accepted the checkout request but has not returned a checkout record yet. Refresh this negotiation before acting again.');
        }
        reload(); return result;
      } catch (raw) { if (raw instanceof ApiRequestError && raw.reference) paymentService.persistPaymentReference(raw.reference, undefined, `sale:${activeProfile?.id}:${negotiation.id}:${versionId}`); setPaymentMessage(apiErrorMessage(raw, 'The checkout result is not confirmed. Refresh this negotiation and check the same reference.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const checkPayment = async () => {
    if (!negotiation || !checkout?.reference || busy) return;
    setBusy(true); setPaymentMessage('');
    try {
      const result = await paymentService.verifyPayment(checkout.reference);
      const status = result.verified ? result.payment.status : result.status;
      setPaymentMessage(status === 'reversed'
        ? 'The provider reports a reversal. This purchase is held for reconciliation; ownership and receipts are not complete.'
        : status === 'pending'
          ? 'The payment is still pending. Keep this reference and check again later; do not start another charge.'
          : status === 'failed' || status === 'canceled'
            ? `The server reports ${status}. Refresh the negotiation before considering any new action.`
            : result.verified
              ? 'Payment is confirmed by the server. Legal ownership still requires the separate signed handover flow.'
              : `Payment status: ${displayStatus(status)}. The server has not confirmed fulfillment.`);
      await loadDetail(negotiation.id);
    } catch (raw) { setPaymentMessage(apiErrorMessage(raw, 'Unable to verify this payment reference.')); }
    finally { setBusy(false); }
  };

  const dropUnit = (propertyId: string) => {
    if (!negotiation || !canPropose || busy || !dropReason.trim()) return;
    const body = { expectedVersion: negotiation.version, propertyId, operationKey: randomOperationKey('unit-drop'), reason: dropReason.trim() };
    void beginProtected('POST', `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/unit-drops`, body, 'Request a change to this purchased unit', async (challengeId, exactBody) => {
      setBusy(true);
      try { const result = await saleNegotiationService.dropUnit(negotiation.id, exactBody, challengeId); const state = typeof result.state === 'string' ? result.state : 'requested'; setPaymentMessage(`Unit change status: ${displayStatus(state)}. Any refund remains pending until the provider confirms it.`); setDropReason(''); reload(); return result; }
      catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) reload(); setError(apiErrorMessage(raw, 'Unable to submit the unit change.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const allocateUnits = (event: FormEvent) => {
    event.preventDefault();
    if (!negotiation || !canPropose || busy) return;
    const requested = negotiation.requestedUnitTypes ?? [];
    const allocations = requested.map((item) => ({ unitTypeId: item.unitTypeId, propertyIds: allocationSelections[item.unitTypeId] ?? [] }));
    if (allocations.some((allocation, index) => allocation.propertyIds.length !== requested[index].quantity) || new Set(allocations.flatMap((item) => item.propertyIds)).size !== allocations.reduce((sum, item) => sum + item.propertyIds.length, 0)) { setError('Select exactly the requested number of distinct currently available units for each type.'); return; }
    const body = { expectedVersion: negotiation.version, allocations };
    void beginProtected('POST', `/api/sale-negotiations/${encodeURIComponent(negotiation.id)}/allocations`, body, 'Allocate the requested project units', async (challengeId, exactBody) => {
      setBusy(true);
      try { const result = await saleNegotiationService.allocate(negotiation.id, exactBody, challengeId); setNegotiation(result); toast.success('The server accepted the unit allocation.'); return result; }
      catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) reload(); setError(apiErrorMessage(raw, 'Unable to allocate these units.')); throw raw; }
      finally { setBusy(false); }
    });
  };

  const requestPropertyLabel = (propertyId: string) => propertyTitle(propertyMap[propertyId]);
  const proposalAlreadyAccepted = Boolean(negotiation?.currentProposal?.acceptances.some((item) => typeof item === 'string' ? item === activeProfile?.id : item.profileId === activeProfile?.id || item.acceptedByProfileId === activeProfile?.id));
  const canDropBeforeCheckout = Boolean(negotiation && !checkout && negotiation.status !== 'completed' && negotiation.status !== 'cancelled' && negotiation.propertyIds.length > 1);
  const canDropAfterPayment = Boolean(checkout && checkout.state === 'paid');
  const shell = (children: ReactNode) => isBuyer
    ? <BuyerPortalLayout pageEyebrow="Buyer Portal" pageTitle="Purchase negotiations" pageSubtitle="Agree purchase terms with the seller before checkout. A negotiation does not reserve a property.">{children}<StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeStepUp} /></BuyerPortalLayout>
    : <LandlordPortalLayout active="sale-negotiations" title="Sale negotiations">{children}<StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeStepUp} /></LandlordPortalLayout>;

  if (!isBuyer && !isSeller) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">Purchase negotiations</h1><p className="mt-3 text-sm text-secondary">Select a Buyer or Seller profile to view this workspace.</p></div>;
  if (!canRead) return shell(<div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">The current profile does not report <code>negotiation.read</code>. The server controls access to purchase negotiations. <Button className="mt-3" variant="secondary" onClick={reload}>Refresh access and page</Button></div>);

  if (isNew && !isBuyer) return shell(<main className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-black">Purchase negotiations</h1><p className="mt-2 text-sm text-amber-950">Buyers start negotiations from a published property or project. This Seller profile can review and respond to negotiations already sent to it.</p><Link className="mt-4 inline-flex font-bold text-primary underline" to={root}>View negotiations</Link></main>);

  if (isNew) return shell(<main className="mx-auto max-w-4xl space-y-5">
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
    {loading ? <LoadingState label="Loading current project choices…" /> : null}
    {projectId ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Select project units</h2><p className="mt-1 text-sm text-secondary">Choose the unit types and quantities you would like to discuss. The seller will allocate exact available units. This does not reserve them.</p><p className="mt-3 font-bold">{project?.name ?? 'Project'}</p>{project?.types.length ? <form className="mt-4 space-y-3" onSubmit={(event) => void startNegotiation(event)}>{project.types.map((item) => <label key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3"><span>{item.label}</span><input type="number" min="0" max="100" inputMode="numeric" aria-label={`Quantity for ${item.label}`} className="w-24 rounded border px-3 py-2" value={projectQuantities[item.id] ?? ''} onChange={(event) => setProjectQuantities((current) => ({ ...current, [item.id]: event.target.value }))} /></label>)}<Button type="submit" disabled={busy || !canPropose}>{busy ? 'Starting…' : 'Start negotiation'}</Button></form> : <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The public project response did not provide a current unit-type list. No type IDs or quantities can be guessed. Open a published unit and start from its listing instead.</p>}</section> : requestedPropertyIds.length ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Start a purchase negotiation</h2><p className="mt-1 text-sm text-secondary">The selected listing(s) will be sent to the server. Starting a negotiation does not reserve units; proposals and both parties’ acceptance establish Terms Agreed.</p><ul className="my-4 space-y-2">{requestedPropertyIds.map((propertyId) => <li key={propertyId} className="rounded-lg bg-slate-50 p-3 text-sm">Selected listing {propertyMap[propertyId] ? `· ${propertyTitle(propertyMap[propertyId])}` : ''}</li>)}</ul><form onSubmit={(event) => void startNegotiation(event)}><Button type="submit" disabled={busy || !canPropose}>{busy ? 'Starting…' : 'Start negotiation'}</Button></form></section> : <section className="rounded-2xl border border-dashed p-8 text-center"><h2 className="text-xl font-black">Choose a listing or project first</h2><p className="mt-2 text-sm text-secondary">Open a published property or project, then select the action to start a purchase negotiation.</p><Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 font-bold text-white" to="/properties">Browse properties</Link></section>}
  </main>);

  if (!id) return shell(<main className="mx-auto max-w-5xl space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black">Purchase negotiations</h1><p className="mt-1 text-sm text-secondary">Proposals, agreed terms, checkout and receipts for your current profile.</p></div><Button type="button" variant="secondary" onClick={reload}>Refresh</Button></header>
    {error ? <ErrorState message={error} onRetry={reload} /> : null}
    {loading ? <LoadingState label="Loading negotiations…" /> : null}
    {!loading && !error && negotiations.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-secondary">No purchase negotiations are recorded for this profile.</div> : null}
    <div className="space-y-3">{negotiations.map((item) => <Link key={item.id} to={`${root}/${encodeURIComponent(item.id)}`} className="block rounded-xl border bg-white p-4 shadow-sm hover:border-primary"><div className="flex flex-wrap items-center justify-between gap-3"><strong>{item.propertyIds.length ? `${item.propertyIds.length} selected ${item.propertyIds.length === 1 ? 'property' : 'properties'}` : 'Project unit request'}</strong><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{displayStatus(item.status)}</span></div><p className="mt-2 text-sm text-secondary">{item.currentProposal ? `Proposal revision ${item.currentProposal.revision} · ${item.currentProposal.state}` : 'No current proposal'} · Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB') : 'date not returned'}</p></Link>)}</div>
    {pageInfo.hasMore ? <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadMore()}>Load more</Button> : null}
  </main>);

  return shell(<main className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link className="font-bold text-primary hover:underline" to={root}>← All negotiations</Link><Button type="button" variant="secondary" onClick={reload} disabled={loading}>Refresh current server state</Button></div>
    {error ? <ErrorState message={error} onRetry={reload} /> : null}
    {loading && !negotiation ? <LoadingState label="Loading negotiation detail…" /> : null}
    {negotiation ? <>
      <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Purchase negotiation</p><h1 className="mt-1 text-2xl font-black">{negotiation.propertyIds.length ? `${negotiation.propertyIds.length} selected ${negotiation.propertyIds.length === 1 ? 'property' : 'properties'}` : 'Project unit request'}</h1></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold capitalize">{displayStatus(negotiation.status)}</span></div><p className="mt-3 text-sm text-secondary">Version {negotiation.version} · Created {negotiation.createdAt ? new Date(negotiation.createdAt).toLocaleDateString('en-GB') : 'date not returned'}</p><p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-950">A proposal does not reserve a property. The server records Terms Agreed only after the Buyer and Seller accept the same current proposal. Checkout is a separate step.</p>
        {negotiation.propertyIds.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{negotiation.propertyIds.map((propertyId) => <li key={propertyId} className="rounded-lg border p-3"><strong>{requestPropertyLabel(propertyId)}</strong><p className="mt-1 text-xs text-secondary">{propertyMap[propertyId]?.publicReference ?? 'Listing reference not available'}</p></li>)}</ul> : negotiation.requestedUnitTypes?.length ? <ul className="mt-4 space-y-2">{negotiation.requestedUnitTypes.map((unitType, index) => <li key={`${unitType.unitTypeId}-${index}`} className="rounded-lg border p-3">Requested project unit type · quantity {unitType.quantity}</li>)}</ul> : null}</section>

      {negotiation.status === 'awaiting_seller_allocation' && activeProfile?.id === negotiation.sellerProfileId ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Allocate available units</h2><p className="mt-1 text-sm text-secondary">Select exactly the requested quantity from your current published, available inventory. The server checks availability and ownership again.</p>{loadingProperties ? <LoadingState label="Loading current seller inventory…" /> : null}{error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}<form className="mt-4 space-y-4" onSubmit={(event) => void allocateUnits(event)}>{(negotiation.requestedUnitTypes ?? []).map((requested) => { const candidates = sellerProperties.filter((property) => property.status === 'available' && property.project?._id === negotiation.projectId && property.canonicalUnitTypeId === requested.unitTypeId); const selectedIds = allocationSelections[requested.unitTypeId] ?? []; return <fieldset key={requested.unitTypeId} className="rounded-lg border p-3"><legend className="px-1 font-bold">Unit type request · {requested.quantity} unit(s)</legend><p className="mb-2 text-xs text-secondary">Select {requested.quantity} distinct available unit(s).</p><div className="grid gap-2 sm:grid-cols-2">{candidates.map((property) => <label key={property._id} className="flex items-center gap-2 rounded bg-slate-50 p-2 text-sm"><input type="checkbox" checked={selectedIds.includes(property._id)} disabled={!selectedIds.includes(property._id) && selectedIds.length >= requested.quantity} onChange={(event) => setAllocationSelections((current) => ({ ...current, [requested.unitTypeId]: event.target.checked ? [...selectedIds, property._id] : selectedIds.filter((value) => value !== property._id) }))} /><span>{propertyTitle(property)}{property.publicReference ? ` · ${property.publicReference}` : ''}</span></label>)}</div>{!candidates.length ? <p className="text-sm text-amber-800">No matching available units were returned. Refresh inventory before allocating.</p> : null}</fieldset>; })}<Button type="submit" disabled={busy || stepUp.busy || Boolean(stepUp.challenge) || loadingProperties || !canPropose}>{busy || stepUp.busy ? 'Preparing secure action…' : 'Allocate selected units with authenticator'}</Button></form></section> : null}

      {negotiation.currentProposal ? <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Current proposal</h2><p className="mt-1 text-sm text-secondary">Revision {negotiation.currentProposal.revision} · {displayStatus(negotiation.currentProposal.state)}</p></div>{proposalAlreadyAccepted ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Your acceptance recorded</span> : null}</div><div className="mt-4 space-y-3">{negotiation.currentProposal.items.map((item) => { const property = propertyMap[item.propertyId]; return <article key={item.propertyId} className="rounded-lg bg-slate-50 p-3"><h3 className="font-bold">{propertyTitle(property)}</h3><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-secondary">Agreed price proposed</dt><dd className="font-semibold">{money(item.terms.priceMinor, item.terms.currency)}</dd></div><div><dt className="text-xs text-secondary">Payment terms</dt><dd className="font-semibold">{item.terms.paymentType}</dd></div><div><dt className="text-xs text-secondary">Fee payer</dt><dd className="font-semibold">{item.terms.feePayer ? displayStatus(item.terms.feePayer) : 'Not returned'}</dd></div>{item.terms.schedule?.length ? <div><dt className="text-xs text-secondary">Instalments</dt><dd className="font-semibold">{item.terms.schedule.length} scheduled payment(s)</dd></div> : null}{item.terms.escrowConditions?.length ? <div><dt className="text-xs text-secondary">Protected conditions</dt><dd className="font-semibold">{item.terms.escrowConditions.length}</dd></div> : null}</dl></article>; })}</div><p className="mt-3 text-xs text-secondary">Acceptance is profile-specific. The server will create an immutable Terms Agreed version only after both current parties accept this exact proposal.</p><div className="mt-4 flex flex-wrap gap-2">{canAcceptTerms && negotiation.currentProposal.state === 'open' && !proposalAlreadyAccepted ? <Button type="button" disabled={busy} onClick={acceptProposal}>Accept current proposal with authenticator</Button> : null}{canPropose && negotiation.currentProposal.state === 'open' ? <form className="flex min-w-[250px] flex-1 flex-wrap gap-2" onSubmit={(event) => void rejectProposal(event)}><input aria-label="Reason for rejecting proposal" required minLength={1} maxLength={1000} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason for rejecting" className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm" /><Button type="submit" variant="secondary" disabled={busy || !rejectReason.trim()}>Reject with authenticator</Button></form> : null}</div></section> : <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">No current proposal</h2><p className="mt-1 text-sm text-secondary">Either party can submit a proposal or counteroffer for every selected unit. A new proposal supersedes the open proposal.</p></section>}

      {canPropose && negotiation.propertyIds.length && ['negotiating', 'terms_agreed'].includes(negotiation.status) && !['paying', 'paid', 'completed', 'cancelled', 'closed'].includes(negotiation.status) ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">{negotiation.currentProposal?.state === 'open' ? 'Make a counteroffer' : 'Submit a proposal'}</h2><p className="mt-1 text-sm text-secondary">The price starts from the current server listing. Confirm the payment type, fee payer and any instalment or escrow terms before requesting an authenticator challenge.</p><form className="mt-4 space-y-5" onSubmit={(event) => void submitProposal(event)}>{negotiation.propertyIds.map((propertyId) => { const property = propertyMap[propertyId]; const draft = termsDrafts[propertyId] ?? blankTerms(property); const options = paymentOptionsFor(property); return <fieldset key={propertyId} className="rounded-xl border p-4"><legend className="px-1 font-bold">{propertyTitle(property)}</legend>{!property ? <p className="text-sm text-amber-800">Current public listing details could not be loaded. Refresh before proposing terms.</p> : <><p className="mb-3 text-xs text-secondary">Current listing: {typeof property.price === 'number' ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: currencyOf(property) || 'NGN', maximumFractionDigits: 2 }).format(property.price) : 'Price not returned'} · currency {currencyOf(property) || 'not returned'}</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Proposed price<input required inputMode="decimal" aria-label={`Proposed price for ${propertyTitle(property)}`} className="mt-1 w-full rounded-lg border p-2" value={draft.price} onChange={(event) => updateTermsDraft(propertyId, { price: event.target.value })} /></label><label className="text-sm font-semibold">Payment type<select required className="mt-1 w-full rounded-lg border p-2" value={draft.paymentType} onChange={(event) => updateTermsDraft(propertyId, { paymentType: event.target.value as SalePaymentType | '' })}><option value="">Choose supported terms</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="text-sm font-semibold">Who pays the transaction fee?<select required className="mt-1 w-full rounded-lg border p-2" value={draft.feePayer} onChange={(event) => updateTermsDraft(propertyId, { feePayer: event.target.value as TermsDraft['feePayer'] })}><option value="">Choose</option><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="split">Split between both</option></select></label>{draft.feePayer === 'split' ? <label className="text-sm font-semibold">Buyer share (%)<input required type="number" min="0" max="100" step="0.01" className="mt-1 w-full rounded-lg border p-2" value={draft.buyerSharePercent} onChange={(event) => updateTermsDraft(propertyId, { buyerSharePercent: event.target.value })} /></label> : null}</div>{draft.paymentType === 'Instalment Plan' ? <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3"><label className="block text-sm font-semibold">Initial payment<input required inputMode="decimal" className="mt-1 w-full rounded-lg border p-2" value={draft.initialPayment} onChange={(event) => updateTermsDraft(propertyId, { initialPayment: event.target.value })} /></label><p className="text-xs text-secondary">Add due dates and amounts that cover the remaining price. The server validates the schedule and records it with the accepted terms.</p>{draft.schedule.map((row) => <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Instalment amount" required inputMode="decimal" placeholder="Amount" className="rounded-lg border p-2" value={row.amount} onChange={(event) => updateTermsDraft(propertyId, { schedule: draft.schedule.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item) })} /><input aria-label="Instalment due date" required type="datetime-local" className="rounded-lg border p-2" value={row.dueAt} onChange={(event) => updateTermsDraft(propertyId, { schedule: draft.schedule.map((item) => item.id === row.id ? { ...item, dueAt: event.target.value } : item) })} /><Button type="button" variant="ghost" onClick={() => updateTermsDraft(propertyId, { schedule: draft.schedule.filter((item) => item.id !== row.id) })}>Remove</Button></div>)}<Button type="button" variant="secondary" onClick={() => updateTermsDraft(propertyId, { schedule: [...draft.schedule, { id: crypto.randomUUID(), amount: '', dueAt: '' }] })} disabled={draft.schedule.length >= 120}>Add instalment</Button></div> : null}<div className="mt-4 rounded-lg border border-dashed p-3"><h3 className="font-bold">Optional escrow conditions</h3><p className="mt-1 text-xs text-secondary">Add conditions only if both parties are discussing protected funds. The backend still controls custody and release.</p><label className="mt-3 block text-sm font-semibold">Amount protected<input inputMode="decimal" className="mt-1 w-full rounded-lg border p-2" value={draft.escrowAmount} onChange={(event) => updateTermsDraft(propertyId, { escrowAmount: event.target.value })} /></label>{draft.conditions.map((condition) => <div key={condition.id} className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><label className="text-xs font-bold">Condition type<select required className="mt-1 w-full rounded border p-2 text-sm" value={condition.type} onChange={(event) => updateTermsDraft(propertyId, { conditions: draft.conditions.map((item) => item.id === condition.id ? { ...item, type: event.target.value } : item) })}><option value="">Choose</option>{RULE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Visibility<select required className="mt-1 w-full rounded border p-2 text-sm" value={condition.scope} onChange={(event) => updateTermsDraft(propertyId, { conditions: draft.conditions.map((item) => item.id === condition.id ? { ...item, scope: event.target.value as ConditionDraft['scope'] } : item) })}><option value="">Choose scope</option><option value="unit">This unit</option><option value="transaction">Whole transaction</option>{negotiation.propertyIds.length > 1 ? <option value="shared_milestone">Shared milestone</option> : null}</select></label><label className="text-xs font-bold sm:col-span-2">Description<input required maxLength={2000} className="mt-1 w-full rounded border p-2 text-sm" value={condition.description} onChange={(event) => updateTermsDraft(propertyId, { conditions: draft.conditions.map((item) => item.id === condition.id ? { ...item, description: event.target.value } : item) })} /></label><label className="text-xs font-bold">Required condition?<select required className="mt-1 w-full rounded border p-2 text-sm" value={condition.required} onChange={(event) => updateTermsDraft(propertyId, { conditions: draft.conditions.map((item) => item.id === condition.id ? { ...item, required: event.target.value as ConditionDraft['required'] } : item) })}><option value="">Choose</option><option value="true">Required</option><option value="false">Optional</option></select></label>{condition.scope === 'shared_milestone' ? <label className="text-xs font-bold">Shared milestone key<input required className="mt-1 w-full rounded border p-2 text-sm" value={condition.sharedMilestoneKey} onChange={(event) => updateTermsDraft(propertyId, { conditions: draft.conditions.map((item) => item.id === condition.id ? { ...item, sharedMilestoneKey: event.target.value } : item) })} /></label> : null}<Button type="button" variant="ghost" onClick={() => updateTermsDraft(propertyId, { conditions: draft.conditions.filter((item) => item.id !== condition.id), ...(draft.conditions.length === 1 ? { escrowAmount: '' } : {}) })}>Remove condition</Button></div>)}<Button type="button" variant="secondary" className="mt-3" onClick={() => updateTermsDraft(propertyId, { conditions: [...draft.conditions, { id: crypto.randomUUID(), type: '', description: '', required: '', scope: '', sharedMilestoneKey: '' }] })}>Add condition</Button></div><details className="mt-4"><summary className="cursor-pointer text-sm font-bold">Other written terms (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['refundTerms', 'cancellationTerms', 'latePaymentTerms', 'defaultTerms'] as const).map((key) => <label key={key} className="text-sm font-semibold">{key.replaceAll(/([A-Z])/g, ' $1')}<textarea maxLength={2000} className="mt-1 min-h-20 w-full rounded-lg border p-2" value={draft.optionalTerms[key]} onChange={(event) => updateTermsDraft(propertyId, { optionalTerms: { ...draft.optionalTerms, [key]: event.target.value } })} /></label>)}</div></details></>}</fieldset>; })}<Button type="submit" disabled={busy || !canPropose || negotiation.propertyIds.some((propertyId) => !propertyMap[propertyId])}>{busy ? 'Preparing secure action…' : 'Submit proposal with authenticator'}</Button></form></section> : null}

      {negotiation.currentTermsVersion && ['terms_agreed', 'paying', 'paid', 'handed_over', 'transferring', 'completed'].includes(negotiation.status) ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-xl font-black text-emerald-950">Terms Agreed</h2><p className="mt-1 text-sm text-emerald-900">This immutable terms version was returned by the server. It is the only version eligible for checkout.</p><p className="mt-2 text-xs text-emerald-900">Version {negotiation.currentTermsVersion.version ?? 'not returned'} · {negotiation.currentTermsVersion.acceptedAt ? new Date(negotiation.currentTermsVersion.acceptedAt).toLocaleString('en-GB') : 'acceptance time not returned'}</p>{isBuyer && canPay && negotiation.status === 'terms_agreed' && !checkout ? <Button className="mt-4" disabled={busy} onClick={initiateCheckout}>Initialize checkout with authenticator</Button> : null}{checkout ? <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4"><h3 className="font-bold">Payment status: {displayStatus(checkout.state)}</h3><p className="mt-1 text-sm">Amount: {money(checkout.amountMinor, checkout.currency)}</p><p className="mt-1 text-sm">Payment reference: <code>{checkout.reference}</code></p>{['initialized', 'outcome_unknown', 'initializing', 'reserved', 'reversed_held'].includes(checkout.state) ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => void checkPayment()}>{busy ? 'Checking…' : 'Check payment with server'}</Button> : null}{checkout.state === 'initialized' && checkout.redirectUrl ? <a className="ml-3 mt-3 inline-block font-bold text-primary underline" href={checkout.redirectUrl}>Continue to existing secure checkout</a> : null}</div> : null}{paymentMessage ? <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm">{paymentMessage}</p> : null}</section> : null}

      {receipts.length ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Payment receipts</h2><p className="mt-1 text-sm text-secondary">Receipts appear only after provider-confirmed fulfillment.</p><ul className="mt-3 space-y-2">{receipts.map((receipt) => <li key={receipt.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{receipt.kind === 'summary' ? 'Purchase summary' : `Receipt for ${receipt.propertyId ? propertyTitle(propertyMap[receipt.propertyId]) : 'purchased unit'}`} · {receipt.receiptNumber}</strong><p className="mt-1">{money(receipt.allocatedTotalMinor, receipt.currency)} · issued {new Date(receipt.issuedAt).toLocaleDateString('en-GB')}</p></li>)}</ul></section> : receiptError ? <section role="alert" className="rounded-2xl border bg-white p-5 text-sm"><h2 className="font-bold">Receipts could not be loaded</h2><p className="mt-1 text-secondary">{receiptError}</p><Button className="mt-3" variant="secondary" onClick={reload}>Refresh purchase record</Button></section> : null}

      {negotiation.termsHistory.length ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Agreed terms history</h2><ul className="mt-3 space-y-2">{negotiation.termsHistory.map((terms, index) => <li key={terms.id ?? terms.termsVersionId ?? index} className="rounded-lg bg-slate-50 p-3 text-sm">Terms version {terms.version ?? index + 1} · {terms.acceptedAt ? new Date(terms.acceptedAt).toLocaleString('en-GB') : 'acceptance time not returned'}{terms === negotiation.currentTermsVersion ? ' · current' : ''}</li>)}</ul></section> : null}

      {canDropBeforeCheckout || canDropAfterPayment ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-xl font-black">Request a unit change</h2><p className="mt-1 text-sm">Before checkout, a unit can be dropped only when another selected unit remains. After payment, a drop enters the unit escrow/dispute process and any refund remains pending until provider confirmation.</p><label className="mt-3 block text-sm font-semibold">Reason<input required minLength={1} maxLength={500} className="mt-1 w-full rounded-lg border p-2" value={dropReason} onChange={(event) => setDropReason(event.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2">{negotiation.propertyIds.map((propertyId) => <Button key={propertyId} type="button" variant="secondary" disabled={busy || !dropReason.trim() || (canDropBeforeCheckout && negotiation.propertyIds.length <= 1)} onClick={() => dropUnit(propertyId)}>Request change for {requestPropertyLabel(propertyId)}</Button>)}</div></section> : null}

      {negotiation.status === 'paid' || negotiation.status === 'handed_over' || negotiation.status === 'transferring' ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Ownership and handover</h2><p className="mt-1 text-sm text-secondary">Payment alone does not complete legal ownership. The Seller issues one sealed handover record for each purchased property and the named Buyer signs it in the Document Manager. The server updates ownership only after all payment, installment and required escrow conditions are satisfied.</p><Link className="mt-3 inline-flex font-bold text-primary underline" to="/dashboard/documents">Open Document Manager</Link></section> : null}
    </> : null}
  </main>);
};

export default function SaleNegotiations() {
  const { activeProfile } = useAuth();
  return <SaleNegotiationsContent key={activeProfile?.id ?? 'no-profile'} />;
}
