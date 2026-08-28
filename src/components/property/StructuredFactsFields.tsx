import type { StructuredPropertyFacts } from '../../types/phase45';

const inputClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'space-y-1 text-xs font-bold text-secondary';
const numberValue = (value: string) => value === '' ? undefined : Number(value);
const options = {
  condition: ['unknown', 'poor', 'fair', 'good', 'excellent', 'new'], furnishing: ['unknown', 'unfurnished', 'semi_furnished', 'furnished'],
  roadAccess: ['unknown', 'unpaved', 'paved', 'major_road'], tenureClassification: ['unknown', 'freehold', 'leasehold', 'certificate_of_occupancy', 'governors_consent', 'other'],
  geocodePrecision: ['unknown', 'country', 'state', 'city', 'neighbourhood', 'street', 'parcel'],
} as const;
interface Props { value: StructuredPropertyFacts; onChange: (value: StructuredPropertyFacts) => void; errors?: Record<string, string>; sellerMode?: boolean }
const StructuredFactsFields = ({ value, onChange, errors = {}, sellerMode = true }: Props) => {
  const set = <K extends keyof StructuredPropertyFacts>(key: K, next: StructuredPropertyFacts[K]) => onChange({ ...value, [key]: next });
  const numeric = (key: 'yearBuilt' | 'renovationYear' | 'floors' | 'parkingSpaces', label: string, min: number, max: number) => <label className={labelClass}>{label}<input className={inputClass} type={'number'} min={min} max={max} value={value[key] ?? ''} onChange={(event) => set(key, numberValue(event.target.value))} />{errors[key] ? <span role={'alert'} className={'block text-error'}>{errors[key]}</span> : null}</label>;
  return <fieldset className={'rounded-2xl border border-outline-variant/10 bg-white p-6'}><legend className={'px-1 text-base font-black'}>Structured property facts <span className={'font-normal text-secondary'}>(optional)</span></legend>
    <p className={'mb-5 mt-1 text-xs text-secondary'}>Enter facts you can support. Square metres are stored separately from the legacy square-feet field and are never silently converted.</p>
    <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
      <label className={labelClass}>Building area (m²)<input className={inputClass} type={'number'} step={'any'} min={1} max={1000000} value={value.areas?.buildingSquareMetres ?? ''} onChange={(e) => set('areas', { ...value.areas, buildingSquareMetres: numberValue(e.target.value) })} />{errors.buildingSquareMetres ? <span role={'alert'} className={'block text-error'}>{errors.buildingSquareMetres}</span> : null}</label>
      <label className={labelClass}>Land area (m²)<input className={inputClass} type={'number'} step={'any'} min={1} max={10000000} value={value.areas?.landSquareMetres ?? ''} onChange={(e) => set('areas', { ...value.areas, landSquareMetres: numberValue(e.target.value) })} />{errors.landSquareMetres ? <span role={'alert'} className={'block text-error'}>{errors.landSquareMetres}</span> : null}</label>
      {numeric('yearBuilt', 'Year built', 1800, 2200)}{numeric('renovationYear', 'Renovation year', 1800, 2200)}{numeric('floors', 'Floors', 1, 200)}{numeric('parkingSpaces', 'Parking spaces', 0, 1000)}
      {(['architecturalStyle', 'neighbourhood', 'propertySubtype'] as const).map((key) => <label key={key} className={labelClass}>{key.replace(/([A-Z])/g, ' $1')}<input className={inputClass} value={value[key] ?? ''} maxLength={key === 'neighbourhood' ? 200 : 100} onChange={(e) => set(key, e.target.value)} /></label>)}
      {(Object.keys(options) as Array<keyof typeof options>).map((key) => <label key={key} className={labelClass}>{key.replace(/([A-Z])/g, ' $1')}<select className={inputClass} value={String(value[key] ?? 'unknown')} onChange={(e) => set(key, e.target.value as never)}>{options[key].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>)}
      {(['structure', 'roof', 'walls', 'foundation'] as const).map((key) => <label key={key} className={labelClass}>Construction: {key}<input className={inputClass} value={value.construction?.[key] ?? ''} onChange={(e) => set('construction', { ...value.construction, [key]: e.target.value })} /></label>)}
      <label className={labelClass}>Power available<select className={inputClass} value={value.utilities?.power === undefined ? '' : String(value.utilities.power)} onChange={(e) => set('utilities', { ...value.utilities, power: e.target.value === '' ? undefined : e.target.value === 'true' })}><option value={''}>Unknown</option><option value={'true'}>Yes</option><option value={'false'}>No</option></select></label>
      <label className={labelClass}>Water available<select className={inputClass} value={value.utilities?.water === undefined ? '' : String(value.utilities.water)} onChange={(e) => set('utilities', { ...value.utilities, water: e.target.value === '' ? undefined : e.target.value === 'true' })}><option value={''}>Unknown</option><option value={'true'}>Yes</option><option value={'false'}>No</option></select></label>
    </div>
    <div className={'mt-5 rounded-xl bg-surface-container-low p-4 text-sm'}><strong>Verification:</strong> {sellerMode ? 'Seller asserted · source: seller' : `${value.verification?.status ?? 'unverified'} · source: ${value.verification?.source ?? 'unknown'}`}<p className={'mt-1 text-xs text-secondary'}>Unknown means evidence has not been supplied. Tenure classification is not a legal title opinion. Use the existing title-verification workflow for document review.</p></div>
  </fieldset>;
};
export default StructuredFactsFields;
