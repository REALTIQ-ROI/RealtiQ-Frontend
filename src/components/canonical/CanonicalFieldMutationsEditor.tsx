import { useMemo, useState } from 'react';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import {
  canonicalMutationAllowed,
  reconcileCanonicalFieldRegistry,
  runtimeCanonicalField,
  type CanonicalMutationDraft,
} from '../../utils/canonicalFieldRegistry';
import type { CanonicalMutationOperation, CanonicalMutationTarget } from '../../services/canonicalFieldService';

const fieldInput = 'w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm';

export interface CanonicalFieldMutationView {
  sourceLevel?: string;
  state?: string;
}

interface CanonicalFieldMutationsEditorProps {
  target: CanonicalMutationTarget;
  title?: string;
  value: CanonicalMutationDraft[];
  onChange: (value: CanonicalMutationDraft[]) => void;
  canonicalFields?: Record<string, unknown>;
  effectiveFields?: Record<string, unknown>;
  fieldSources?: Record<string, CanonicalFieldMutationView>;
  exclude?: string[];
  createMode?: boolean;
  allowedOperations?: CanonicalMutationOperation[];
}

const formatStoredValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  return JSON.stringify(value, null, 2);
};

const operationOptions: Array<[CanonicalMutationOperation, string]> = [
  ['set', 'Set explicit value'],
  ['set_null', 'Set explicit null'],
  ['unset', 'Unset value'],
  ['reset_to_inherit', 'Reset to inherited value'],
];

const CanonicalFieldMutationsEditor = ({
  target,
  title = 'Additional canonical fields',
  value,
  onChange,
  canonicalFields,
  effectiveFields,
  fieldSources,
  exclude = [],
  createMode = false,
  allowedOperations,
}: CanonicalFieldMutationsEditorProps) => {
  const { dictionary, loading, error, refresh } = useCanonicalFieldDictionary();
  const registry = useMemo(() => dictionary ? reconcileCanonicalFieldRegistry(dictionary) : [], [dictionary]);
  const excluded = useMemo(() => new Set(exclude), [exclude]);
  const candidates = useMemo(() => registry.filter((field) => {
    if (excluded.has(field.key) || !field.runtime || field.runtime.readOnly || field.runtime.systemOwned || field.runtime.transitionManaged) return false;
    const available = operationOptions.filter(([operation]) => !allowedOperations || allowedOperations.includes(operation));
    return createMode
      ? canonicalMutationAllowed(field, target, 'set')
      : available.some(([operation]) => canonicalMutationAllowed(field, target, operation));
  }), [allowedOperations, createMode, excluded, registry, target]);
  const [selectedKey, setSelectedKey] = useState('');
  const addField = () => {
    if (!selectedKey || value.some((item) => item.field === selectedKey)) return;
    const raw = Object.prototype.hasOwnProperty.call(canonicalFields ?? {}, selectedKey)
      ? formatStoredValue(canonicalFields?.[selectedKey])
      : '';
    onChange([...value, { field: selectedKey, operation: 'set', rawValue: raw }]);
    setSelectedKey('');
  };

  const changeDraft = (key: string, change: Partial<CanonicalMutationDraft>) => {
    onChange(value.map((item) => item.field === key ? { ...item, ...change } : item));
  };

  return <details className="rounded-xl border border-outline-variant/20 bg-white p-4">
    <summary className="cursor-pointer text-sm font-bold">{title}</summary>
    <p className="mt-2 text-xs text-secondary">Field editability and operations come from the current public backend dictionary. Stored, effective and inherited values are shown separately where returned.</p>
    {loading ? <p className="mt-3 text-sm text-secondary">Loading field policy…</p> : null}
    {error ? <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Canonical field policy could not be loaded. Additional field writes are unavailable. <button type="button" className="font-bold underline" onClick={refresh}>Retry</button></div> : null}
    {dictionary && !candidates.length ? <p className="mt-3 text-sm text-secondary">No additional fields are editable for this entity.</p> : null}
    {dictionary && candidates.length ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <select aria-label="Additional canonical field" className={fieldInput} value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
        <option value="">Choose a supported field</option>
        {candidates.filter((field) => !value.some((item) => item.field === field.key)).map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
      </select>
      <button type="button" className="rounded-lg bg-surface-container px-4 py-2 text-sm font-bold" disabled={!selectedKey} onClick={addField}>Add field</button>
    </div> : null}
    {value.length ? <div className="mt-4 space-y-3">{value.map((draft) => {
      const definition = runtimeCanonicalField(registry, draft.field);
      const runtime = definition?.runtime;
      if (!definition || !runtime) return null;
      const operations = createMode ? operationOptions.filter(([operation]) => operation === 'set') : operationOptions.filter(([operation]) => (!allowedOperations || allowedOperations.includes(operation)) && canonicalMutationAllowed(definition, target, operation));
      const source = fieldSources?.[draft.field];
      const hasExplicit = Object.prototype.hasOwnProperty.call(canonicalFields ?? {}, draft.field);
      const effective = effectiveFields?.[draft.field];
      return <div key={draft.field} className="rounded-lg border border-outline-variant/20 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{definition.label}</p><p className="text-xs text-secondary">{runtime.dataType} · {runtime.visibility ?? 'visibility not specified'}</p>
          <p className="mt-1 text-xs text-secondary">{hasExplicit ? `Stored value: ${formatStoredValue(canonicalFields?.[draft.field])}` : 'No explicit value stored.'}{effective !== undefined ? ` · Effective value: ${formatStoredValue(effective)}` : ' · Effective value not returned.'}{source ? ` · Source: ${source.sourceLevel ?? 'unspecified'} (${source.state ?? 'unspecified'})` : ' · Source not returned.'}</p>
          {runtime.readOnly || runtime.systemOwned ? <p className="text-xs text-amber-800">Read-only/system-owned fields cannot be edited.</p> : null}
        </div><button type="button" aria-label={`Remove ${definition.label} edit`} className="text-sm font-bold text-error underline" onClick={() => onChange(value.filter((item) => item.field !== draft.field))}>Remove</button></div>
        {createMode ? <p className="mt-2 text-xs text-secondary">New records can set a value; reset/null/unset require an existing record.</p> : <select aria-label={`${definition.label} operation`} className={`${fieldInput} mt-2`} value={draft.operation} onChange={(event) => changeDraft(draft.field, { operation: event.target.value as CanonicalMutationOperation })}>{operations.map(([operation, label]) => <option key={operation} value={operation}>{label}</option>)}</select>}
        {draft.operation === 'set' ? <div className="mt-2">{definition.kind === 'boolean' ? <select aria-label={`${definition.label} value`} className={fieldInput} value={draft.rawValue} onChange={(event) => changeDraft(draft.field, { rawValue: event.target.value })}><option value="">Choose true or false</option><option value="true">True</option><option value="false">False</option></select>
          : definition.kind === 'enum' && definition.options?.length ? <select aria-label={`${definition.label} value`} className={fieldInput} value={draft.rawValue} onChange={(event) => changeDraft(draft.field, { rawValue: event.target.value })}><option value="">Choose a value</option>{definition.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            : definition.kind === 'multi_enum' ? <textarea aria-label={`${definition.label} JSON value`} className={fieldInput} rows={3} value={draft.rawValue} onChange={(event) => changeDraft(draft.field, { rawValue: event.target.value })} placeholder='JSON array, for example ["Tarred"]' />
              : definition.kind === 'json' || definition.kind === 'coordinates' ? <textarea aria-label={`${definition.label} JSON value`} className={fieldInput} rows={4} value={draft.rawValue} onChange={(event) => changeDraft(draft.field, { rawValue: event.target.value })} placeholder="Enter the source-defined JSON value" />
                : <input aria-label={`${definition.label} value`} className={fieldInput} type={definition.kind === 'integer' || definition.kind === 'decimal' ? 'number' : definition.kind === 'date' ? 'date' : definition.kind === 'month' ? 'month' : 'text'} min={definition.min} max={definition.max} step={definition.kind === 'integer' ? 1 : 'any'} value={draft.rawValue} onChange={(event) => changeDraft(draft.field, { rawValue: event.target.value })} placeholder={definition.unit ? `Value (${definition.unit})` : 'Enter a value'} />}
          {definition.condition ? <p className="mt-1 text-xs text-secondary">Condition: {definition.condition}</p> : null}
        </div> : null}
      </div>;
    })}</div> : null}
  </details>;
};

export default CanonicalFieldMutationsEditor;
