import type { ReactNode } from 'react';
import type { AdminPolicyField } from '../../services/adminPolicyRegistry';
import { createPolicyFieldDraft, POLICY_NULL_SENTINEL } from '../../services/adminPolicyForm';

interface AdminPolicyValueEditorProps {
  fields: readonly AdminPolicyField[];
  value: Record<string, unknown>;
  onChange: (path: Array<string | number>, value: unknown) => void;
  disabled?: boolean;
}

const inputClass = 'mt-1 w-full rounded-lg border border-outline-variant/30 bg-white px-3 py-2 text-sm';

const readAtPath = (root: unknown, path: Array<string | number>): unknown => path.reduce<unknown>((current, part) => {
  if (Array.isArray(current) && typeof part === 'number') return current[part];
  if (typeof current === 'object' && current !== null && typeof part === 'string') return (current as Record<string, unknown>)[part];
  return undefined;
}, root);

const humanize = (value: string) => value
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, (first) => first.toUpperCase());

const AdminPolicyValueEditor = ({ fields, value, onChange, disabled = false }: AdminPolicyValueEditorProps) => {
  const renderField = (field: AdminPolicyField, path: Array<string | number>, rootLabel: string): ReactNode => {
    const draft = readAtPath(value, path);
    const arrayItem = field.key === '_item';
    const fieldLabel = field.required === false ? `${field.label} (optional)` : field.label;
    const label = arrayItem && field.type !== 'object' ? 'Value' : arrayItem ? rootLabel || field.label : fieldLabel;
    const accessibleLabel = arrayItem ? rootLabel || label : rootLabel ? `${rootLabel} ${label}` : label;
    const helpId = `${path.map(String).join('-').replace(/[^a-z0-9-]/gi, '-')}-help`;
    const help = field.help;
    const common = { disabled, 'aria-describedby': help ? helpId : undefined };

    if (field.type === 'object') {
      return <fieldset key={path.join('.')} className="space-y-3 rounded-lg border border-outline-variant/20 p-3">
        <legend className="px-1 text-sm font-semibold">{label}</legend>
        {(field.fields ?? []).map((child) => renderField(child, [...path, child.key], arrayItem ? label : rootLabel ? `${rootLabel} ${label}` : label))}
        {help ? <p id={helpId} className="text-xs font-normal text-secondary">{help}</p> : null}
      </fieldset>;
    }

    if (field.type === 'array') {
      const entries = Array.isArray(draft) ? draft : [];
      const countValue = field.lengthFrom ? value[field.lengthFrom] : undefined;
      const count = field.lengthFrom && typeof countValue === 'string' && countValue.trim() !== ''
        ? Number(countValue)
        : field.lengthFrom && typeof value[field.lengthFrom] === 'number'
          ? value[field.lengthFrom] as number
          : null;
      return <fieldset key={path.join('.')} className="space-y-3 rounded-lg border border-outline-variant/20 p-3">
        <legend className="px-1 text-sm font-semibold">{field.label}{field.minItems ? ` (${field.minItems}–${field.maxItems ?? 'many'})` : ''}</legend>
        {help ? <p id={helpId} className="text-xs text-secondary">{help}</p> : null}
        {field.lengthFrom ? <p className="text-xs text-secondary">Enter exactly {Number.isInteger(count) ? count : 'the configured attempt count'} item{count === 1 ? '' : 's'}; the list follows {humanize(field.lengthFrom)}.</p> : null}
        {!entries.length ? <p className="text-sm text-secondary">No entries added.</p> : null}
        {entries.map((_, index) => {
          const itemPath = [...path, index];
          const item = field.item;
          if (!item) return null;
          const itemLabel = `${field.label} item ${index + 1}`;
          return <div key={`${path.join('.')}-${index}`} className="relative rounded-lg bg-surface-container-low p-3">
            {item.type === 'object'
              ? renderField(item, itemPath, itemLabel)
              : renderField(item, itemPath, itemLabel)}
            {!field.lengthFrom ? <button
              className="mt-2 rounded-md px-2 py-1 text-sm font-semibold text-red-700 underline disabled:opacity-50"
              type="button"
              disabled={disabled || entries.length <= (field.minItems ?? 0)}
              aria-label={`Remove ${itemLabel}`}
              onClick={() => onChange(path, entries.filter((_, itemIndex) => itemIndex !== index))}
            >Remove</button> : null}
          </div>;
        })}
        {!field.lengthFrom ? <button
          className="rounded-md px-2 py-1 text-sm font-semibold text-primary underline disabled:opacity-50"
          type="button"
          disabled={disabled || entries.length >= (field.maxItems ?? Number.MAX_SAFE_INTEGER)}
          aria-label={`Add ${field.label} item`}
          onClick={() => {
            onChange(path, [...entries, createPolicyFieldDraft(field.item!)]);
          }}
        >Add {field.label.toLowerCase()} item</button> : null}
      </fieldset>;
    }

    if (field.type === 'boolean' || field.type === 'enum') {
      const options = field.type === 'boolean' ? [
        { value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' },
      ] : (field.options ?? []).map((option) => ({ value: option, label: option.replace(/[_-]+/g, ' ') }));
      const selected = typeof draft === 'boolean' ? String(draft) : typeof draft === 'string' ? draft : '';
      return <label key={path.join('.')} className="block text-sm font-semibold">
        {label}
        <select
          {...common}
          className={inputClass}
          aria-label={accessibleLabel}
          required={field.required !== false}
          value={selected}
          onChange={(event) => onChange(path, event.target.value)}
        >
          <option value="">Select a value</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {help ? <span id={helpId} className="mt-1 block text-xs font-normal text-secondary">{help}</span> : null}
      </label>;
    }

    if (field.type === 'nullable') {
      const selected = draft === POLICY_NULL_SENTINEL || draft === null ? 'null' : typeof draft === 'string' && draft ? 'value' : '';
      const valuePath = path;
      return <div key={path.join('.')}>
        <label className="block text-sm font-semibold">{label}
          <select
            {...common}
            className={inputClass}
            aria-label={`${accessibleLabel} null selection`}
            value={selected}
            onChange={(event) => onChange(valuePath, event.target.value === 'null' ? POLICY_NULL_SENTINEL : '')}
          >
            <option value="">Choose a value</option>
            <option value="null">Null</option>
            <option value="value">Set a value</option>
          </select>
        </label>
        {selected === 'value' ? <label className="mt-2 block text-sm font-semibold">{label}
          <input
            {...common}
            className={inputClass}
            aria-label={accessibleLabel}
            type={field.nullableType === 'number' ? 'number' : 'text'}
            min={field.min}
            max={field.max}
            step={field.nullableType === 'number' ? 'any' : undefined}
            minLength={field.nullableType === 'string' ? field.minLength : undefined}
            maxLength={field.nullableType === 'string' ? field.maxLength : undefined}
            pattern={field.pattern}
            required={field.required !== false}
            value={typeof draft === 'string' && draft !== POLICY_NULL_SENTINEL ? draft : ''}
            onChange={(event) => onChange(valuePath, event.target.value)}
          />
        </label> : null}
        {help ? <p id={helpId} className="mt-1 text-xs text-secondary">{help}</p> : null}
      </div>;
    }

    const isNumber = field.type === 'number';
    const valueText = typeof draft === 'string' || typeof draft === 'number' ? String(draft) : '';
    const dynamicMax = field.itemMaxFrom && typeof value[field.itemMaxFrom] === 'string'
      ? Number(value[field.itemMaxFrom])
      : field.itemMaxFrom && typeof value[field.itemMaxFrom] === 'number'
        ? value[field.itemMaxFrom] as number
        : undefined;
    const max = dynamicMax === undefined || Number.isNaN(dynamicMax) ? field.max : Math.min(field.max ?? dynamicMax, dynamicMax);
    const longText = !isNumber && ((field.maxLength ?? 0) > 200 || /disclosure|reference|description/i.test(field.key));
    return <label key={path.join('.')} className="block text-sm font-semibold">
      {label}
      {longText ? <textarea
        {...common}
        className={inputClass}
        aria-label={accessibleLabel}
        required={field.required !== false}
        minLength={field.minLength}
        maxLength={field.maxLength}
        pattern={field.pattern}
        rows={4}
        value={valueText}
        onChange={(event) => onChange(path, event.target.value)}
      /> : <input
        {...common}
        className={inputClass}
        aria-label={accessibleLabel}
        type={isNumber ? 'number' : 'text'}
        required={field.required !== false}
        min={isNumber ? field.min : undefined}
        max={isNumber ? max : undefined}
        minLength={!isNumber ? field.minLength : undefined}
        maxLength={!isNumber ? field.maxLength : undefined}
        pattern={!isNumber ? field.pattern : undefined}
        step={isNumber && !field.integer ? 'any' : isNumber ? '1' : undefined}
        value={valueText}
        onChange={(event) => onChange(path, event.target.value)}
      />}
      {help ? <span id={helpId} className="mt-1 block text-xs font-normal text-secondary">{help}</span> : null}
      {isNumber && field.min !== undefined && max !== undefined ? <span className="mt-1 block text-xs font-normal text-secondary">Allowed: {field.min} to {max}{field.integer ? ', whole number' : ''}.</span> : null}
    </label>;
  };

  return <div className="space-y-4">
    {fields.map((field) => renderField(field, [field.key], ''))}
  </div>;
};

export default AdminPolicyValueEditor;
