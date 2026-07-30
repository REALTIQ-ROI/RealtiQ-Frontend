import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { PROFESSIONAL_TYPES } from '../../features/proxyNetwork/config';
import { getNigeriaCities, NIGERIA_STATES } from '../../features/proxyNetwork/nigeriaLocations';
import { proxyNetworkService } from '../../services/proxyNetworkService';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const InspectorRegistration = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', professionalType: 'property_inspector', professionalTitle: '', yearsOfExperience: '', bio: '', country: 'Nigeria', state: '', city: '', lat: '', lng: '', serviceAreas: [] as string[], specialties: [] as string[] });
  const [serviceAreaInput, setServiceAreaInput] = useState(''); const [specialtyInput, setSpecialtyInput] = useState('');
  const [photo, setPhoto] = useState<File>(); const [preview, setPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState(false); const [locationMessage, setLocationMessage] = useState('');
  const [consent, setConsent] = useState(false); const [error, setError] = useState(''); const [pending, setPending] = useState(false); const [success, setSuccess] = useState('');
  useEffect(() => { if (!photo) { setPreview(''); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  const set = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const selectedState = NIGERIA_STATES.find((state) => state.name === form.state);
  const cityOptions = useMemo(
    () => getNigeriaCities(form.state),
    [form.state],
  );
  const useDeviceLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage('Location access is not supported by this browser. Enter your coordinates manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((old) => ({
          ...old,
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        }));
        setLocationMessage('Your current device coordinates were added.');
        setLocating(false);
      },
      (geoError) => {
        const messages: Record<number, string> = {
          1: 'Location permission was denied. Allow location access or enter the coordinates manually.',
          2: 'Your current location could not be determined. Try again or enter the coordinates manually.',
          3: 'Location lookup timed out. Try again or enter the coordinates manually.',
        };
        setLocationMessage(messages[geoError.code] || 'Your current location could not be determined.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };
  const addListItem = (key: 'serviceAreas' | 'specialties', value: string, clear: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm((old) => old[key].some((item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
      ? old
      : { ...old, [key]: [...old[key], trimmed] });
    clear();
  };
  const handleListKey = (event: KeyboardEvent<HTMLInputElement>, add: () => void) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    }
  };
  const removeListItem = (key: 'serviceAreas' | 'specialties', value: string) =>
    setForm((old) => ({ ...old, [key]: old[key].filter((item) => item !== value) }));
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
        {([['name','Full name','text'],['email','Email','email']] as const).map(([key,label,type]) => <label key={key} className="text-sm font-bold">{label}<input required type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>)}
        <label className="text-sm font-bold">Password<span className="relative mt-2 block"><input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full rounded-lg bg-surface-container-low px-4 py-3 pr-12 font-normal" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span></button></span></label>
        <label className="text-sm font-bold">Phone<input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-4 text-xl font-bold">Professional details</legend>
        <label className="text-sm font-bold">Professional type<select required value={form.professionalType} onChange={(e) => set('professionalType', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal">{PROFESSIONAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="text-sm font-bold">Professional title<input value={form.professionalTitle} onChange={(e) => set('professionalTitle', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold">Years of experience<input min="0" step="1" type="number" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold sm:col-span-2">Professional bio<textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} className="mt-2 min-h-28 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-4 text-xl font-bold">Location and coverage</legend>
        <label className="text-sm font-bold">Country<select required value={form.country} onChange={(e) => set('country', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal"><option value="Nigeria">Nigeria</option></select></label>
        <label className="text-sm font-bold">State<select required value={form.state} onChange={(e) => setForm((old) => ({ ...old, state: e.target.value, city: '' }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal"><option value="">Select a state</option>{NIGERIA_STATES.map((state) => <option key={state.id} value={state.name}>{state.id === 'fct' ? 'Federal Capital Territory (FCT)' : state.name}</option>)}</select></label>
        <label className="text-sm font-bold">City / Local Government Area<select required value={form.city} onChange={(e) => set('city', e.target.value)} disabled={!selectedState} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal disabled:cursor-not-allowed disabled:opacity-60"><option value="">{selectedState ? 'Select a city / LGA' : 'Select a state first'}</option>{cityOptions.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}</select></label>
        <label className="text-sm font-bold">Latitude (optional)<input type="number" step="any" min="-90" max="90" value={form.lat} onChange={(e) => set('lat', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label><label className="text-sm font-bold">Longitude (optional)<input type="number" step="any" min="-180" max="180" value={form.lng} onChange={(e) => set('lng', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
        <div className="flex flex-col justify-end"><button type="button" onClick={useDeviceLocation} disabled={locating} className="rounded-lg bg-surface-container-high px-4 py-3 text-sm font-bold disabled:opacity-60"><span className="material-symbols-outlined mr-2 align-middle text-lg" aria-hidden="true">my_location</span>{locating ? 'Getting location…' : 'Use my current location'}</button></div>
        {locationMessage ? <p role="status" className="text-sm text-secondary sm:col-span-3">{locationMessage}</p> : null}
        {([
          { key: 'serviceAreas' as const, label: 'Service areas', value: serviceAreaInput, setValue: setServiceAreaInput, placeholder: 'Type a service area and press Enter' },
          { key: 'specialties' as const, label: 'Specialties', value: specialtyInput, setValue: setSpecialtyInput, placeholder: 'Type a specialty and press Enter' },
        ]).map(({ key, label, value, setValue, placeholder }) => {
          const add = () => addListItem(key, value, () => setValue(''));
          return <div key={key} className="sm:col-span-3"><label htmlFor={`registration-${key}`} className="text-sm font-bold">{label}</label><div className="mt-2 flex gap-2"><input id={`registration-${key}`} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => handleListKey(e, add)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg bg-surface-container-low px-4 py-3" /><button type="button" onClick={add} disabled={!value.trim()} className="rounded-lg bg-surface-container-high px-4 py-3 text-sm font-bold disabled:opacity-50">Add</button></div>{form[key].length ? <div className="mt-3 flex flex-wrap gap-2" aria-label={`Added ${label.toLowerCase()}`}>{form[key].map((item) => <span key={item} className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold">{item}<button type="button" onClick={() => removeListItem(key, item)} aria-label={`Remove ${item} from ${label.toLowerCase()}`} className="text-on-surface-variant transition-colors hover:text-error"><span className="material-symbols-outlined text-xs" aria-hidden="true">close</span></button></span>)}</div> : <p className="mt-2 text-xs text-secondary">No {label.toLowerCase()} added yet.</p>}</div>;
        })}
      </fieldset>
      <label className="block text-sm font-bold">Profile photo (optional, JPEG/PNG/WebP, max 10 MB)<input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setPhoto(e.target.files?.[0])} className="mt-2 block w-full rounded-lg bg-surface-container-low p-3" /></label>{preview ? <img src={preview} alt="Selected profile preview" className="h-24 w-24 rounded-full object-cover" /> : null}
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I understand that RealtiQ Verified Property Agents are independent third parties, not RealtiQ employees, and that approval depends on email verification, KYC, and Admin review.</span></label>
      {error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      <button disabled={pending} className="rounded-lg bg-primary px-6 py-3 font-bold text-on-primary disabled:opacity-50">{pending ? 'Submitting…' : 'Create professional account'}</button>
    </form>
  </main></PublicLayout>;
};
export default InspectorRegistration;
