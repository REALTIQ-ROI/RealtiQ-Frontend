import { useState } from 'react';

const packages = [
  { id: 'compare', name: 'Compare', min: 31, max: 54, boundary: 'New-module candidate' },
  { id: 'social', name: 'Social and campaigns', min: 48, max: 84, boundary: 'New / expanded' },
  { id: 'developer', name: 'Developer bulk/shared milestones', min: 51, max: 93, boundary: 'Expansion; credit existing work' },
  { id: 'profiles', name: 'Profiles, agencies and partners', min: 49, max: 88, boundary: 'Mixed original / extra work' },
  { id: 'documents', name: 'Document/title lifecycle', min: 38, max: 70, boundary: 'Mixed original / extra work' },
  { id: 'tours', name: 'Tours, inspection and media', min: 23, max: 41, boundary: 'Mixed original / extra work' },
  { id: 'fees', name: 'Fees, recurring plans and finance', min: 68, max: 117, boundary: 'Boundary needs agreement' },
  { id: 'ecosystem', name: 'Ecosystem foundations', min: 38, max: 68, boundary: 'Credit original integration intent' },
];
const currency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export default function AuditBudgetCalculator() {
  const [rate, setRate] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, string>>({ compare: '100', social: '100' });
  const chosen = packages.filter(item => selected.includes(item.id));
  const hasShares = chosen.every(item => shares[item.id]?.trim() && Number(shares[item.id]) >= 0 && Number(shares[item.id]) <= 100);
  const dailyRate = Number(rate);
  const days = chosen.reduce((total, item) => {
    const share = hasShares ? Number(shares[item.id]) / 100 : 0;
    return { min: total.min + item.min * share, max: total.max + item.max * share };
  }, { min: 0, max: 0 });
  const ready = chosen.length > 0 && hasShares && rate.trim() && Number.isFinite(dailyRate) && dailyRate > 0 && Number.isFinite(days.max * dailyRate);
  return <section className="audit-budget" aria-labelledby="audit-budget-heading">
    <p className="audit-eyebrow">PLANNING TOOL · NOT A QUOTATION</p>
    <h2 id="audit-budget-heading">Explore a labour allowance</h2>
    <p>Select packages, enter your rate, and enter the proportion agreed as additional work. Mixed packages start blank because their entire cost cannot automatically be billed as extra.</p>
    <label className="audit-rate">Daily labour rate (₦)<input type="number" min="0" step="1000" placeholder="Enter your rate" value={rate} onChange={event => setRate(event.target.value)} /></label>
    <div className="audit-table-scroll"><table>
      <thead><tr><th>Package</th><th>Whole-package days</th><th>Agreed extra share</th></tr></thead>
      <tbody>{packages.map(item => <tr key={item.id}>
        <td><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected(previous => previous.includes(item.id) ? previous.filter(id => id !== item.id) : [...previous, item.id])} /> {item.name}</label><small>{item.boundary}</small></td>
        <td>{item.min}–{item.max}</td>
        <td><label className="audit-share"><input aria-label={`Additional percentage for ${item.name}`} type="number" min="0" max="100" step="5" placeholder="Agree %" disabled={!selected.includes(item.id)} value={shares[item.id] ?? ''} onChange={event => setShares(previous => ({ ...previous, [item.id]: event.target.value }))} /> %</label></td>
      </tr>)}</tbody>
    </table></div>
    <div className="audit-budget-result" aria-live="polite">
      {ready ? <><span>Illustrative additional labour allowance</span><strong>{currency.format(days.min * dailyRate)} – {currency.format(days.max * dailyRate)}</strong><p>{days.min.toFixed(1)}–{days.max.toFixed(1)} weighted person-days. Original outstanding balance: {currency.format(1_020_000)}, kept separate.</p></> : <p>Select a package, enter a positive daily rate and complete each selected package's additional percentage (0–100%).</p>}
    </div>
    <p className="audit-budget-note">Uses the supplied combined report's provisional frontend + backend + QA allowances at one uniform rate; one day means six productive hours. Confirm the actual incremental tasks, overlap, rates and approved boundary before quoting. Percentages are your planning assumptions, not evidence of client approval. The calculation excludes margins, risk allowance, tax, licences, operating costs and provider waiting. Zero percent excludes a package's labour from this additional allowance.</p>
  </section>;
}
