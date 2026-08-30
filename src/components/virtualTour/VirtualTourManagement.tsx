import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { PublicProviderAvailability, VirtualTourProvider, VirtualTourSummary } from '../../types/virtualTour';
import { virtualTourService } from '../../services/virtualTourService';
import Button from '../ui/Button';

interface Props {
  propertyId: string;
  summary?: VirtualTourSummary;
  providerOverride?: VirtualTourProvider | null;
  onUpdated: () => Promise<unknown> | unknown;
}

const VirtualTourManagement = ({ propertyId, summary, providerOverride, onUpdated }: Props) => {
  const [availability, setAvailability] = useState<PublicProviderAvailability | null>(null);
  const [workId, setWorkId] = useState('');
  const [workUrl, setWorkUrl] = useState('');
  const [vrUrl, setVrUrl] = useState('');
  const [modelSid, setModelSid] = useState('');
  const [showcaseUrl, setShowcaseUrl] = useState('');
  const [override, setOverride] = useState<VirtualTourProvider | ''>(providerOverride ?? '');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    virtualTourService.getVirtualTourProviders().then(setAvailability).catch(() => setAvailability(null));
  }, []);

  useEffect(() => setOverride(providerOverride ?? ''), [providerOverride]);

  const finish = async (message: string) => {
    toast.success(message);
    await onUpdated();
  };
  const fail = (raw: unknown) => toast.error(raw instanceof Error ? raw.message : 'Unable to update virtual-tour configuration.');

  const saveRealsee = async (event: FormEvent) => {
    event.preventDefault();
    if (!workId.trim()) { toast.error('Realsee Work ID is required.'); return; }
    setSaving('realsee');
    try {
      await virtualTourService.configurePropertyRealsee(propertyId, { workId: workId.trim(), ...(workUrl.trim() ? { workUrl: workUrl.trim() } : {}), ...(vrUrl.trim() ? { vrUrl: vrUrl.trim() } : {}) });
      await finish('Realsee configuration saved.');
    } catch (raw) { fail(raw); } finally { setSaving(null); }
  };

  const saveMatterport = async (event: FormEvent) => {
    event.preventDefault();
    if (modelSid.trim().length < 8 || modelSid.trim().length > 20) { toast.error('Enter a valid Matterport model SID.'); return; }
    setSaving('matterport');
    try {
      await virtualTourService.configurePropertyMatterport(propertyId, { modelSid: modelSid.trim(), ...(showcaseUrl.trim() ? { showcaseUrl: showcaseUrl.trim() } : {}) });
      await finish('Matterport configuration saved.');
    } catch (raw) { fail(raw); } finally { setSaving(null); }
  };

  const disable = async (provider: VirtualTourProvider) => {
    setSaving(`disable-${provider}`);
    try {
      if (provider === 'realsee') await virtualTourService.configurePropertyRealsee(propertyId, { enabled: false });
      else await virtualTourService.configurePropertyMatterport(propertyId, { enabled: false });
      await finish(`${provider === 'realsee' ? 'Realsee' : 'Matterport'} disabled. Its identifier remains stored by the server.`);
    } catch (raw) { fail(raw); } finally { setSaving(null); }
  };

  const saveOverride = async () => {
    setSaving('override');
    try {
      await virtualTourService.setPropertyVirtualTourProvider(propertyId, { provider: override || null });
      await finish(override ? 'Property provider preference saved.' : 'Property now inherits its Project or global preference.');
    } catch (raw) { fail(raw); } finally { setSaving(null); }
  };

  const canChoose = (provider: VirtualTourProvider) => Boolean(
    availability?.enabled && availability.providers[provider].enabled && summary?.providers[provider].enabled && summary.providers[provider].status === 'ready',
  );

  return <section className="mt-12 rounded-xl border border-outline-variant/10 bg-white p-6" aria-labelledby="virtual-tour-management-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="virtual-tour-management-heading" className="text-2xl font-black">Virtual Tour / Digital Twin</h2><p className="mt-1 text-sm text-secondary">Optional provider configuration. This is separate from paid Tour Booking.</p></div>
      <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">Resolved: {summary?.resolvedProvider ?? 'none'}{summary?.fallbackUsed ? ' (fallback)' : ''}</span>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={(event) => void saveRealsee(event)} className="space-y-3 rounded-xl bg-surface-container-low p-5">
        <h3 className="font-black">Realsee Five</h3>
        <input aria-label="Realsee Work ID" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2" placeholder="Work ID (required)" value={workId} onChange={(event) => setWorkId(event.target.value)} />
        <input aria-label="Realsee Work URL" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2" placeholder="Signed Work JSON URL (optional)" value={workUrl} onChange={(event) => setWorkUrl(event.target.value)} type="url" />
        <input aria-label="Realsee VR URL" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2" placeholder="VR URL (optional)" value={vrUrl} onChange={(event) => setVrUrl(event.target.value)} type="url" />
        <p className="text-xs text-secondary">Work-ID-only setup remains processing until a signed Work URL is supplied.</p>
        <div className="flex gap-2"><Button type="submit" loading={saving === 'realsee'}>Save Realsee</Button><Button type="button" variant="secondary" loading={saving === 'disable-realsee'} onClick={() => void disable('realsee')}>Disable</Button></div>
      </form>
      <form onSubmit={(event) => void saveMatterport(event)} className="space-y-3 rounded-xl bg-surface-container-low p-5">
        <h3 className="font-black">Matterport Showcase</h3>
        <input aria-label="Matterport model SID" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2" placeholder="Model SID (required)" value={modelSid} onChange={(event) => setModelSid(event.target.value)} minLength={8} maxLength={20} />
        <input aria-label="Matterport Showcase URL" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2" placeholder="Showcase URL (optional)" value={showcaseUrl} onChange={(event) => setShowcaseUrl(event.target.value)} type="url" />
        <p className="text-xs text-secondary">Validation may remain in progress while the tour provider connection is unavailable.</p>
        <div className="flex gap-2"><Button type="submit" loading={saving === 'matterport'}>Save Matterport</Button><Button type="button" variant="secondary" loading={saving === 'disable-matterport'} onClick={() => void disable('matterport')}>Disable</Button></div>
      </form>
    </div>
    <div className="mt-6 rounded-xl border border-outline-variant/10 p-5">
      <h3 className="font-black">Property provider preference</h3>
      <p className="mb-3 text-xs text-secondary">This preference does not configure a tour. RealtIQ selects the best available tour option.</p>
      <div className="flex flex-wrap gap-2"><select aria-label="Property virtual tour provider preference" value={override} onChange={(event) => setOverride(event.target.value as VirtualTourProvider | '')} className="rounded-lg border border-outline-variant/20 px-3 py-2"><option value="">Inherit Project / global default</option><option value="realsee" disabled={!canChoose('realsee')}>Realsee</option><option value="matterport" disabled={!canChoose('matterport')}>Matterport</option></select><Button type="button" loading={saving === 'override'} onClick={() => void saveOverride()}>Save preference</Button></div>
    </div>
  </section>;
};

export default VirtualTourManagement;
