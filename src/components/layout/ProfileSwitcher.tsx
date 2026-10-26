import { useRef, useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, type CreateProfileKind, type ProfileStructure } from '../../services/profileService';

const profileKinds: Array<{ value: CreateProfileKind; label: string }> = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'owner', label: 'Owner' },
  { value: 'agency', label: 'Agency' },
  { value: 'developer', label: 'Developer' },
  { value: 'legal_partner', label: 'Legal partner' },
  { value: 'engineering_survey_partner', label: 'Engineering / survey partner' },
  { value: 'inspection_partner', label: 'Inspection partner' },
  { value: 'valuation_partner', label: 'Valuation partner' },
  { value: 'buyers_agent', label: "Buyer's agent" },
  { value: 'sellers_agent', label: "Seller's agent" },
];

const ProfileSwitcher = () => {
  const { profiles, activeProfile, switchProfile, refreshProfiles } = useAuth();
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  const [kind, setKind] = useState<CreateProfileKind>('buyer');
  const [structure, setStructure] = useState<ProfileStructure>('individual');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const operationKeyRef = useRef('');
  const operationPayloadRef = useRef('');
  if (!activeProfile) return null;

  const selectCreatedProfile = async (profileId: string) => {
    setSwitching(true);
    setError('');
    try {
      await refreshProfiles();
      await switchProfile(profileId);
      window.location.reload();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'The profile exists, but could not be selected. Refresh profiles and try again.');
    } finally {
      setSwitching(false);
    }
  };

  const createProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating || switching || !name.trim()) return;
    const selectedStructure = kind === 'developer' ? 'company' : structure;
    const bodyWithoutKey = { kind, structure: selectedStructure, name: name.trim() };
    const signature = JSON.stringify(bodyWithoutKey);
    if (operationPayloadRef.current !== signature) {
      operationPayloadRef.current = signature;
      operationKeyRef.current = `profile_${crypto.randomUUID()}`;
    }
    setCreating(true);
    setError('');
    try {
      const result = await profileService.create({ ...bodyWithoutKey, operationKey: operationKeyRef.current });
      setCreatedProfileId(result.profile.id);
      setName('');
      operationKeyRef.current = '';
      operationPayloadRef.current = '';
      await selectCreatedProfile(result.profile.id);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to create the profile. Keep the same details for a safe retry.');
    } finally {
      setCreating(false);
    }
  };

  return <div className="min-w-36 text-xs">
    {profiles.length > 1 ? <>
      <label className="sr-only" htmlFor="active-profile">Active profile</label>
      <select
        id="active-profile"
        className="max-w-48 rounded-lg border border-outline-variant/20 bg-white px-2 py-2 text-sm"
        value={activeProfile.id}
        disabled={switching}
        onChange={async (event) => {
          setError('');
          setSwitching(true);
          try {
            await switchProfile(event.target.value);
            window.location.reload();
          } catch (raw) {
            setError(raw instanceof Error ? raw.message : 'Unable to switch profile.');
            setSwitching(false);
          }
        }}
      >
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.status}</option>)}
      </select>
    </> : <p className="max-w-48 truncate rounded-lg border border-outline-variant/20 bg-white px-2 py-2 text-sm" title={activeProfile.name}>{activeProfile.name}</p>}
    <span className="mt-1 block max-w-48 truncate text-[10px] text-secondary" aria-live="polite">
      {[activeProfile.kind, activeProfile.structure, activeProfile.status, activeProfile.verification?.status].filter(Boolean).join(' · ')}
    </span>
    {error ? <span className="block text-red-700" role="alert">{error}</span> : null}
    <details className="mt-2 max-w-64 rounded-lg border border-outline-variant/20 bg-white p-2">
      <summary className="cursor-pointer text-xs font-semibold">Create another profile</summary>
      <p className="mt-2 text-[11px] text-secondary">Profiles start private and unverified. Creating one does not grant verification or extra permissions.</p>
      <form className="mt-2 space-y-2" onSubmit={(event) => void createProfile(event)}>
        <label className="block text-[11px] font-semibold">Profile type
          <select className="mt-1 w-full rounded border p-2 text-xs font-normal" value={kind} onChange={(event) => { setKind(event.target.value as CreateProfileKind); if (event.target.value === 'developer') setStructure('company'); }}>
            {profileKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold">Structure
          <select className="mt-1 w-full rounded border p-2 text-xs font-normal" value={kind === 'developer' ? 'company' : structure} disabled={kind === 'developer'} onChange={(event) => setStructure(event.target.value as ProfileStructure)}>
            <option value="individual">Individual</option><option value="company">Company</option><option value="cooperative">Cooperative</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold">Profile name
          <input className="mt-1 w-full rounded border p-2 text-xs font-normal" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required />
        </label>
        <Button type="submit" variant="secondary" className="w-full" disabled={creating || switching || !name.trim()} loading={creating} loadingLabel="Creating…">Create profile</Button>
      </form>
      {createdProfileId ? <Button type="button" variant="ghost" className="mt-2 w-full" disabled={switching} onClick={() => void selectCreatedProfile(createdProfileId)}>{switching ? 'Refreshing…' : 'Refresh and select created profile'}</Button> : null}
    </details>
  </div>;
};

export default ProfileSwitcher;
