import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { PROFESSIONAL_TYPES } from '../../features/proxyNetwork/config';
import { proxyNetworkService } from '../../services/proxyNetworkService';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const InspectorRegistration = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', professionalType: 'property_inspector', professionalTitle: '', yearsOfExperience: '', bio: '', country: 'Nigeria', state: '', city: '', lat: '', lng: '', serviceAreas: [''], specialties: [''] });
  const [photo, setPhoto] = useState<File>(); const [preview, setPreview] = useState('');
  const [consent, setConsent] = useState(false); const [error, setError] = useState(''); const [pending, setPending] = useState(false); const [success, setSuccess] = useState('');
  useEffect(() => { if (!photo) { setPreview(''); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  const set = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const repeat = (key: 'serviceAreas' | 'specialties', index: number, value: string) => setForm((old) => ({ ...old, [key]: old[key].map((item, i) => i === index ? value : item) }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return setError('Password must be at least 8 characters and include an uppercase letter and a number.');
    if (photo && (!imageTypes.includes(photo.type) || photo.size > 10 * 1024 * 1024)) return setError('Profile photo must be JPEG, PNG, or WebP and no larger than 10 MB.');
    if (!consent) return setError('Confirm that you understand the independent-provider relationship.');
    setPending(true);
    try {
      const coordinates = form.lat && form.lng ? { lat: Number(form.lat), lng: Number(form.lng) } : undefined;
      const result = await proxyNetworkService.register({
        name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim(),
        professionalType: form.professionalType, professionalTitle: form.professionalTitle.trim() || undefined,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined, bio: form.bio.trim() || undefined,
        location: { country: form.country.trim(), state: form.state.trim(), city: form.city.trim(), coordinates },
        serviceAreas: form.serviceAreas.map((v) => v.trim()).filter(Boolean),
        specialties: form.specialties.map((v) => v.trim()).filter(Boolean), profileImage: photo,
      });
      setSuccess(result.message); setPhoto(undefined);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Registration could not be completed.'); } finally { setPending(false); }
  };
  if (success) return <PublicLayout><main className="mx-auto max-w-lg px-6 py-24 text-center"><div className="rounded-2xl bg-white p-10 shadow-sm"><h1 className="text-3xl font-black">Check your email</h1><p className="mt-4 text-secondary">{success}</p><p className="mt-3 text-sm text-secondary">After verification, log in through the RealtiQ Verified Property Agent portal and submit your KYC documents for review. Registration does not make your profile public.</p><Link to="/login?role=proxy_inspector" className="mt-8 inline-block rounded-lg bg-primary px-5 py-3 font-bold text-on-primary">Property Agent login</Link></div></main></PublicLayout>;
  return <PublicLayout><main className="mx-auto max-w-4xl px-4 py-12 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Professional registration</p><h1 className="mt-2 text-4xl font-black">Become a RealtiQ Verified Property Agent</h1><p className="mt-3 text-secondary">Create a professional account. Email verification, KYC, and Admin approval are required before your profile can appear publicly.</p></div>
    <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-8 rounded-2xl bg-white p-6 shadow-sm sm:p-10">
      <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-4 text-xl font-bold">Account</legend>
        {([['name','Full name','text'],['email','Email','email'],['password','Password','password'],['phone','Phone','tel']] as const).map(([key,label,type]) => <label key={key} className="text-sm font-bold">{label}<input required type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>)}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-4 text-xl font-bold">Professional details</legend>
        <label className="text-sm font-bold">Professional type<select required value={form.professionalType} onChange={(e) => set('professionalType', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal">{PROFESSIONAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="text-sm font-bold">Professional title<input value={form.professionalTitle} onChange={(e) => set('professionalTitle', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold">Years of experience<input min="0" step="1" type="number" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold sm:col-span-2">Professional bio<textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} className="mt-2 min-h-28 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-4 text-xl font-bold">Location and coverage</legend>
        {(['country','state','city'] as const).map((key) => <label key={key} className="text-sm font-bold capitalize">{key}<input required value={form[key]} onChange={(e) => set(key, e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>)}
        <label className="text-sm font-bold">Latitude (optional)<input type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label><label className="text-sm font-bold">Longitude (optional)<input type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        {(['serviceAreas','specialties'] as const).map((key) => <div key={key} className="sm:col-span-3"><p className="text-sm font-bold">{key === 'serviceAreas' ? 'Service areas' : 'Specialties'}</p>{form[key].map((value,index) => <input key={index} value={value} onChange={(e) => repeat(key,index,e.target.value)} className="mt-2 mr-2 rounded-lg bg-surface-container-low px-4 py-3" />)}<button type="button" className="mt-2 text-sm font-bold underline" onClick={() => setForm((old) => ({ ...old, [key]: [...old[key], ''] }))}>Add another</button></div>)}
      </fieldset>
      <label className="block text-sm font-bold">Profile photo (optional, JPEG/PNG/WebP, max 10 MB)<input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setPhoto(e.target.files?.[0])} className="mt-2 block w-full rounded-lg bg-surface-container-low p-3" /></label>{preview ? <img src={preview} alt="Selected profile preview" className="h-24 w-24 rounded-full object-cover" /> : null}
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I understand that RealtiQ Verified Property Agents are independent third parties, not RealtiQ employees, and that approval depends on email verification, KYC, and Admin review.</span></label>
      {error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      <button disabled={pending} className="rounded-lg bg-primary px-6 py-3 font-bold text-on-primary disabled:opacity-50">{pending ? 'Submitting…' : 'Create professional account'}</button>
    </form>
  </main></PublicLayout>;
};
export default InspectorRegistration;
