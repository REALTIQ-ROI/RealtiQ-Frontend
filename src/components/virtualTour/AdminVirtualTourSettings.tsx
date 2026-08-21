import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { virtualTourService } from '../../services/virtualTourService';
import type { PublicProviderAvailability, VirtualTourProvider } from '../../types/virtualTour';
import Button from '../ui/Button';

const AdminVirtualTourSettings = () => {
  const [settings, setSettings] = useState<PublicProviderAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { virtualTourService.getVirtualTourProviders().then(setSettings).catch((raw: unknown) => setError(raw instanceof Error ? raw.message : 'Unable to load virtual-tour settings.')); }, []);
  if (error) return <section className="rounded-xl bg-white p-6 text-error">{error}</section>;
  if (!settings) return <section className="rounded-xl bg-white p-6">Loading virtual-tour settings...</section>;
  const defaultEnabled = settings.providers[settings.defaultProvider].enabled;
  const toggleProvider = (provider: VirtualTourProvider) => setSettings({ ...settings, providers: { ...settings.providers, [provider]: { enabled: !settings.providers[provider].enabled } } });
  const save = async () => {
    if (!defaultEnabled) return;
    setSaving(true);
    try {
      const result = await virtualTourService.updateAdminVirtualTourSettings({ enabled: settings.enabled, defaultProvider: settings.defaultProvider, providers: settings.providers });
      setSettings({ ...settings, ...result });
      toast.success('Global virtual-tour settings saved. Existing Property records were not changed.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to save virtual-tour settings.'); }
    finally { setSaving(false); }
  };
  return <section className="rounded-xl border border-outline-variant/10 bg-white p-8">
    <h2 className="text-xl font-black">Virtual Tours / Digital Twins</h2><p className="mt-1 text-sm text-secondary">Global availability and resolution default. Changing this does not mutate Properties.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 font-bold">Platform enabled <input type="checkbox" checked={settings.enabled} onChange={() => setSettings({ ...settings, enabled: !settings.enabled })} /></label>
      {(['realsee', 'matterport'] as const).map((provider) => <label key={provider} className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 font-bold capitalize">{provider} enabled <input type="checkbox" checked={settings.providers[provider].enabled} onChange={() => toggleProvider(provider)} /></label>)}
      <label className="space-y-1 text-sm font-bold">Default provider<select className="block w-full rounded-lg border border-outline-variant/20 px-3 py-2" value={settings.defaultProvider} onChange={(event) => setSettings({ ...settings, defaultProvider: event.target.value as VirtualTourProvider })}><option value="realsee">Realsee</option><option value="matterport">Matterport</option></select></label>
    </div>
    {!defaultEnabled ? <p className="mt-3 text-sm font-bold text-error">Enable the selected default provider before saving.</p> : null}
    <div className="mt-5"><Button type="button" disabled={!defaultEnabled} loading={saving} onClick={() => void save()}>Save virtual-tour settings</Button></div>
  </section>;
};

export default AdminVirtualTourSettings;
