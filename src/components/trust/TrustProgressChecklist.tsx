import type { TrustComponent, TrustDecision } from '../../types/phase45';

type EvidenceState = 'unavailable' | 'not_started' | 'recorded';
interface ChecklistItem { key: string; title: string; description: string; component?: TrustComponent; state: EvidenceState }
const evidenceState = (component?: TrustComponent): EvidenceState => {
  if (!component || component.available === false) return 'unavailable';
  return (component.count ?? 0) > 0 || (component.score ?? 0) > 0 ? 'recorded' : 'not_started';
};

const TrustProgressChecklist = ({ trust, role }: { trust: TrustDecision; role: 'buyer' | 'landlord' }) => {
  const components = trust.components ?? {};
  const items: ChecklistItem[] = [
    { key: 'identity', title: 'Verify your identity', description: 'Complete the account verification steps available in your settings.', component: components.identity, state: evidenceState(components.identity) },
    { key: 'transactions', title: 'Build verified transaction history', description: role === 'buyer' ? 'Complete purchases through RealtIQ so eligible activity can be counted.' : 'Complete property transactions through RealtIQ so eligible activity can be counted.', component: components.transactions, state: evidenceState(components.transactions) },
    { key: 'ratings', title: 'Build a positive rating history', description: 'Complete genuine platform activity and encourage counterparties to leave honest feedback.', component: components.ratings, state: evidenceState(components.ratings) },
    { key: 'responsiveness', title: 'Respond consistently', description: 'Reply promptly to legitimate enquiries and transaction requests when this evidence becomes available.', component: components.responsiveness, state: evidenceState(components.responsiveness) },
    ...(role === 'landlord' ? [{ key: 'titleQuality', title: 'Strengthen title evidence', description: 'Use RealtIQ title verification for eligible property documents. RealtIQ reviews submitted evidence before verification.', component: components.titleQuality, state: evidenceState(components.titleQuality) }] : []),
  ];
  const recorded = items.filter((item) => item.state === 'recorded').length;
  const percentage = Math.round((recorded / items.length) * 100);
  return <section className={'rounded-2xl border border-outline-variant/10 bg-white p-6'} aria-labelledby={'trust-progress-heading'}>
    <div className={'flex flex-wrap items-end justify-between gap-3'}><div><h2 id={'trust-progress-heading'} className={'text-xl font-black'}>Your trust checklist</h2><p className={'mt-1 text-sm text-secondary'}>These actions can strengthen your trust profile. Progress shows where RealtIQ has recorded eligible evidence; it does not guarantee a score or badge.</p></div><strong className={'text-sm'}>{recorded} of {items.length} evidence areas recorded</strong></div>
    <div className={'mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high'} role={'progressbar'} aria-label={'Trust evidence coverage'} aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={recorded} aria-valuetext={`${recorded} of ${items.length} evidence areas recorded`}><div className={'h-full rounded-full bg-primary transition-[width]'} style={{ width: `${percentage}%` }} /></div>
    <ul className={'mt-5 space-y-3'}>{items.map((item) => <li key={item.key} className={'flex gap-3 rounded-xl bg-surface-container-low p-4'}><span className={`material-symbols-outlined mt-0.5 ${item.state === 'recorded' ? 'text-emerald-700' : 'text-secondary'}`} aria-hidden={'true'}>{item.state === 'recorded' ? 'check_circle' : item.state === 'unavailable' ? 'remove_circle_outline' : 'radio_button_unchecked'}</span><div className={'min-w-0 flex-1'}><div className={'flex flex-wrap items-center justify-between gap-2'}><strong>{item.title}</strong><span className={'text-xs font-bold text-secondary'}>{item.state === 'recorded' ? 'Evidence recorded' : item.state === 'unavailable' ? 'Evidence unavailable' : 'No evidence recorded yet'}</span></div><p className={'mt-1 text-sm text-secondary'}>{item.description}</p></div></li>)}</ul>
  </section>;
};
export default TrustProgressChecklist;
