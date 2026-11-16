import type { SavedSearchAlerts } from '../../types';

export const defaultSavedSearchAlerts: SavedSearchAlerts = {
  enabled: false,
  cadence: 'daily',
  triggers: { newListings: true, priceReductions: false },
  channels: { inApp: true, email: true, sms: false, whatsapp: false, push: false },
};

interface SavedSearchAlertsFieldsProps {
  value: SavedSearchAlerts;
  onChange: (next: SavedSearchAlerts) => void;
  idPrefix: string;
}

const channelOptions = [
  ['inApp', 'In-app'], ['email', 'Email'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp'], ['push', 'Push notifications'],
] as const;

export default function SavedSearchAlertsFields({ value, onChange, idPrefix }: SavedSearchAlertsFieldsProps) {
  const update = (patch: Partial<SavedSearchAlerts>) => onChange({ ...value, ...patch });
  return <fieldset className="space-y-3 rounded-lg border border-outline-variant/20 p-3">
    <legend className="px-1 text-sm font-bold">Alert preferences</legend>
    <label htmlFor={`${idPrefix}-enabled`} className="flex items-center gap-2 text-sm font-semibold"><input id={`${idPrefix}-enabled`} type="checkbox" checked={value.enabled} onChange={(event) => update({ enabled: event.target.checked })} />Enable alerts for this search</label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label htmlFor={`${idPrefix}-cadence`} className="text-sm font-semibold">Cadence<select id={`${idPrefix}-cadence`} value={value.cadence} onChange={(event) => update({ cadence: event.target.value as SavedSearchAlerts['cadence'] })} className="mt-1 block w-full rounded border bg-white px-3 py-2"><option value="instant">As soon as matching updates are processed</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
      <label htmlFor={`${idPrefix}-timezone`} className="text-sm font-semibold">Time zone (optional)<input id={`${idPrefix}-timezone`} value={value.timeZone ?? ''} onChange={(event) => update({ timeZone: event.target.value || undefined })} maxLength={80} placeholder="IANA time zone, e.g. Africa/Lagos" className="mt-1 block w-full rounded border bg-white px-3 py-2" /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Notify me about</legend>{([['newListings', 'New matching listings'], ['priceReductions', 'Asking-price reductions']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.triggers?.[key] ?? defaultSavedSearchAlerts.triggers?.[key] ?? false} onChange={(event) => update({ triggers: { ...defaultSavedSearchAlerts.triggers, ...value.triggers, [key]: event.target.checked } })} />{label}</label>)}</fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Delivery channels</legend>{channelOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.channels?.[key] ?? defaultSavedSearchAlerts.channels?.[key] ?? false} onChange={(event) => update({ channels: { ...defaultSavedSearchAlerts.channels, ...value.channels, [key]: event.target.checked } })} />{label}</label>)}</fieldset>
    </div>
    <p className="text-xs text-secondary">Daily and weekly alerts can pause when the approved schedule policy is unavailable. Delivery also follows your notification preferences and configured channels. Saving a preference does not confirm delivery.</p>
  </fieldset>;
}
