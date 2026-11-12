import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import LoadingState from '../ui/LoadingState';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { ApiRequestError } from '../../lib/axios';
import { propertyService } from '../../services/propertyService';
import { projectService } from '../../services/projectService';
import { protectedMediaService, type ProtectedMediaAccessLevel, type ProtectedMediaAccessOptions, type ProtectedMediaGrant, type ProtectedMediaItem, type ProtectedMediaOrder, type ProtectedMediaResourceKind } from '../../services/protectedMediaService';
import type { ProjectDetail, Property } from '../../types';
import type { UnitTypeDto } from '../../services/projectService';

type MutationResult = ProtectedMediaItem | ProtectedMediaGrant | { order: ProtectedMediaOrder; idempotent: boolean } | Property | { associated: true };
interface ActiveViewer { item: ProtectedMediaItem; url: string; contentType: string; viewId: string | null; startedAt: number; profileId: string }
interface ProtectedMediaSectionProps {
  resourceKind: ProtectedMediaResourceKind;
  resourceId: string;
  title: string;
  sellerMode?: boolean;
  property?: Property;
  project?: ProjectDetail;
  unitType?: UnitTypeDto;
  onPropertyUpdated?: (property: Property) => void;
  onProjectUpdated?: (project: ProjectDetail) => void;
  onUnitTypeUpdated?: (unitType: UnitTypeDto) => void;
  unitTypeId?: string;
}

const pretty = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const isProjectDetail = (value: unknown): value is ProjectDetail => typeof value === 'object' && value !== null && '_id' in value && 'version' in value;
const priceText = (price?: { state: string; amountMinor?: number; currency?: string }) => price?.state === 'configured' && Number.isFinite(price.amountMinor) && price.currency
  ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: price.currency }).format((price.amountMinor ?? 0) / 100)
  : 'Unavailable';
const digestFile = async (file: File): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure file verification is not available in this browser. Choose a supported browser before uploading.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const ProtectedMediaSection = ({ resourceKind, resourceId, title, sellerMode = false, property, project, unitType, onPropertyUpdated, onProjectUpdated, onUnitTypeUpdated, unitTypeId }: ProtectedMediaSectionProps) => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const isBuyerProfile = activeProfile?.kind === 'buyer';
  const isSellerProfile = ['owner', 'developer', 'agency', 'sellers_agent'].includes(activeProfile?.kind ?? '');
  const profilePermissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManageMedia = sellerMode && isSellerProfile && profilePermissions.includes('listing.media');
  const canReviewRequests = sellerMode && isSellerProfile && profilePermissions.includes('document.request.approve');
  const { dictionary } = useCanonicalFieldDictionary();
  const actionStepUp = useBoundStepUp<MutationResult>();
  const cancelActionStepUp = actionStepUp.cancel;
  const generation = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const viewerRef = useRef<ActiveViewer | null>(null);
  const [items, setItems] = useState<ProtectedMediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [options, setOptions] = useState<ProtectedMediaAccessOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mediaKind, setMediaKind] = useState('');
  const [accessLevel, setAccessLevel] = useState<ProtectedMediaAccessLevel | ''>('');
  const [itemTitle, setItemTitle] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [freeModels, setFreeModels] = useState<string[]>([]);
  const [chargeOnRequest, setChargeOnRequest] = useState(false);
  const [associateItemId, setAssociateItemId] = useState('');
  const [associateField, setAssociateField] = useState('');
  const [viewer, setViewer] = useState<ActiveViewer | null>(null);
  const [order, setOrder] = useState<ProtectedMediaOrder | null>(null);
  const [orderPaymentStatus, setOrderPaymentStatus] = useState('');
  const [orderAction, setOrderAction] = useState<'purchase' | 'sponsor' | 'pass' | null>(null);
  const [operationKeys, setOperationKeys] = useState<Record<string, string>>({});
  const [requestsByItem, setRequestsByItem] = useState<Record<string, ProtectedMediaGrant[]>>({});
  const [requestCursorsByItem, setRequestCursorsByItem] = useState<Record<string, string | null>>({});
  const [buyerRequestStates, setBuyerRequestStates] = useState<Record<string, string>>({});
  const orderKeyNameRef = useRef('');

  const eligibleMediaKinds = useMemo(() => (options?.levels ?? []).filter((entry) =>
    typeof entry?.mediaKind === 'string' && Array.isArray(entry.allowedLevels) && entry.allowedLevels.length > 0,
  ), [options]);
  const purchaseUsable = (kind: 'paidItem' | 'buyerPass' | 'sellerSponsored') => {
    const status = options?.readiness?.purchases?.[kind];
    if (status) return status.usableToAttempt === true;
    return options?.prices[kind].state === 'configured';
  };
  const currentMediaOptions = eligibleMediaKinds.find((entry) => entry.mediaKind === mediaKind);
  const associationTarget = unitType ? 'unit_type' : project ? 'project' : property ? 'property' : null;
  const associationFields = useMemo(() => (dictionary?.fields ?? []).filter((field) =>
    Boolean(associationTarget) && ['image_media', 'media_list'].includes(field.dataType) && field.editableTargets.includes(associationTarget!) && field.mutationOperations[associationTarget!]?.set === true && !field.systemOwned && !field.transitionManaged && !field.readOnly,
  ), [associationTarget, dictionary]);

  const closeViewer = useCallback(async () => {
    const current = viewerRef.current;
    if (!current) return;
    viewerRef.current = null;
    URL.revokeObjectURL(current.url);
    setViewer(null);
    if (current.viewId) {
      try { await protectedMediaService.completeView(current.item.id, current.viewId, { durationSeconds: Math.max(0, Math.min(86400, Math.floor((Date.now() - current.startedAt) / 1000))) }); }
      catch { /* The viewer is already closed; the server caps any completion time. */ }
    }
  }, []);

  const load = useCallback(async (append = false) => {
    if (!resourceId) { setItems([]); setLoading(false); return; }
    const requestGeneration = ++generation.current;
    setLoading(true); setError('');
    const currentCursor = cursorRef.current;
    const [itemResult, optionResult] = await Promise.allSettled([
      protectedMediaService.listItems(resourceKind, resourceId, { limit: 25, ...(append && currentCursor ? { after: currentCursor } : {}), ...(unitTypeId ? { unitTypeId } : {}) }),
      protectedMediaService.getAccessOptions(),
    ]);
    if (requestGeneration !== generation.current) return;
    if (itemResult.status === 'fulfilled') {
      setItems((current) => append ? [...current, ...itemResult.value.items] : itemResult.value.items);
      setCursor(itemResult.value.nextCursor);
      cursorRef.current = itemResult.value.nextCursor;
    } else { setError(itemResult.reason instanceof Error ? itemResult.reason.message : 'Protected media could not be loaded.'); setItems([]); setCursor(null); }
    if (optionResult.status === 'fulfilled') { setOptions(optionResult.value); setOptionsError(''); }
    else { setOptions(null); setOptionsError(optionResult.reason instanceof Error ? optionResult.reason.message : 'Media access policy is unavailable.'); }
    if (canReviewRequests && itemResult.status === 'fulfilled') {
      const results = await Promise.allSettled(itemResult.value.items.map(async (item) => [item.id, await protectedMediaService.listAccessRequests(item.id, { limit: 25 })] as const));
      if (requestGeneration === generation.current) {
        setRequestsByItem(Object.fromEntries(results.flatMap((result) => result.status === 'fulfilled' ? [[result.value[0], result.value[1].items]] : [])));
        setRequestCursorsByItem(Object.fromEntries(results.flatMap((result) => result.status === 'fulfilled' ? [[result.value[0], result.value[1].nextCursor]] : [])));
      }
    } else { setRequestsByItem({}); setRequestCursorsByItem({}); }
    setLoading(false);
  }, [canReviewRequests, resourceId, resourceKind, sellerMode, unitTypeId]);

  useEffect(() => {
    cancelActionStepUp();
    setItems([]); setCursor(null); cursorRef.current = null; setOptions(null); setRequestsByItem({}); setRequestCursorsByItem({}); setBuyerRequestStates({}); setViewer(null); setOrder(null); setOrderPaymentStatus(''); setOrderAction(null); setOperationKeys({}); orderKeyNameRef.current = ''; setFile(null); setUploadOpen(false); setBusy(false); setError('');
    viewerRef.current = null;
    void load(false);
    return () => {
      generation.current += 1;
      const current = viewerRef.current;
      if (current) { URL.revokeObjectURL(current.url); if (current.viewId) void protectedMediaService.completeView(current.item.id, current.viewId, { durationSeconds: Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000)) }).catch(() => undefined); }
      viewerRef.current = null;
    };
  }, [cancelActionStepUp, load, profileId]);

  useEffect(() => {
    const available = currentMediaOptions?.allowedLevels ?? [];
    if (accessLevel && !available.includes(accessLevel)) setAccessLevel('');
  }, [accessLevel, currentMediaOptions]);

  const beginUpload = async () => {
    if (!canManageMedia || !options || !file || !currentMediaOptions || !accessLevel || !itemTitle.trim() || !capturedAt || busy) return;
    if (!currentMediaOptions.allowedLevels.includes(accessLevel)) { toast.error('Choose an access level returned for this media type.'); return; }
    setBusy(true);
    try {
      const fileHash = await digestFile(file);
      const fields: Record<string, string> = {
        mediaKind,
        title: itemTitle.trim(),
        capturedAt,
        accessLevel,
        ...(freeModels.length ? { freeModels: JSON.stringify(freeModels.filter((model) => model !== 'seller_capture')) } : {}),
        ...(chargeOnRequest && accessLevel === 'On request' ? { chargeOnRequest: 'true' } : {}),
        ...(unitTypeId ? { unitTypeId } : {}),
        __stepUpFileSha256: fileHash,
      };
      const form = new FormData();
      form.append('file', file);
      Object.entries(fields).forEach(([key, value]) => form.append(key, value));
      const path = `/api/media/resources/${resourceKind}/${encodeURIComponent(resourceId)}/items`;
      const started = await actionStepUp.begin({ method: 'POST', path, body: fields, label: 'Upload and protect this listing media file', execute: (challengeId) => protectedMediaService.uploadItem(resourceKind, resourceId, form, challengeId) });
      if (!started) { setBusy(false); toast.error(actionStepUp.error ?? 'Authenticator confirmation could not start.'); }
    } catch (raw) { setBusy(false); toast.error(raw instanceof Error ? raw.message : 'The file could not be prepared for protected upload.'); }
  };

  const completeAction = async (code: string): Promise<boolean> => {
    const result = await actionStepUp.complete(code);
    if (!result.ok) { toast.error(result.error ?? 'The protected action was not confirmed.'); return false; }
    setBusy(false);
    if ('access' in result.value && 'mediaKind' in result.value) {
      setUploadOpen(false); setFile(null); setMediaKind(''); setAccessLevel(''); setItemTitle(''); setCapturedAt(''); setFreeModels([]); setChargeOnRequest(false);
      toast.success('Protected media was accepted. It is not associated with the public listing until the canonical listing field is updated.');
      await load(false);
      setAssociateItemId(result.value.id);
    } else if ('order' in result.value) {
      const createdOrder = result.value.order;
      setOrder(createdOrder); setOrderPaymentStatus('pending');
      protectedMediaService.persistPendingOrder(createdOrder.id, createdOrder.paymentReference, profileId);
      if (createdOrder.state === 'active') protectedMediaService.clearPendingOrder();
      if (createdOrder.state === 'failed') {
        protectedMediaService.clearPendingOrder();
        setOperationKeys((current) => { const next = { ...current }; if (orderKeyNameRef.current) delete next[orderKeyNameRef.current]; return next; });
      }
      if (createdOrder.checkoutUrl) {
        try { const checkout = new URL(createdOrder.checkoutUrl); if (checkout.protocol === 'https:') window.location.assign(checkout.href); }
        catch { toast.error('The server did not return a usable secure checkout link. Check order status before trying again.'); }
      }
      toast.info('Payment order created. Media access remains locked until the server reports an active order.');
      await load(false);
    } else if ('state' in result.value && 'downloadsAllowed' in result.value) {
      toast.success(`Access request ${result.value.state}.`); await load(false);
    } else if ('version' in result.value && 'canonicalFields' in result.value) {
      onPropertyUpdated?.(result.value as Property); setAssociateItemId(''); toast.success('The protected media reference was associated with the listing.');
    } else if ('versionId' in result.value) {
      toast.success('Protected media was updated.'); await load(false);
    }
    return true;
  };

  const requestAccess = async (item: ProtectedMediaItem) => {
    setBusy(true);
    try { const request = await protectedMediaService.requestAccess(item.id); setBuyerRequestStates((current) => ({ ...current, [item.id]: request.state })); toast.success('Access request sent. The seller must review it before access is granted.'); await load(false); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Access could not be requested.'); }
    finally { setBusy(false); }
  };

  const loadMoreRequests = async (item: ProtectedMediaItem) => {
    const after = requestCursorsByItem[item.id];
    if (!after || busy) return;
    setBusy(true);
    try {
      const page = await protectedMediaService.listAccessRequests(item.id, { limit: 25, after });
      setRequestsByItem((current) => ({ ...current, [item.id]: [...(current[item.id] ?? []), ...page.items] }));
      setRequestCursorsByItem((current) => ({ ...current, [item.id]: page.nextCursor }));
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'More access requests could not be loaded.'); }
    finally { setBusy(false); }
  };

  const openItem = async (item: ProtectedMediaItem, download = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await protectedMediaService.getContent(item.id, { download });
      if (!download && !['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4'].includes(result.contentType)) throw new Error('This validated file type cannot be previewed in this viewer.');
      const next: ActiveViewer = { item, url: URL.createObjectURL(result.blob), contentType: result.contentType, viewId: result.viewId, startedAt: Date.now(), profileId };
      viewerRef.current = next; setViewer(next);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Protected media is unavailable.'); }
    finally { setBusy(false); }
  };

  const beginOrder = async (item: ProtectedMediaItem | null, kind: 'purchase' | 'sponsor' | 'pass') => {
    if (busy || actionStepUp.busy || actionStepUp.challenge) return;
    if (kind !== 'pass' && !item) return;
    const keyName = `${kind}:${item?.id ?? profileId}`;
    const idempotencyKey = operationKeys[keyName] ?? `protected_${kind}_${crypto.randomUUID()}`;
    orderKeyNameRef.current = keyName;
    setOrderAction(kind);
    setOperationKeys((current) => ({ ...current, [keyName]: idempotencyKey }));
    const path = kind === 'pass' ? '/api/media/buyer-passes/purchase' : `/api/media/items/${encodeURIComponent(item!.id)}/${kind}`;
    const body = { idempotencyKey };
    const started = await actionStepUp.begin({ method: 'POST', path, body, label: kind === 'purchase' ? 'Purchase access to protected media' : kind === 'sponsor' ? 'Sponsor access to this protected media' : 'Purchase a Buyer Pass', execute: (challengeId) => kind === 'pass' ? protectedMediaService.purchaseBuyerPass(body, challengeId) : kind === 'sponsor' ? protectedMediaService.sponsor(item!.id, body, challengeId) : protectedMediaService.purchase(item!.id, body, challengeId) });
    if (!started) toast.error(actionStepUp.error ?? 'Authenticator confirmation could not start.');
  };

  const refreshOrder = async () => {
    if (!order || busy) return;
    setBusy(true);
    try {
      const result = await protectedMediaService.getOrder(order.id);
      setOrder(result.order); setOrderPaymentStatus(result.paymentStatus);
      if (result.order.state === 'active') { protectedMediaService.clearPendingOrder(); toast.success('The server confirmed active media access.'); await load(false); }
      else if (result.order.state === 'failed') {
        protectedMediaService.clearPendingOrder();
        setOperationKeys((current) => { const next = { ...current }; if (orderKeyNameRef.current) delete next[orderKeyNameRef.current]; return next; });
        toast.error('The server reports that this order failed. You may start a new order if you still want access.');
      }
    }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Order status could not be refreshed.'); }
    finally { setBusy(false); }
  };

  const associate = async () => {
    if (!associationTarget || !associateItemId || !associateField) return;
    const item = items.find((entry) => entry.id === associateItemId);
    const field = associationFields.find((entry) => entry.key === associateField);
    if (!item || !field) return;
    const currentFields = unitType?.canonicalFields ?? project?.canonicalFields ?? property?.canonicalFields;
    const raw = currentFields?.[field.key];
    let value: unknown;
    if (field.dataType === 'image_media') {
      if (raw !== undefined && raw !== null) { toast.error('That image field already has an asset. Use the listing editor to replace it safely.'); return; }
      value = { assetId: item.id, versionId: item.versionId };
    } else {
      if (!Array.isArray(raw)) { toast.error('The current media list was not returned. Refresh the property before associating an item.'); return; }
      if (raw.some((entry) => typeof entry === 'object' && entry !== null && 'assetId' in entry && entry.assetId === item.id)) { toast.error('This protected item is already associated with that field.'); return; }
      value = [...raw, { assetId: item.id, versionId: item.versionId }];
    }
    const mutation = [{ field: field.key, operation: 'set' as const, value }];
    const expectedVersion = unitType ? project?.version : project?.version ?? property?.version;
    if (!Number.isInteger(expectedVersion)) { toast.error('The current listing or project version was not returned. Refresh before associating this media.'); return; }
    const body = unitType
      ? { expectedVersion: expectedVersion!, expectedTypeVersion: unitType.version, canonicalFieldMutations: mutation }
      : { expectedVersion: expectedVersion!, canonicalFieldMutations: mutation };
    const resourceUrl = unitType
      ? `/api/projects/${encodeURIComponent(project!._id)}/unit-types/${encodeURIComponent(unitType.id)}`
      : project
        ? `/api/projects/${encodeURIComponent(project._id)}`
        : `/api/properties/${encodeURIComponent(property!._id)}`;
    const run = async (challengeId?: string) => {
      if (unitType) return projectService.updateUnitType(project!._id, unitType.id, body as { expectedVersion: number; expectedTypeVersion: number; canonicalFieldMutations: Array<{ field: string; operation: string; value?: unknown }> }, challengeId);
      if (project) return projectService.updateProject(project._id, body, challengeId);
      return propertyService.updateProperty(property!._id, body, challengeId);
    };
    setBusy(true);
    try {
      const updated = await run();
      if (unitType && 'unitType' in updated) onUnitTypeUpdated?.(updated.unitType);
      else if (project && 'project' in updated && isProjectDetail(updated.project)) onProjectUpdated?.(updated.project);
      else if ('version' in updated && 'canonicalFields' in updated) onPropertyUpdated?.(updated as Property);
      setAssociateItemId(''); toast.success('Protected media reference associated with the listing.');
    } catch (rawError) {
      if (rawError instanceof ApiRequestError && rawError.code === 'AUTH_STEP_UP_REQUIRED') {
        const started = await actionStepUp.begin({ method: 'PATCH', path: resourceUrl, body, label: 'Associate protected media with this listing', execute: async (challengeId) => {
          const response = await run(challengeId);
          if (unitType && 'unitType' in response) onUnitTypeUpdated?.(response.unitType);
          else if (project && 'project' in response && isProjectDetail(response.project)) onProjectUpdated?.(response.project);
          else if ('version' in response && 'canonicalFields' in response) onPropertyUpdated?.(response as Property);
          return { associated: true };
        } });
        if (!started) setBusy(false);
      } else if (rawError instanceof ApiRequestError && rawError.status === 409) { setBusy(false); toast.error('The listing changed. Refresh it before associating this media.'); }
      else { setBusy(false); toast.error(rawError instanceof Error ? rawError.message : 'The media reference could not be associated.'); }
    }
  };

  const decideRequest = async (item: ProtectedMediaItem, grant: ProtectedMediaGrant, decision: 'approve' | 'decline' | 'revoke') => {
    const body = { decision, expectedVersion: grant.version };
    const path = `/api/media/items/${encodeURIComponent(item.id)}/access-requests/${encodeURIComponent(grant.id)}/decision`;
    const started = await actionStepUp.begin({ method: 'POST', path, body, label: `${pretty(decision)} media access request`, execute: (challengeId, exactBody) => protectedMediaService.decideAccessRequest(item.id, grant.id, exactBody, challengeId) });
    if (!started) toast.error(actionStepUp.error ?? 'Authenticator confirmation could not start.');
  };

  const revokeItem = async (item: ProtectedMediaItem) => {
    const body = { expectedVersion: item.version };
    const started = await actionStepUp.begin({ method: 'POST', path: `/api/media/items/${encodeURIComponent(item.id)}/revoke`, body, label: 'Revoke protected media access', execute: (challengeId, exactBody) => protectedMediaService.revoke(item.id, exactBody, challengeId) });
    if (!started) toast.error(actionStepUp.error ?? 'Authenticator confirmation could not start.');
  };

  return <Card className="space-y-4 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Protected media</h2><p className="mt-1 text-sm text-secondary">{title}. Each file is private until the server confirms its access and listing association.</p></div>{canManageMedia ? <Button type="button" disabled={!options || Boolean(optionsError) || busy} onClick={() => setUploadOpen((current) => !current)}>{uploadOpen ? 'Close upload' : 'Add protected media'}</Button> : null}</div>
    {optionsError ? <p role="status" className="rounded bg-amber-50 p-3 text-sm text-amber-950">Media access options are unavailable: {optionsError}</p> : null}
    {options?.readiness ? <div role="status" className="rounded-lg bg-surface-container-low p-3 text-sm"><p className="font-semibold">Media service readiness</p><p className="mt-1 text-xs text-secondary">Policy {options.readiness.policy?.state ?? 'not returned'} · Collection {options.readiness.collection?.state ?? 'not returned'} · Private storage {options.readiness.privateStorage?.state ?? 'not returned'} · Renderer {options.readiness.videoRenderer?.state ?? 'not returned'}</p>{options.readiness.collection?.state === 'configured_unverified' || options.readiness.purchases?.paidItem?.state === 'configured_unverified' ? <p className="mt-1 text-xs text-secondary">The service can attempt the operation, but this does not confirm provider settlement or media access.</p> : null}{options.readiness.privateEnvelope?.state === 'unavailable' || options.readiness.privateStorage?.state === 'unavailable' ? <p className="mt-1 text-xs text-secondary">Protected media is unavailable until the backend storage requirements are ready.</p> : null}</div> : null}
    {uploadOpen && canManageMedia && options && eligibleMediaKinds.length === 0 ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">Media upload is unavailable because the current response contains no media types with an allowed access level. No fallback choices are available.</p> : null}
    {uploadOpen && canManageMedia && eligibleMediaKinds.length > 0 ? <div className="grid gap-3 rounded-lg bg-surface-container-low p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Media type<select className="mt-1 block w-full rounded border px-3 py-2" value={mediaKind} onChange={(event) => { setMediaKind(event.target.value); setAccessLevel(''); setFreeModels([]); }}><option value="">Choose a type</option>{eligibleMediaKinds.map((entry) => <option key={entry.mediaKind} value={entry.mediaKind}>{pretty(entry.mediaKind)}</option>)}</select></label>
      <label className="text-sm font-semibold">Access level<select className="mt-1 block w-full rounded border px-3 py-2" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as ProtectedMediaAccessLevel)} disabled={!currentMediaOptions}><option value="">Choose access</option>{currentMediaOptions?.allowedLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
      <label className="text-sm font-semibold">Display title<input className="mt-1 block w-full rounded border px-3 py-2" maxLength={160} value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} /></label>
      <label className="text-sm font-semibold">Capture date<input className="mt-1 block w-full rounded border px-3 py-2" type="date" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Select one file<input className="mt-1 block w-full rounded border px-3 py-2" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />{file ? <span className="mt-1 block text-xs text-secondary">{file.name} · {Math.ceil(file.size / 1024)} KB. The server validates its supported format and configured size limit.</span> : null}</label>
      {options?.freeModels.filter((model) => model !== 'seller_capture').length && (accessLevel === 'Paid' || accessLevel === 'On request') ? <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">Optional included access models</legend><div className="mt-2 flex flex-wrap gap-3">{options.freeModels.filter((model) => model !== 'seller_capture').map((model) => <label key={model} className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={freeModels.includes(model)} onChange={(event) => setFreeModels((current) => event.target.checked ? [...current, model] : current.filter((entry) => entry !== model))} />{pretty(model)}</label>)}</div></fieldset> : null}
      {accessLevel === 'On request' ? <label className="inline-flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={chargeOnRequest} onChange={(event) => setChargeOnRequest(event.target.checked)} /><span>Require the server-configured charge before activating an approved request</span></label> : null}
      <div className="sm:col-span-2"><Button type="button" disabled={busy || !file || !mediaKind || !accessLevel || !itemTitle.trim() || !capturedAt} onClick={() => void beginUpload()}>Continue with authenticator</Button></div>
    </div> : null}
    {loading ? <LoadingState label="Loading protected media…" /> : error ? <ErrorState message={error} onRetry={() => void load(false)} /> : items.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No protected media is available for this resource.</p> : <div className="space-y-3">{items.map((item) => {
      const itemRequests = requestsByItem[item.id] ?? [];
      const requestState = buyerRequestStates[item.id];
      const orderPendingForItem = Boolean(order && order.itemId === item.id && ['pending', 'held'].includes(order.state));
      const canView = ['free', 'owner', 'staff', 'active'].includes(item.access.state);
      return <article key={item.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="text-xs text-secondary">{pretty(item.mediaKind)} · {item.mimeType} · {Math.ceil(item.fileSizeBytes / 1024)} KB · {item.accessLevel}</p><p className="mt-1 text-xs text-secondary">Status: {pretty(item.state)} · Access: {pretty(item.access.state)}</p></div>{canView ? <Button type="button" disabled={busy} onClick={() => void openItem(item)}>{busy ? 'Opening…' : 'View protected file'}</Button> : null}</div>
        {!canView && item.access.state === 'request_available' && isBuyerProfile ? <Button className="mt-3" type="button" variant="secondary" disabled={busy || ['pending', 'approved'].includes(buyerRequestStates[item.id] ?? '')} onClick={() => void requestAccess(item)}>{['pending', 'approved'].includes(buyerRequestStates[item.id] ?? '') ? `Request ${pretty(buyerRequestStates[item.id]!)}` : 'Request access'}</Button> : null}
        {!canView && item.access.state === 'request_available' && !isBuyerProfile ? <p className="mt-3 text-xs text-secondary">Sign in and select an eligible Buyer profile to request access.</p> : null}
        {!canView && item.access.state === 'purchase_available' && isBuyerProfile ? <><p className="mt-2 text-sm">{priceText(options?.prices.paidItem)}</p><Button className="mt-2" type="button" disabled={busy || actionStepUp.busy || !purchaseUsable('paidItem') || orderPendingForItem} onClick={() => void beginOrder(item, 'purchase')}>{orderPendingForItem ? 'Check the current order' : 'Purchase access'}</Button>{options?.readiness?.purchases?.paidItem?.reasonCodes?.length ? <p role="status" className="text-xs text-secondary">Unavailable: {options.readiness.purchases.paidItem.reasonCodes.map(pretty).join(', ')}.</p> : null}</> : null}
        {!canView && item.access.state === 'purchase_available' && !isBuyerProfile ? <p className="mt-3 text-xs text-secondary">Sign in and select an eligible Buyer profile to purchase access.</p> : null}
        {requestState ? <p role="status" className="mt-2 text-xs text-secondary">Latest request: {pretty(requestState)}</p> : null}
        {canManageMedia && item.freeModels.includes('seller_sponsored') ? <div className="mt-3 flex flex-wrap gap-2"><p className="w-full text-xs text-secondary">Seller-sponsored price: {priceText(options?.prices.sellerSponsored)}</p><Button type="button" variant="secondary" disabled={busy || !purchaseUsable('sellerSponsored')} onClick={() => void beginOrder(item, 'sponsor')}>Sponsor free access</Button></div> : null}
        {canManageMedia && item.state !== 'revoked' ? <Button className="mt-3" type="button" variant="secondary" disabled={busy || actionStepUp.busy} onClick={() => void revokeItem(item)}>Revoke media access</Button> : null}
        {canReviewRequests && itemRequests.length ? <div className="mt-3 space-y-2 border-t pt-3"><p className="text-sm font-semibold">Access requests</p>{itemRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{pretty(request.state)} · Version {request.version}</span><div className="flex gap-2">{request.state === 'pending' ? <><Button type="button" disabled={busy} onClick={() => void decideRequest(item, request, 'approve')}>Approve</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => void decideRequest(item, request, 'decline')}>Decline</Button></> : request.state === 'approved' ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void decideRequest(item, request, 'revoke')}>Revoke grant</Button> : null}</div></div>)}{requestCursorsByItem[item.id] ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void loadMoreRequests(item)}>Load more requests</Button> : null}</div> : null}
        {canManageMedia && associationTarget && associateItemId === item.id ? <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="text-xs font-semibold">Associate with listing field<select className="mt-1 block w-full rounded border px-3 py-2" value={associateField} onChange={(event) => setAssociateField(event.target.value)}><option value="">Choose a compatible current field</option>{associationFields.map((field) => <option key={field.key} value={field.key}>{pretty(field.key)}</option>)}</select></label><Button type="button" disabled={!associateField || busy || !Number.isInteger(unitType ? project?.version : project?.version ?? property?.version)} onClick={() => void associate()}>Associate</Button></div> : null}
      </article>;
    })}</div>}
    {cursor ? <Button type="button" variant="secondary" disabled={loading} onClick={() => void load(true)}>Load more</Button> : null}
    {options?.prices.buyerPass.state === 'configured' && purchaseUsable('buyerPass') && !sellerMode ? <div className="border-t pt-3"><p className="text-xs text-secondary">Buyer Pass · {priceText(options.prices.buyerPass)}{options.buyerPassDurationHours ? ` · ${options.buyerPassDurationHours} hours` : ''}</p>{isBuyerProfile ? <Button type="button" variant="secondary" disabled={busy || actionStepUp.busy || Boolean(order && ['pending', 'held'].includes(order.state))} onClick={() => void beginOrder(null, 'pass')}>{orderAction === 'pass' && order && ['pending', 'held'].includes(order.state) ? 'Check the current order' : 'Purchase Buyer Pass'}</Button> : <p className="mt-2 text-xs text-secondary">Sign in and select a Buyer profile to purchase a pass.</p>}</div> : options?.readiness?.purchases?.buyerPass?.state === 'unavailable' && !sellerMode ? <p role="status" className="border-t pt-3 text-xs text-secondary">Buyer Pass is currently unavailable{options.readiness.purchases.buyerPass.reasonCodes?.length ? `: ${options.readiness.purchases.buyerPass.reasonCodes.map(pretty).join(', ')}` : '.'}</p> : null}
    {order ? <div role="status" className="rounded-lg bg-surface-container-low p-3 text-sm"><p>Order status: {pretty(order.state)}{orderPaymentStatus ? ` · Payment ${pretty(orderPaymentStatus)}` : ''}. Access is available only after the server reports it active.</p><Button className="mt-2" type="button" variant="secondary" disabled={busy} onClick={() => void refreshOrder()}>Refresh order status</Button></div> : null}
    {viewer ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Protected media viewer"><div className="flex max-h-full w-full max-w-6xl flex-col rounded-xl bg-white p-3"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{viewer.item.title}</h3><Button type="button" variant="secondary" onClick={() => void closeViewer()}>Close protected viewer</Button></div><div className="mt-3 min-h-0 flex-1 overflow-auto bg-slate-900 p-2">{viewer.contentType === 'application/pdf' ? <iframe title="Protected media PDF" src={`${viewer.url}#toolbar=0&navpanes=0`} className="h-[78vh] w-full bg-white" /> : viewer.contentType.startsWith('image/') ? <img alt={viewer.item.title} src={viewer.url} className="mx-auto max-h-[78vh] max-w-full object-contain" /> : <video controls className="mx-auto max-h-[78vh] max-w-full" src={viewer.url} />}</div></div></div> : null}
    <StepUpDialog challenge={actionStepUp.challenge} busy={actionStepUp.busy} error={actionStepUp.error} onCancel={() => { actionStepUp.cancel(); setBusy(false); }} onSubmit={completeAction} />
  </Card>;
};

export default ProtectedMediaSection;
