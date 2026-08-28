import type { TrustComponent, TrustDecision } from '../../types/phase45';

interface ChecklistItem { key: string; title: string; description: string; component?: TrustComponent; complete: boolean }
const hasEvidence = (component?: TrustComponent) => Boolean(component && component.available !== false && ((component.count ?? 0) > 0 || (component.score ?? 0) > 0));

const TrustProgressChecklist = ({ trust, role }: { trust: TrustDecision; role: 'buyer' | 'landlord' }) => {
  const components = trust.components ?? {};
  const items: ChecklistItem[] = [
    { key: 'identity', title: 'Verify your identity', description: 'Complete the account verification steps available in your settings.', component: components.identity, complete: hasEvidence(components.identity) },
    { key: 'transactions', title: 'Build verified transaction history', description: role === 'buyer' ? 'Complete purchases through RealTIQ so eligible activity can be counted.' : 'Complete property transactions through RealTIQ so eligible activity can be counted.', component: components.transactions, complete: hasEvidence(components.transactions) },
    { key: 'ratings', title: 'Build a positive rating history', description: 'Complete genuine platform activity and encourage counterparties to leave honest feedback.', component: components.ratings, complete: hasEvidence(components.ratings) },
    { key: 'responsiveness', title: 'Respond consistently', description: 'Reply promptly to legitimate enquiries and transaction requests when this evidence becomes available.', component: components.responsiveness, complete: hasEvidence(components.responsiveness) },
    ...(role === 'landlord' ? [{ key: 'titleQuality', title: 'Strengthen title evidence', description: 'Use RealTIQ title verification for eligible property documents. RealTIQ reviews submitted evidence before verification.', component: components.titleQuality, complete: hasEvidence(components.titleQuality) }] : []),
  ];
  const completed = items.filter((item) => item.complete).length;
  const percentage = Math.round((completed / items.length) * 100);
  return <section className={'rounded-2xl border border-outline-variant/10 bg-white p-6'} aria-labelledby={'trust-progress-heading'}>
    <div className={'flex flex-wrap items-end justify-between gap-3'}><div><h2 id={'trust-progress-heading'} className={'text-xl font-black'}>Your trust checklist</h2><p className={'mt-1 text-sm text-secondary'}>These actions can strengthen your trust profile. RealTIQ considers verified activity when calculating your score and badge.</p></div><strong className={'text-sm'}>{completed} of {items.length} complete</strong></div>
    <div className={'mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high'} role={'progressbar'} aria-label={'Trust checklist progress'} aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={completed} aria-valuetext={`${completed} of ${items.length} complete`}><div className={'h-full rounded-full bg-primary transition-[width]'} style={{ width: `${percentage}%` }} /></div>
    <ul className={'mt-5 space-y-3'}>{items.map((item) => <li key={item.key} className={'flex gap-3 rounded-xl bg-surface-container-low p-4'}><span className={`material-symbols-outlined mt-0.5 ${item.complete ? 'text-emerald-700' : 'text-secondary'}`} aria-hidden={'true'}>{item.complete ? 'check_circle' : 'radio_button_unchecked'}</span><div className={'min-w-0 flex-1'}><div className={'flex flex-wrap items-center justify-between gap-2'}><strong>{item.title}</strong><span className={'text-xs font-bold text-secondary'}>{item.complete ? 'Evidence recorded' : item.component?.available === false ? 'Evidence unavailable' : 'Action recommended'}</span></div><p className={'mt-1 text-sm text-secondary'}>{item.description}</p></div></li>)}</ul>
  </section>;
};
export default TrustProgressChecklist;
