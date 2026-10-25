import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProfileSwitcher = () => {
  const { profiles, activeProfile, switchProfile } = useAuth();
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  if (!activeProfile) return null;

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
  </div>;
};

export default ProfileSwitcher;
