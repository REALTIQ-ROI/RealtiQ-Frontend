import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { virtualTourService } from '../../services/virtualTourService';
import type { AdminVirtualTourSettingsResponse, PublicProviderAvailability, VirtualTourProvider } from '../../types/virtualTour';
import Button from '../ui/Button';
import StepUpDialog from '../auth/StepUpDialog';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';

const AdminVirtualTourSettings = () => {
  const [settings, setSettings] = useState<PublicProviderAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepUp = useBoundStepUp<AdminVirtualTourSettingsResponse>();
  useEffect(() => { virtualTourService.getVirtualTourProviders().then(setSettings).catch((raw: unknown) => setError(raw instanceof Error ? raw.message : 'Unable to load virtual-tour settings.')); }, []);
  if (error) return <section className="rounded-xl bg-white p-6 text-error">{error}</section>;
  if (!settings) return <section className="rounded-xl bg-white p-6">Loading virtual-tour settings...</section>;
  const defaultEnabled = settings.providers[settings.defaultProvider].enabled;
  const toggleProvider = (provider: VirtualTourProvider) => setSettings({ ...settings, providers: { ...settings.providers, [provider]: { enabled: !settings.providers[provider].enabled } } });
  const save = async () => {
    if (!defaultEnabled || saving || stepUp.busy || stepUp.challenge) return;
    const body = {
      enabled: settings.enabled,
      defaultProvider: settings.defaultProvider,
      providers: settings.providers,
      ...(settings.version !== undefined ? { expectedVersion: settings.version } : {}),
    };
    setSaving(true);
    const started = await stepUp.begin({
      method: 'PATCH',
      path: '/api/admin/settings/virtual-tours',
      body,
      label: 'Update global virtual-tour provider settings',
      execute: (challengeId, exactBody) => virtualTourService.updateAdminVirtualTourSettings(exactBody, challengeId),
    });
    if (!started) {
      setSaving(false);
      toast.error(stepUp.getError() ?? 'The protected settings update could not start.');
    }
  };
  const completeSave = async (code: string): Promise<boolean> => {
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) {
        toast.error(result.error ?? 'The settings update was not accepted. Review the current server state before trying again.');
        return false;
      }
      setSettings((current) => current ? { ...current, ...result.value } : current);
      toast.success('Global virtual-tour settings saved. Existing Property records were not changed.');
      return true;
    } finally {
      setSaving(false);
    }
  };
  return <section className="rounded-xl border border-outline-variant/10 bg-white p-8">
    <h2 className="text-xl font-black">Virtual Tours / Digital Twins</h2><p className="mt-1 text-sm text-secondary">Global availability and resolution default. Changing this does not mutate Properties.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 font-bold">Platform enabled <input type="checkbox" checked={settings.enabled} onChange={() => setSettings({ ...settings, enabled: !settings.enabled })} /></label>
      {(['realsee', 'matterport'] as const).map((provider) => <label key={provider} className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 font-bold capitalize">{provider} enabled <input type="checkbox" checked={settings.providers[provider].enabled} onChange={() => toggleProvider(provider)} /></label>)}
      <label className="space-y-1 text-sm font-bold">Default provider<select className="block w-full rounded-lg border border-outline-variant/20 px-3 py-2" value={settings.defaultProvider} onChange={(event) => setSettings({ ...settings, defaultProvider: event.target.value as VirtualTourProvider })}><option value="realsee">Realsee</option><option value="matterport">Matterport</option></select></label>
    </div>
    {!defaultEnabled ? <p className="mt-3 text-sm font-bold text-error">Enable the selected default provider before saving.</p> : null}
    <div className="mt-5"><Button type="button" disabled={!defaultEnabled || saving || stepUp.busy || Boolean(stepUp.challenge)} loading={saving || stepUp.busy} onClick={() => void save()}>Save virtual-tour settings</Button></div>
    <StepUpDialog challenge={stepUp.challenge} busy={saving || stepUp.busy} error={stepUp.error} onCancel={() => { stepUp.cancel(); setSaving(false); }} onSubmit={completeSave} />
  </section>;
};

export default AdminVirtualTourSettings;
