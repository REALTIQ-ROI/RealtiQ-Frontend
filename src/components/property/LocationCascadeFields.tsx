import { useEffect, useState } from 'react';
import {
  locationService,
  locationSuggestionFailureMessage,
  type GazetteerStatus,
  type LocationCascadeSelection,
  type LocationSuggestion,
  type LocationSuggestionLevel,
} from '../../services/locationService';
import LocationSuggestionInput from './LocationSuggestionInput';

const levels: LocationSuggestionLevel[] = ['state', 'lga', 'area', 'estate'];
const labels: Record<LocationSuggestionLevel, string> = {
  state: 'State',
  lga: 'Local Government Area',
  area: 'Area',
  estate: 'Gated estate',
};

interface LocationCascadeFieldsProps {
  initialIds?: Partial<Record<LocationSuggestionLevel, string>>;
  initialLabels?: Partial<Record<LocationSuggestionLevel, string>>;
  className?: string;
  includeEstate?: boolean;
  onChange: (selection: LocationCascadeSelection, labels: Partial<Record<LocationSuggestionLevel, string>>) => void;
}

const LocationCascadeFields = ({ initialIds = {}, initialLabels = {}, className = '', includeEstate = true, onChange }: LocationCascadeFieldsProps) => {
  const [selection, setSelection] = useState<LocationCascadeSelection>({});
  const [text, setText] = useState<Partial<Record<LocationSuggestionLevel, string>>>(initialLabels);
  const [status, setStatus] = useState<GazetteerStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState('');
  const [resolvingSaved, setResolvingSaved] = useState(false);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoadingStatus(true);
    void locationService.gazetteerStatus(controller.signal)
      .then(async (response) => {
        if (!current) return;
        setStatus(response);
        if (response.state !== 'configured') {
          setError(locationSuggestionFailureMessage(new Error(response.errorCode ?? 'The location directory is not configured.')));
          return;
        }
        setResolvingSaved(true);
        const resolved: LocationCascadeSelection = {};
        let stale = false;
        for (const level of levels) {
          const id = initialIds[level];
          if (!id) {
            if (initialLabels[level]) stale = true;
            continue;
          }
          const parentLevel = levels[levels.indexOf(level) - 1];
          const parent = parentLevel ? resolved[parentLevel] : undefined;
          if (level !== 'state' && !parent) { stale = true; continue; }
          try {
            const result = await locationService.resolve(id, controller.signal);
            if (result.location.level !== level || (level !== 'state' && result.location.parentId !== parent?.id)) { stale = true; continue; }
            resolved[level] = result.location;
          } catch {
            stale = true;
          }
        }
        if (!current) return;
        setSelection(resolved);
        setText(Object.fromEntries(levels.flatMap((level) => resolved[level] ? [[level, resolved[level]!.name]] : initialLabels[level] ? [[level, initialLabels[level]!]] : [])));
        onChange(resolved, Object.fromEntries(levels.flatMap((level) => resolved[level] ? [[level, resolved[level]!.name]] : initialLabels[level] ? [[level, initialLabels[level]!]] : [])));
        if (stale) setError('A saved location could not be confirmed in the current directory. Select it again from current suggestions before saving.');
      })
      .catch((raw: unknown) => { if (current) setError(locationSuggestionFailureMessage(raw)); })
      .finally(() => { if (current) { setLoadingStatus(false); setResolvingSaved(false); } });
    return () => { current = false; controller.abort(); };
  // These are initial persisted values; the user’s subsequent selections are handled below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeText = (level: LocationSuggestionLevel, value: string) => {
    const index = levels.indexOf(level);
    const nextSelection = { ...selection };
    const nextText = { ...text, [level]: value };
    for (const child of levels.slice(index)) {
      delete nextSelection[child];
      if (child !== level) delete nextText[child];
    }
    setSelection(nextSelection);
    setText(nextText);
    setError('');
    onChange(nextSelection, nextText);
  };

  const choose = (level: LocationSuggestionLevel, suggestion: LocationSuggestion) => {
    if (typeof suggestion.revision !== 'number') {
      setError('The location suggestion did not include its dataset revision. Search again before saving.');
      return;
    }
    const nextSelection: LocationCascadeSelection = { ...selection, [level]: { ...suggestion, revision: suggestion.revision } };
    const nextText = { ...text, [level]: suggestion.name };
    const index = levels.indexOf(level);
    for (const child of levels.slice(index + 1)) {
      delete nextSelection[child];
      delete nextText[child];
    }
    setSelection(nextSelection);
    setText(nextText);
    setError('');
    onChange(nextSelection, nextText);
  };

  const enabled = status?.state === 'configured' && !loadingStatus;
  return <fieldset className={className}>
    <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-secondary">Location directory</legend>
    {loadingStatus ? <p role="status" className="mb-2 text-xs text-secondary">Checking the current location directory…</p> : null}
    {status && status.state !== 'configured' ? <p role="status" className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-900">Location directory unavailable{status.errorCode ? ` (${status.errorCode})` : ''}. Existing draft data is kept; no location option is fabricated.</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {levels.map((level, index) => {
        const parentLevel = levels[index - 1];
        const parentId = parentLevel ? selection[parentLevel]?.id : undefined;
        const visible = level !== 'estate' || (includeEstate && (Boolean(selection.area) || Boolean(initialIds.estate || initialLabels.estate)));
        if (!visible) return null;
        return <div key={level}>
          <LocationSuggestionInput
            label={labels[level]}
            level={level}
            value={text[level] ?? ''}
            parentId={parentId}
            enabled={enabled && (level === 'state' || Boolean(parentId))}
            onChange={(value) => changeText(level, value)}
            onSelect={(suggestion) => choose(level, suggestion)}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>;
      })}
    </div>
    {resolvingSaved ? <p role="status" className="mt-2 text-xs text-secondary">Rechecking saved locations against the active directory…</p> : null}
    {error ? <p role="alert" className="mt-2 text-xs text-amber-800">{error}</p> : null}
    <p className="mt-2 text-[11px] text-secondary">Choose each location from current suggestions. Changing a parent clears its child selections.</p>
  </fieldset>;
};

export default LocationCascadeFields;
