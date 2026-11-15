import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import LocationSuggestionInput from '../../components/property/LocationSuggestionInput';
import StepUpDialog from '../../components/auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { propertyService } from '../../services/propertyService';
import { projectService } from '../../services/projectService';
import { paymentService } from '../../services/paymentService';
import { group07Service, type Group07LeadBroadcast, type Group07PromotionCampaign, type Group07ShareKit } from '../../services/group07Service';
import type { Property, ProjectCard } from '../../types';
import type { LocationSuggestion } from '../../services/locationService';

type Tab = 'share' | 'broadcasts' | 'promotions';
type TargetKind = 'post' | 'property' | 'project' | 'partner_service' | 'directory_spotlight';
type Option = { id: string; label: string; kind: TargetKind };
const key = () => `g07_${crypto.randomUUID().replaceAll('-', '')}`;
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const amount = (minor: number | null, currency: string) => typeof minor === 'number' ? new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100) : 'Amount not returned';

export default function CommunityGrowthTools() {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const profileRef = useRef(profileId); profileRef.current = profileId;
  const stepUp = useBoundStepUp<unknown>();
  const [tab, setTab] = useState<Tab>('share');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [posts, setPosts] = useState<Array<{ id: string; caption: string; state: string }>>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [partner, setPartner] = useState<Awaited<ReturnType<typeof group07Service.partnerCurrent>> | null>(null);

  const [shareKind, setShareKind] = useState<'post' | 'property' | 'project'>('post');
  const [shareTargetId, setShareTargetId] = useState('');
  const [shareBody, setShareBody] = useState<{ targetKind: 'post' | 'property' | 'project'; targetId: string; operationKey: string } | null>(null);
  const [kits, setKits] = useState<Group07ShareKit[]>([]);
  const [kitBusy, setKitBusy] = useState(false);

  const [broadcasts, setBroadcasts] = useState<Group07LeadBroadcast[]>([]);
  const [broadcastPropertyId, setBroadcastPropertyId] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastBody, setBroadcastBody] = useState<{ propertyId: string; title: string; message: string; operationKey: string } | null>(null);
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const [campaignKind, setCampaignKind] = useState<TargetKind>('post');
  const [campaignTargetId, setCampaignTargetId] = useState('');
  const [campaignBody, setCampaignBody] = useState<Record<string, unknown> | null>(null);
  const [catalogue, setCatalogue] = useState<Awaited<ReturnType<typeof group07Service.promotionCatalogue>> | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [productId, setProductId] = useState('');
  const [budget, setBudget] = useState('');
  const [bid, setBid] = useState('');
  const [audience, setAudience] = useState({ priceBand: '', buyerType: '', residence: '', buyerCountry: '' });
  const [audienceStateText, setAudienceStateText] = useState('');
  const [audienceState, setAudienceState] = useState<LocationSuggestion | null>(null);
  const [audienceLgaText, setAudienceLgaText] = useState('');
  const [audienceLga, setAudienceLga] = useState<LocationSuggestion | null>(null);
  const [audienceAreaText, setAudienceAreaText] = useState('');
  const [audienceArea, setAudienceArea] = useState<LocationSuggestion | null>(null);
  const [campaigns, setCampaigns] = useState<Group07PromotionCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignDetail, setCampaignDetail] = useState<Awaited<ReturnType<typeof group07Service.promotionDetail>> | null>(null);
  const [endBody, setEndBody] = useState<Record<string, unknown> | null>(null);
  const [transferTargetKind, setTransferTargetKind] = useState<TargetKind>('post');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferBid, setTransferBid] = useState('');
  const [transferCatalogue, setTransferCatalogue] = useState<Awaited<ReturnType<typeof group07Service.promotionCatalogue>> | null>(null);

  const publicProperties = useMemo(() => properties.filter((property) => property.approvalStatus === 'approved' && ['available', 'under_offer'].includes(String(property.status).toLowerCase())), [properties]);
  const optionsFor = (kind: TargetKind): Option[] => {
    if (kind === 'post') return posts.filter((post) => post.state === 'published').map((post) => ({ id: post.id, label: post.caption.slice(0, 90) || 'Published post', kind }));
    if (kind === 'property') return publicProperties.map((property) => ({ id: property._id, label: property.title, kind }));
    if (kind === 'project') return projects.filter((project) => project.isPublished === true).map((project) => ({ id: project._id, label: project.name, kind }));
    if (kind === 'partner_service') return (partner?.services ?? []).filter((service) => service.state === 'approved' && service.bookable).map((service) => ({ id: service.id, label: service.label, kind }));
    return partner?.profileId ? [{ id: partner.profileId, label: partner.kind.replaceAll('_', ' '), kind }] : [];
  };
  const shareOptions = optionsFor(shareKind);
  const campaignOptions = optionsFor(campaignKind);
  const transferOptions = optionsFor(transferTargetKind);

  const load = async () => {
    if (!profileId) { setLoading(false); setError('Select a profile before opening sharing and promotion tools.'); return; }
    const requestProfile = profileId;
    setLoading(true); setError(''); setNotice('');
    try {
      const [postsResult, propertyResult, projectResult, partnerResult, kitsResult, broadcastsResult, campaignsResult] = await Promise.allSettled([
        (async () => { const all: Array<{ id: string; caption: string; state: string }> = []; let after: string | null = null; do { const page = await group07Service.myPosts(after); all.push(...page.posts.map((post) => ({ id: post.id, caption: post.caption, state: post.state }))); after = page.nextCursor; } while (after); return all; })(),
        (async () => { const all: Property[] = []; let page = 1; let total = 0; do { const result = await propertyService.getMyProperties(page, 100); all.push(...result.properties); total = result.total; page += 1; } while (all.length < total && page <= 100); return all; })(),
        (async () => { const all: ProjectCard[] = []; let page = 1; let total = 0; do { const result = await projectService.listMyProjects({ page, limit: 100, publicationState: 'all' }); all.push(...result.projects); total = result.total; page += 1; } while (all.length < total && page <= 100); return all; })(),
        activeProfile?.kind.endsWith('_partner') ? group07Service.partnerCurrent() : Promise.resolve(null),
        group07Service.shareKits(), group07Service.leadBroadcasts(), group07Service.myPromotions(),
      ]);
      if (profileRef.current !== requestProfile) return;
      if (postsResult.status === 'fulfilled') setPosts(postsResult.value); else setPosts([]);
      if (propertyResult.status === 'fulfilled') setProperties(propertyResult.value); else setProperties([]);
      if (projectResult.status === 'fulfilled') setProjects(projectResult.value); else setProjects([]);
      if (partnerResult.status === 'fulfilled') setPartner(partnerResult.value); else setPartner(null);
      if (kitsResult.status === 'fulfilled') setKits(kitsResult.value.kits); else setKits([]);
      if (broadcastsResult.status === 'fulfilled') setBroadcasts(broadcastsResult.value.broadcasts); else setBroadcasts([]);
      if (campaignsResult.status === 'fulfilled') setCampaigns(campaignsResult.value.campaigns); else setCampaigns([]);
      const failures = [postsResult, propertyResult, projectResult, kitsResult, broadcastsResult, campaignsResult].filter((result) => result.status === 'rejected');
      if (failures.length) setNotice('Some tools are unavailable for this selected profile. Available controls use only records returned by the current profile APIs.');
    } catch (raw) { if (profileRef.current === requestProfile) setError(raw instanceof Error ? raw.message : 'Sharing and promotion tools are unavailable.'); }
    finally { if (profileRef.current === requestProfile) setLoading(false); }
  };
  useEffect(() => { setPosts([]); setProperties([]); setProjects([]); setPartner(null); setKits([]); setBroadcasts([]); setCampaigns([]); setCampaignDetail(null); setSelectedCampaignId(''); setCatalogue(null); setTransferCatalogue(null); setShareTargetId(''); setShareBody(null); setCampaignTargetId(''); setCampaignBody(null); setBroadcastBody(null); stepUp.cancel(); void load(); }, [profileId]);

  const refreshKits = async () => { try { setKits((await group07Service.shareKits()).kits); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Share kits could not be refreshed.'); } };
  const createKit = async (event: FormEvent) => {
    event.preventDefault(); if (!shareTargetId || kitBusy) return;
    const exactBody = shareBody && shareBody.targetKind === shareKind && shareBody.targetId === shareTargetId ? shareBody : { targetKind: shareKind, targetId: shareTargetId, operationKey: key() };
    setShareBody(exactBody);
    setKitBusy(true); setError('');
    try { const kit = await group07Service.createShareKit(exactBody); setKits((old) => [kit, ...old]); setShareTargetId(''); setShareBody(null); toast.success('Share kit created from the current public record.'); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'The share kit could not be created. Refresh the selected target before retrying.'); }
    finally { setKitBusy(false); }
  };
  const revokeKit = async (id: string) => { try { const kit = await group07Service.revokeShareKit(id); setKits((old) => old.map((item) => item.id === id ? kit : item)); toast.success('Share link revoked.'); } catch (raw) { setError(raw instanceof Error ? raw.message : 'The share link could not be revoked.'); } };

  const createBroadcast = async (event: FormEvent) => {
    event.preventDefault(); if (broadcastBusy) return;
    const body = broadcastBody ?? { propertyId: broadcastPropertyId, title: broadcastTitle.trim(), message: broadcastMessage.trim(), operationKey: key() };
    if (!body.propertyId || !body.title || !body.message) return;
    setBroadcastBody(body); setBroadcastBusy(true); setError('');
    try { const broadcast = await group07Service.createLeadBroadcast(body); setBroadcasts((old) => [broadcast, ...old]); setBroadcastBody(null); setBroadcastTitle(''); setBroadcastMessage(''); toast.success('Broadcast queued. Delivery and skipped counts will update from the server.'); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'The broadcast request could not be confirmed. Retry the unchanged request only.'); }
    finally { setBroadcastBusy(false); }
  };
  const refreshBroadcast = async (id: string) => { try { const current = await group07Service.leadBroadcast(id); setBroadcasts((old) => old.map((item) => item.id === id ? current : item)); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Broadcast status could not be refreshed.'); } };
  const updateBroadcast = async (broadcast: Group07LeadBroadcast, action: 'cancel' | 'retry') => {
    try { const updated = action === 'cancel' ? await group07Service.cancelLeadBroadcast(broadcast.id, broadcast.version) : await group07Service.retryLeadBroadcast(broadcast.id, broadcast.version); setBroadcasts((old) => old.map((item) => item.id === updated.id ? updated : item)); toast.success(`Broadcast ${action === 'cancel' ? 'canceled' : 'retried'} according to the server state.`); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Broadcast state changed. Refresh before taking another action.'); }
  };

  useEffect(() => {
    setCatalogue(null); setProductId(''); setAudience({ priceBand: '', buyerType: '', residence: '', buyerCountry: '' }); setAudienceState(null); setAudienceLga(null); setAudienceArea(null);
    if (!campaignTargetId) return;
    let current = true; setCatalogueLoading(true);
    void group07Service.promotionCatalogue(campaignKind as 'post' | 'partner_service' | 'directory_spotlight', campaignTargetId).then((result) => { if (current) setCatalogue(result); }).catch((raw) => { if (current) setNotice(raw instanceof Error ? raw.message : 'The approved promotion catalogue is unavailable.'); }).finally(() => { if (current) setCatalogueLoading(false); });
    return () => { current = false; };
  }, [campaignKind, campaignTargetId]);

  useEffect(() => {
    setTransferCatalogue(null); setTransferProductId('');
    if (!transferTargetId || !campaignDetail?.campaign) return;
    let current = true;
    void group07Service.promotionCatalogue(transferTargetKind as 'post' | 'partner_service' | 'directory_spotlight', transferTargetId).then((result) => { if (current) setTransferCatalogue(result); }).catch((raw) => { if (current) setNotice(raw instanceof Error ? raw.message : 'The next campaign catalogue is unavailable.'); });
    return () => { current = false; };
  }, [transferTargetKind, transferTargetId, campaignDetail?.campaign.id]);

  const loadCampaigns = async () => { try { const result = await group07Service.myPromotions(); setCampaigns(result.campaigns); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Campaigns could not be refreshed.'); } };
  const loadCampaignDetail = async (id: string) => { setSelectedCampaignId(id); setEndBody(null); setTransferCatalogue(null); try { const result = await group07Service.promotionDetail(id); setCampaignDetail(result); } catch (raw) { setCampaignDetail(null); setError(raw instanceof Error ? raw.message : 'Campaign status is unavailable.'); } };
  const audienceValue = () => {
    if (audience.buyerCountry && !/^[A-Z]{2}$/.test(audience.buyerCountry)) throw new Error('Enter a two-letter uppercase country code.');
    const value = { ...(audienceArea ? { areaId: audienceArea.id } : {}), ...(audience.priceBand ? { priceBand: audience.priceBand } : {}), ...(audience.buyerType ? { buyerType: audience.buyerType } : {}), ...(audience.residence ? { residence: audience.residence } : {}), ...(audience.buyerCountry ? { buyerCountry: audience.buyerCountry } : {}) };
    return Object.keys(value).length ? value : undefined;
  };
  const selectedProduct = catalogue?.products.find((product) => product.productId === productId);
  const createCampaign = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedProduct || !campaignTargetId || stepUp.busy || stepUp.challenge) return;
    let audienceDraft: Record<string, unknown> | undefined;
    try { audienceDraft = audienceValue(); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Check the audience values.'); return; }
    const fixed = selectedProduct.mode === 'fixed_package';
    const budgetMinor = Math.round(Number(budget) * 100); const bidMinor = Math.round(Number(bid) * 100);
    if (!fixed && (!Number.isSafeInteger(budgetMinor) || !Number.isSafeInteger(bidMinor) || budgetMinor <= 0 || bidMinor <= 0 || (selectedProduct.minimumBidMinor !== null && bidMinor < selectedProduct.minimumBidMinor) || bidMinor > budgetMinor)) { setError('Enter a valid prepaid budget and bid that meet the current product minimum.'); return; }
    const fields = { targetKind: campaignKind, targetId: campaignTargetId, productId: selectedProduct.productId, currency: selectedProduct.currency, ...(!fixed ? { budgetMinor, bidMinor } : {}), ...(audienceDraft ? { audience: audienceDraft } : {}) };
    const sameLogicalRequest = campaignBody && Object.entries(fields).every(([field, value]) => JSON.stringify(campaignBody[field]) === JSON.stringify(value)) && Object.keys(campaignBody).filter((field) => field !== 'operationKey').length === Object.keys(fields).length;
    const body = sameLogicalRequest ? campaignBody : { ...fields, operationKey: key() };
    setCampaignBody(body);
    setError('');
    const started = await stepUp.begin({ method: 'POST', path: '/api/posts/promotions', body, label: 'Start this paid promotion', execute: (challenge, exactBody) => group07Service.createPromotion(exactBody, challenge) });
    if (!started) setError(stepUp.getError() ?? 'The promotion request could not start. Refresh the current product before retrying.');
  };
  const endCampaign = async (disposition: 'refund' | 'transfer') => {
    if (!campaignDetail || !selectedCampaignId || stepUp.busy || stepUp.challenge) return;
    const campaign = campaignDetail.campaign;
    let nextCampaign: Record<string, unknown> | undefined;
    if (disposition === 'transfer') {
      const product = transferCatalogue?.products.find((item) => item.productId === transferProductId);
      if (!product || !transferTargetId || product.currency !== campaign.currency) { setError('Choose a current next campaign product using the original campaign currency.'); return; }
      const bidMinor = Math.round(Number(transferBid) * 100);
      if (product.mode === 'bidding' && (!Number.isSafeInteger(bidMinor) || bidMinor < (product.minimumBidMinor ?? 1) || bidMinor > campaign.remainingMinor)) { setError('The next bid must meet the approved product minimum and fit within unused value.'); return; }
      nextCampaign = { targetKind: transferTargetKind, targetId: transferTargetId, productId: product.productId, currency: product.currency, ...(product.mode === 'bidding' ? { bidMinor } : {}) };
    }
    const body = endBody ?? { expectedVersion: campaign.version, operationKey: key(), disposition, ...(nextCampaign ? { nextCampaign } : {}) };
    if (endBody && JSON.stringify(endBody) !== JSON.stringify({ expectedVersion: campaign.version, operationKey: endBody.operationKey, disposition, ...(nextCampaign ? { nextCampaign } : {}) })) { setError('The requested campaign action changed. Reload campaign detail before starting a fresh protected action.'); setEndBody(null); return; }
    setEndBody(body); setError('');
    const path = `/api/posts/promotions/${encodeURIComponent(campaign.id)}/end`;
    const started = await stepUp.begin({ method: 'POST', path, body, label: disposition === 'refund' ? 'End campaign and request the eligible refund' : 'Move unused value directly to the next campaign', execute: (challenge, exactBody) => group07Service.endPromotion(campaign.id, exactBody, challenge) });
    if (!started) setError(stepUp.getError() ?? 'This protected campaign action could not start. Refresh before trying again.');
  };
  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The protected action was not confirmed. Refresh the current record.'); return false; }
    setCampaignBody(null);
    setEndBody(null); setNotice('The server recorded the campaign action. Provider payment or refund state still requires server confirmation.');
    const value = object(result.value); const campaign = object(value.campaign);
    if (campaign && campaign.payment) {
      const payment = object(campaign.payment);
      if (payment.state === 'pending_payment' && payment.reconciliationRequired !== true && typeof payment.checkoutUrl === 'string') { window.location.assign(payment.checkoutUrl); return true; }
      if (typeof campaign.id === 'string') { await loadCampaigns(); await loadCampaignDetail(campaign.id); return true; }
    }
    await loadCampaigns(); if (selectedCampaignId) await loadCampaignDetail(selectedCampaignId); return true;
  };
  const verifyCampaignPayment = async (campaign: Group07PromotionCampaign) => {
    const reference = campaign.payment?.reference;
    if (!reference || campaign.payment?.reconciliationRequired) { setError('This payment outcome is pending reconciliation. Refresh this same campaign; do not start another payment.'); return; }
    try { await paymentService.verifyPayment(reference); setNotice('Payment status was checked against the same server reference. Refreshing campaign state.'); await loadCampaigns(); await loadCampaignDetail(campaign.id); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'The same payment reference could not be checked. Do not start another payment.'); }
  };

  return <PublicLayout><main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-8"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Sharing and growth</p><h1 className="mt-2 text-3xl font-black">Share, promote and update clients</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Use current public records, approved products and server-confirmed delivery. No buyer contact list is exposed.</p></div><Link to="/dashboard/community" className="font-bold text-primary underline">Open Community</Link></header>
    {loading ? <p role="status">Loading current profile records…</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p> : null}{notice ? <p role="status" className="rounded-lg bg-surface-container-low p-3">{notice}</p> : null}
    <nav aria-label="Sharing and growth tools" className="flex flex-wrap gap-2">{(['share', 'broadcasts', 'promotions'] as const).map((item) => <button type="button" key={item} onClick={() => setTab(item)} aria-current={tab === item ? 'page' : undefined} className={`rounded-lg px-4 py-2 font-bold capitalize ${tab === item ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{item === 'share' ? 'Share kits' : item === 'broadcasts' ? 'Client updates' : 'Paid promotions'}</button>)}</nav>
    {tab === 'share' ? <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><form onSubmit={(event) => void createKit(event)} className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Create a tracked share kit</h2><p className="text-sm text-secondary">The server supplies the public card, printable flyer data, QR value and optional share links.</p><label className="block text-sm font-bold">Content type<select value={shareKind} onChange={(event) => { setShareKind(event.target.value as typeof shareKind); setShareTargetId(''); }} className="mt-1 block w-full rounded border p-3"><option value="post">Public post</option><option value="property">Property</option><option value="project">Project</option></select></label><label className="block text-sm font-bold">Select current record<select required value={shareTargetId} onChange={(event) => setShareTargetId(event.target.value)} className="mt-1 block w-full rounded border p-3"><option value="">Choose a record</option>{shareOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button disabled={kitBusy || !shareTargetId} className="rounded bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">{kitBusy ? 'Creating…' : 'Create share kit'}</button>{!shareOptions.length ? <p role="status" className="text-sm text-secondary">No current public {shareKind} records were returned for this profile.</p> : null}</form>
      <div className="space-y-3"><div className="flex justify-end"><button type="button" onClick={() => void refreshKits()} className="font-bold text-primary underline">Refresh share kits</button></div>{kits.map((kit) => <ShareKitCard key={kit.id} kit={kit} onRevoke={() => void revokeKit(kit.id)} />)}{!kits.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No share kits are available for this profile yet.</p> : null}</div></section> : null}
    {tab === 'broadcasts' ? <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><form onSubmit={(event) => void createBroadcast(event)} className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Send a client update</h2><p className="text-sm text-secondary">A broadcast goes only to eligible buyers who opted into updates for this public listing. The server reports aggregate counts only.</p><label className="block text-sm font-bold">Public listing<select required value={broadcastPropertyId} onChange={(event) => { setBroadcastPropertyId(event.target.value); setBroadcastBody(null); }} className="mt-1 block w-full rounded border p-3"><option value="">Choose a public listing</option>{publicProperties.map((property) => <option key={property._id} value={property._id}>{property.title} · {property.status}</option>)}</select></label><label className="block text-sm font-bold">Title<input required maxLength={140} value={broadcastTitle} onChange={(event) => { setBroadcastTitle(event.target.value); setBroadcastBody(null); }} className="mt-1 block w-full rounded border p-3" /></label><label className="block text-sm font-bold">Message<textarea required maxLength={500} rows={5} value={broadcastMessage} onChange={(event) => { setBroadcastMessage(event.target.value); setBroadcastBody(null); }} className="mt-1 block w-full rounded border p-3" /></label><button disabled={broadcastBusy || !broadcastPropertyId || !broadcastTitle.trim() || !broadcastMessage.trim()} className="rounded bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">{broadcastBusy ? 'Submitting…' : broadcastBody ? 'Retry same broadcast' : 'Queue client update'}</button>{!publicProperties.length ? <p role="status" className="text-sm text-secondary">No approved available or under-offer listings were returned for this selected profile.</p> : null}</form>
      <div className="space-y-3">{broadcasts.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.title}</h3><span className="rounded-full bg-surface-container-low px-3 py-1 text-sm capitalize">{item.state}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{item.message}</p><p className="mt-2 text-sm">Delivered {item.delivered} · skipped {item.skipped} · scanned {item.scanned}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void refreshBroadcast(item.id)} className="rounded border px-3 py-2 text-sm font-bold">Refresh status</button>{['queued', 'processing', 'held'].includes(item.state) ? <button type="button" onClick={() => void updateBroadcast(item, 'cancel')} className="rounded border px-3 py-2 text-sm font-bold">Cancel broadcast</button> : null}{item.state === 'held' ? <button type="button" onClick={() => void updateBroadcast(item, 'retry')} className="rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary">Retry held broadcast</button> : null}</div></article>)}{!broadcasts.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No client update broadcasts have been returned.</p> : null}</div></section> : null}
    {tab === 'promotions' ? <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><section className="space-y-5"><form onSubmit={(event) => void createCampaign(event)} className="space-y-4 rounded-2xl border bg-white p-5"><div><h2 className="text-xl font-black">Request a paid placement</h2><p className="text-sm text-secondary">Only products returned by the approved catalogue are available. Creating a campaign may start checkout; a redirect does not confirm payment.</p></div><label className="block text-sm font-bold">Placement target<select value={campaignKind} onChange={(event) => { setCampaignKind(event.target.value as TargetKind); setCampaignTargetId(''); }} className="mt-1 block w-full rounded border p-3"><option value="post">Post</option><option value="partner_service">Partner service</option><option value="directory_spotlight">Partner directory spotlight</option></select></label><label className="block text-sm font-bold">Select target<select value={campaignTargetId} onChange={(event) => setCampaignTargetId(event.target.value)} className="mt-1 block w-full rounded border p-3"><option value="">Choose a current target</option>{campaignOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>{catalogueLoading ? <p role="status">Loading approved products…</p> : null}{catalogue ? <><p className="rounded-lg bg-surface-container-low p-3 text-sm">Catalogue: {catalogue.state.replaceAll('_', ' ')}{catalogue.reasonCode ? ` · ${catalogue.reasonCode.replaceAll('_', ' ')}` : ''}</p><label className="block text-sm font-bold">Approved product<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 block w-full rounded border p-3"><option value="">Choose a returned product</option>{catalogue.products.map((product) => <option key={product.productId} value={product.productId}>{product.slot.replaceAll('_', ' ')} · {product.mode.replaceAll('_', ' ')} · {amount(product.priceMinor ?? product.minimumBidMinor, product.currency)}{product.durationDays ? ` · ${product.durationDays} days` : ''}</option>)}</select></label>{selectedProduct?.mode === 'bidding' ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Prepaid budget<input type="number" min="0.01" step="0.01" required value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-1 block w-full rounded border p-3" />{selectedProduct.minimumBidMinor !== null ? <span className="text-xs font-normal">Minimum bid {amount(selectedProduct.minimumBidMinor, selectedProduct.currency)} · budget in {selectedProduct.currency}</span> : null}</label><label className="text-sm font-bold">Bid amount<input type="number" min="0.01" step="0.01" required value={bid} onChange={(event) => setBid(event.target.value)} className="mt-1 block w-full rounded border p-3" /></label></div> : null}
        {selectedProduct ? <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-bold">Audience filters (optional)</legend>{catalogue.audienceOptions.priceBands?.length ? <label className="block text-sm font-semibold">Price band<select value={audience.priceBand} onChange={(event) => setAudience((old) => ({ ...old, priceBand: event.target.value }))} className="mt-1 block w-full rounded border p-2"><option value="">Any price band</option>{catalogue.audienceOptions.priceBands.map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select></label> : null}{catalogue.audienceOptions.buyerTypes?.length ? <label className="block text-sm font-semibold">Buyer profile<select value={audience.buyerType} onChange={(event) => setAudience((old) => ({ ...old, buyerType: event.target.value }))} className="mt-1 block w-full rounded border p-2"><option value="">Any buyer profile</option>{catalogue.audienceOptions.buyerTypes.map((value) => <option key={value}>{value}</option>)}</select></label> : null}{catalogue.audienceOptions.residences?.length ? <label className="block text-sm font-semibold">Residence<select value={audience.residence} onChange={(event) => setAudience((old) => ({ ...old, residence: event.target.value }))} className="mt-1 block w-full rounded border p-2"><option value="">Any residence</option>{catalogue.audienceOptions.residences.map((value) => <option key={value}>{value}</option>)}</select></label> : null}{catalogue.audienceOptions.buyerCountry ? <label className="block text-sm font-semibold">Buyer country<input value={audience.buyerCountry} maxLength={2} onChange={(event) => setAudience((old) => ({ ...old, buyerCountry: event.target.value.toUpperCase() }))} className="mt-1 block w-full rounded border p-2" placeholder="Two-letter code" /></label> : null}{catalogue.audienceOptions.area ? <div className="grid gap-2 sm:grid-cols-3"><LocationSuggestionInput label="State" level="state" value={audienceStateText} onChange={(value) => { setAudienceStateText(value); setAudienceState(null); setAudienceLga(null); setAudienceArea(null); }} onSelect={(value) => { setAudienceState(value); setAudienceStateText(value.name); setAudienceLga(null); setAudienceArea(null); setAudienceLgaText(''); setAudienceAreaText(''); }} className="w-full rounded border p-2"/><LocationSuggestionInput label="LGA" level="lga" parentId={audienceState?.id} enabled={Boolean(audienceState)} value={audienceLgaText} onChange={(value) => { setAudienceLgaText(value); setAudienceLga(null); setAudienceArea(null); }} onSelect={(value) => { setAudienceLga(value); setAudienceLgaText(value.name); setAudienceArea(null); setAudienceAreaText(''); }} className="w-full rounded border p-2"/><LocationSuggestionInput label="Area" level="area" parentId={audienceLga?.id} enabled={Boolean(audienceLga)} value={audienceAreaText} onChange={(value) => { setAudienceAreaText(value); setAudienceArea(null); }} onSelect={(value) => { setAudienceArea(value); setAudienceAreaText(value.name); }} className="w-full rounded border p-2" /></div> : null}<p className="text-xs text-secondary">Only audience values returned by the server and current approved gazetteer IDs are sent. Buyer identity, country, saved-search eligibility and matching remain server-checked.</p></fieldset> : null}
        <button disabled={!selectedProduct || !campaignTargetId || catalogue.state !== 'ready' || stepUp.busy || Boolean(stepUp.challenge)} className="rounded bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">Continue with authenticator</button></> : null}{!campaignOptions.length ? <p role="status" className="text-sm text-secondary">No current targets of this kind were returned for the selected profile.</p> : null}</form>
      </section>
      <div className="space-y-3 rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Current campaigns</h2><button type="button" onClick={() => void loadCampaigns()} className="font-bold text-primary underline">Refresh</button></div>{campaigns.map((campaign) => <button key={campaign.id} type="button" onClick={() => void loadCampaignDetail(campaign.id)} className={`block w-full rounded-lg border p-3 text-left ${selectedCampaignId === campaign.id ? 'border-primary bg-surface-container-low' : ''}`}><span className="flex justify-between gap-2 font-bold"><span>{campaign.targetKind.replaceAll('_', ' ')} placement</span><span className="capitalize">{campaign.state.replaceAll('_', ' ')}</span></span><span className="mt-1 block text-sm">Spent {amount(campaign.spentMinor, campaign.currency)} · remaining {amount(campaign.remainingMinor, campaign.currency)} · {campaign.impressions} impressions</span></button>)}{!campaigns.length ? <p className="text-sm text-secondary">No paid campaigns were returned.</p> : null}{campaignDetail ? <CampaignDetail detail={campaignDetail} onVerify={() => void verifyCampaignPayment(campaignDetail.campaign)} onEnd={(disposition) => void endCampaign(disposition)} canEnd={['active', 'paused'].includes(campaignDetail.campaign.state)} transferTargetKind={transferTargetKind} setTransferTargetKind={setTransferTargetKind} transferTargetId={transferTargetId} setTransferTargetId={setTransferTargetId} transferOptions={transferOptions} transferProductId={transferProductId} setTransferProductId={setTransferProductId} transferCatalogue={transferCatalogue} transferBid={transferBid} setTransferBid={setTransferBid} currency={campaignDetail.campaign.currency} remainingMinor={campaignDetail.campaign.remainingMinor} /> : null}</div></div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></PublicLayout>;
}

function ShareKitCard({ kit, onRevoke }: { kit: Group07ShareKit; onRevoke: () => void }) {
  return <article className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{kit.card?.title ?? 'Share kit'}</h3><p className="text-sm text-secondary">{kit.targetKind.replaceAll('_', ' ')} · {kit.state.replaceAll('_', ' ')}</p></div>{kit.state === 'ready' ? <button type="button" onClick={onRevoke} className="rounded border px-3 py-2 text-sm font-bold">Revoke link</button> : null}</div>{kit.state === 'ready' && kit.card ? <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]"><div className="rounded-xl border p-4 print:border-black"><h4 className="font-black">{kit.printable?.title ?? kit.card.title}</h4><p className="mt-2 text-sm">{kit.printable?.description ?? kit.card.description}</p>{kit.card.imageUrl ? <img src={kit.card.imageUrl} alt="Share card cover" className="mt-3 max-h-52 w-full rounded object-cover" /> : null}{kit.shareUrl ? <p className="mt-3 break-all text-xs text-primary">{kit.shareUrl}</p> : <p className="mt-3 text-xs text-secondary">A public share URL is unavailable until the public origin is configured.</p>}<button type="button" onClick={() => window.print()} className="mt-3 rounded border px-3 py-2 text-sm font-bold print:hidden">Print flyer</button></div>{kit.qrValue ? <div className="flex flex-col items-center gap-2 rounded-xl border p-4"><QRCodeSVG value={kit.qrValue} size={160} includeMargin aria-label="Tracked share QR code"/><span className="max-w-40 break-all text-center text-xs text-secondary">Tracked link QR</span></div> : null}</div> : <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Share outputs are unavailable for this target or public-origin configuration.</p>}{kit.whatsAppUrl ? <a href={kit.whatsAppUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-bold text-primary underline">Share using WhatsApp</a> : null}<p className="mt-2 text-xs text-secondary">Tracked opens: {kit.openedCount}{kit.lastOpenedAt ? ` · last opened ${new Date(kit.lastOpenedAt).toLocaleDateString('en-GB')}` : ''}</p></article>;
}

function CampaignDetail({ detail, onVerify, onEnd, canEnd, transferTargetKind, setTransferTargetKind, transferTargetId, setTransferTargetId, transferOptions, transferProductId, setTransferProductId, transferCatalogue, transferBid, setTransferBid, currency, remainingMinor }: { detail: Awaited<ReturnType<typeof group07Service.promotionDetail>>; onVerify: () => void; onEnd: (disposition: 'refund' | 'transfer') => void; canEnd: boolean; transferTargetKind: TargetKind; setTransferTargetKind: (value: TargetKind) => void; transferTargetId: string; setTransferTargetId: (value: string) => void; transferOptions: Option[]; transferProductId: string; setTransferProductId: (value: string) => void; transferCatalogue: Awaited<ReturnType<typeof group07Service.promotionCatalogue>> | null; transferBid: string; setTransferBid: (value: string) => void; currency: string; remainingMinor: number }) {
  const campaign = detail.campaign;
  const transferProduct = transferCatalogue?.products.find((product) => product.productId === transferProductId);
  const comparison = detail.organicComparison;
  return <article className="mt-4 space-y-3 rounded-xl bg-surface-container-low p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Campaign details</h3><span className="capitalize">{campaign.state.replaceAll('_', ' ')}</span></div><p className="text-sm">Budget {amount(campaign.grossMinor, currency)} · spent {amount(campaign.spentMinor, currency)} · unused {amount(campaign.remainingMinor, currency)} · impressions {campaign.impressions} · clicks {campaign.clicks} · enquiries {campaign.enquiries} · viewings {campaign.viewings}</p><p className="text-xs text-secondary">Organic comparison: {comparison.state.replaceAll('_', ' ')}{comparison.impressions.organic !== null ? ` · ${comparison.impressions.organic} organic and ${comparison.impressions.sponsored} sponsored card impressions in the returned period` : ' · an organic baseline is not available'}{comparison.period ? ` · ${new Date(comparison.period.from).toLocaleDateString('en-GB')}–${new Date(comparison.period.to).toLocaleDateString('en-GB')}` : ''}</p>{campaign.payment?.state === 'pending_payment' ? <div className="rounded-lg bg-amber-50 p-3 text-sm"><p>Payment is pending on the original server reference. A provider redirect is not confirmation.</p>{campaign.payment.reconciliationRequired ? <p className="mt-1">The outcome needs reconciliation. Do not start another payment.</p> : campaign.payment.checkoutUrl ? <a href={campaign.payment.checkoutUrl} className="mt-2 inline-block font-bold underline">Continue the original checkout</a> : null}<button type="button" onClick={onVerify} className="mt-2 block font-bold underline">Check this same payment reference</button></div> : null}{typeof detail.refund === 'object' && detail.refund ? <p className="text-sm">Refund state: {String(object(detail.refund).state ?? 'not returned').replaceAll('_', ' ')}. Provider completion is server-confirmed separately.</p> : null}{detail.transfer ? <p className="text-sm">Unused value was transferred according to the server record: {amount(Number(object(detail.transfer).netMinor), currency)} net. The campaign still uses its original funding provenance.</p> : null}
    {canEnd ? <div className="space-y-3 border-t pt-3"><h4 className="font-bold">End this campaign</h4><button type="button" onClick={() => onEnd('refund')} className="rounded border px-3 py-2 text-sm font-bold">End and request eligible refund</button><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm font-semibold">Next campaign target<select value={transferTargetKind} onChange={(event) => { setTransferTargetKind(event.target.value as TargetKind); setTransferTargetId(''); setTransferProductId(''); }} className="mt-1 block w-full rounded border p-2"><option value="post">Post</option><option value="partner_service">Partner service</option><option value="directory_spotlight">Partner directory spotlight</option></select></label><label className="text-sm font-semibold">Target<select value={transferTargetId} onChange={(event) => { setTransferTargetId(event.target.value); setTransferProductId(''); }} className="mt-1 block w-full rounded border p-2"><option value="">Choose current target</option>{transferOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div>{transferCatalogue ? <><label className="block text-sm font-semibold">Current product in {currency}<select value={transferProductId} onChange={(event) => setTransferProductId(event.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Choose a product</option>{transferCatalogue.products.filter((product) => product.currency === currency).map((product) => <option key={product.productId} value={product.productId}>{product.slot.replaceAll('_', ' ')} · {product.mode.replaceAll('_', ' ')} · {amount(product.priceMinor ?? product.minimumBidMinor, product.currency)}</option>)}</select></label>{transferProduct?.mode === 'bidding' ? <label className="block text-sm font-semibold">Next bid<input type="number" step="0.01" min="0.01" max={remainingMinor / 100} value={transferBid} onChange={(event) => setTransferBid(event.target.value)} className="mt-1 block w-full rounded border p-2"/><span className="text-xs font-normal">Must meet the approved minimum and stay within the unused value.</span></label> : null}<button type="button" disabled={!transferProduct || !transferTargetId} onClick={() => onEnd('transfer')} className="rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary disabled:opacity-50">Transfer unused value to this campaign</button></> : transferTargetId ? <p role="status" className="text-sm text-secondary">Loading products approved for this target…</p> : null}<p className="text-xs text-secondary">Transfer uses the original currency and payment provenance. The server confirms compatibility and the movement; no new charge or account balance is created.</p></div> : null}</article>;
}
