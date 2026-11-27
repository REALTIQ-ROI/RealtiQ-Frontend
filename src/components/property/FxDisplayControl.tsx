import { useFxDisplay } from '../../contexts/FxDisplayContext';
import { formatFxRateDate, formatFxUpdatedAt, formatOfficialRate } from '../../utils/fxDisplay';

const FxDisplayControl = ({ className = '' }: { className?: string }) => {
  const { displayCurrency, setDisplayCurrency, officialRate, loading, error, configurationState, refreshFx } = useFxDisplay();
  const unavailable = !loading && !officialRate;
  const status = loading
    ? 'Checking the current official rate…'
    : error
      ? 'The current official rate could not be loaded. Original listing prices are shown.'
      : officialRate
        ? `${formatOfficialRate(officialRate)} · ${officialRate.provider === 'cbn_nfem' ? 'CBN NFEM' : officialRate.source}${formatFxRateDate(officialRate.rateDate) ? ` · Rate date ${formatFxRateDate(officialRate.rateDate)}` : ''}${formatFxUpdatedAt(officialRate.recordedAt) ? ` · Updated ${formatFxUpdatedAt(officialRate.recordedAt)}` : ''}`
        : configurationState === 'unconfigured'
          ? 'Currency conversion is not configured. Original listing prices are shown.'
          : 'Currency conversion is unavailable. Original listing prices are shown.';

  return <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant/20 bg-white px-3 py-2 ${className}`}>
    <label className="flex items-center gap-2 text-xs font-bold text-on-surface">
      <span>Display currency</span>
      <select aria-label="Display currency" value={displayCurrency ?? ''} onChange={(event) => setDisplayCurrency(event.target.value === 'NGN' || event.target.value === 'USD' ? event.target.value : null)} className="rounded-md border border-outline-variant/30 bg-surface px-2 py-1.5 text-sm">
        <option value="">As listed</option>
        <option value="NGN">NGN</option>
        <option value="USD">USD</option>
      </select>
    </label>
    <p role="status" aria-live="polite" className={`min-w-0 flex-1 text-xs ${unavailable || error ? 'text-amber-900' : 'text-secondary'}`}>{status}</p>
    <button type="button" onClick={refreshFx} disabled={loading} className="text-xs font-bold text-primary underline disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh rate'}</button>
    <p className="basis-full text-[11px] text-secondary">Display only. Search filters, sorting and payment currency are unchanged.</p>
  </div>;
};

export default FxDisplayControl;
