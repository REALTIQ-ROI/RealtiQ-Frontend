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

interface ProfileSwitcherProps {
  allowCreate?: boolean;
}

const ProfileSwitcher = ({ allowCreate = true }: ProfileSwitcherProps) => {
  const { user, profiles, activeProfile, switchProfile, refreshProfiles } = useAuth();
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
  const canCreateProfile = allowCreate && user !== null && user.role !== 'admin' && activeProfile.kind !== 'staff';

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
    if (!canCreateProfile || creating || switching || !name.trim()) return;
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

  return <div className="relative flex min-w-0 items-center gap-2 text-xs">
    {profiles.length > 1 ? <>
      <label className="sr-only" htmlFor="active-profile">Active profile</label>
      <select
        id="active-profile"
        className="max-w-40 rounded-lg border border-outline-variant/20 bg-white px-2 py-2 text-sm sm:max-w-48"
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
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
      </select>
    </> : <span className="max-w-40 truncate text-sm font-semibold text-on-surface sm:max-w-48" title={activeProfile.name}>{activeProfile.name}</span>}
    {error ? <span className="absolute right-0 top-full z-50 mt-2 max-w-64 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-lg" role="alert">{error}</span> : null}
    {canCreateProfile ? <details className="relative shrink-0">
      <summary aria-label="Create profile" title="Create profile" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-outline-variant/30 bg-white text-lg font-medium text-secondary transition hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">+</summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/20 bg-white p-4 text-left shadow-xl">
        <h2 className="text-sm font-bold text-on-surface">Create profile</h2>
        <p className="mt-1 text-xs text-secondary">Profiles start private and unverified. Creating one does not grant verification or extra permissions.</p>
        <form className="mt-3 space-y-3" onSubmit={(event) => void createProfile(event)}>
          <label className="block text-xs font-semibold">Profile type
            <select className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 text-sm font-normal" value={kind} onChange={(event) => { setKind(event.target.value as CreateProfileKind); if (event.target.value === 'developer') setStructure('company'); }}>
              {profileKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Structure
            <select className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 text-sm font-normal" value={kind === 'developer' ? 'company' : structure} disabled={kind === 'developer'} onChange={(event) => setStructure(event.target.value as ProfileStructure)}>
              <option value="individual">Individual</option><option value="company">Company</option><option value="cooperative">Cooperative</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">Profile name
            <input className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 text-sm font-normal" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required />
          </label>
          <Button type="submit" variant="secondary" className="w-full" disabled={creating || switching || !name.trim()} loading={creating} loadingLabel="Creating…">Create profile</Button>
        </form>
        {createdProfileId ? <Button type="button" variant="ghost" className="mt-2 w-full" disabled={switching} onClick={() => void selectCreatedProfile(createdProfileId)}>{switching ? 'Refreshing…' : 'Refresh and select created profile'}</Button> : null}
      </div>
    </details> : null}
  </div>;
};

export default ProfileSwitcher;
