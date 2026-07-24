import type { EscrowRuleType } from '../../types/escrow';
import {
  formatEscrowMoney,
  RULE_ACTOR_GUIDANCE,
  RULE_TYPES,
} from './escrowConfig';
import type { EditableRule, RuleErrors } from './ruleValidation';

interface CustomRuleEditorProps {
  rules: EditableRule[];
  errors: RuleErrors;
  escrowAmount: number;
  currency?: string;
  onChange: (rules: EditableRule[]) => void;
}

const newRule = (): EditableRule => ({
  clientId: crypto.randomUUID(),
  type: 'custom_manual_condition',
  description: '',
  required: true,
  amount: undefined,
  metadata: {},
});

const CustomRuleEditor = ({
  rules,
  errors,
  escrowAmount,
  currency = 'NGN',
  onChange,
}: CustomRuleEditorProps) => {
  const update = (id: string, patch: Partial<EditableRule>) =>
    onChange(
      rules.map((rule) =>
        rule.clientId === id ? { ...rule, ...patch } : rule,
      ),
    );

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {rules.map((rule, index) => {
        const amountId = `escrow-milestone-${rule.clientId}-amount`;
        return (
          <fieldset
            key={rule.clientId}
            className="space-y-4 rounded-xl border border-outline-variant/20 p-4"
          >
            <legend className="px-2 text-sm font-bold">
              Milestone {index + 1}
            </legend>

            <label className="block text-xs font-bold text-secondary">
              Rule type
              <select
                value={rule.type}
                onChange={(event) =>
                  update(rule.clientId, {
                    type: event.target.value as EscrowRuleType,
                    metadata:
                      event.target.value === 'release_after_days'
                        ? { days: 0 }
                        : {},
                  })
                }
                className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
              >
                {RULE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal">
                {RULE_ACTOR_GUIDANCE[rule.type]}
              </span>
              {errors[rule.clientId]?.type ? (
                <span className="mt-1 block text-error">
                  {errors[rule.clientId].type}
                </span>
              ) : null}
            </label>

            <label className="block text-xs font-bold text-secondary">
              Description
              <textarea
                value={rule.description}
                onChange={(event) =>
                  update(rule.clientId, { description: event.target.value })
                }
                rows={2}
                className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
              />
              {errors[rule.clientId]?.description ? (
                <span className="mt-1 block text-error">
                  {errors[rule.clientId].description}
                </span>
              ) : null}
            </label>

            <label
              htmlFor={amountId}
              className="block text-xs font-bold text-secondary"
            >
              Milestone amount (NGN)
              <input
                id={amountId}
                type="number"
                min={1}
                max={escrowAmount}
                step={1}
                value={rule.amount ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  update(rule.clientId, {
                    amount: value === '' ? undefined : Number(value),
                  });
                }}
                className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm"
                aria-invalid={Boolean(errors[rule.clientId]?.amount)}
              />
              {rule.amount !== undefined &&
              Number.isFinite(rule.amount) &&
              rule.amount > 0 ? (
                <span className="mt-1 block font-normal text-primary">
                  {formatEscrowMoney(rule.amount, currency)}
                </span>
              ) : null}
              {errors[rule.clientId]?.amount ? (
                <span className="mt-1 block text-error" role="alert">
                  {errors[rule.clientId].amount}
                </span>
              ) : null}
            </label>

            {rule.type === 'release_after_days' ? (
              <label className="block text-xs font-bold text-secondary">
                Waiting period (days)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={String(rule.metadata?.days ?? 0)}
                  onChange={(event) =>
                    update(rule.clientId, {
                      metadata: { days: Number(event.target.value) },
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm"
                />
                {errors[rule.clientId]?.days ? (
                  <span className="mt-1 block text-error">
                    {errors[rule.clientId].days}
                  </span>
                ) : null}
              </label>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={rule.required}
                  onChange={(event) =>
                    update(rule.clientId, { required: event.target.checked })
                  }
                />
                Required for release
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-2 disabled:opacity-30"
                  aria-label={`Move milestone ${index + 1} up`}
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  type="button"
                  disabled={index === rules.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-2 disabled:opacity-30"
                  aria-label={`Move milestone ${index + 1} down`}
                >
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      rules.filter((item) => item.clientId !== rule.clientId),
                    )
                  }
                  className="rounded p-2 text-error"
                  aria-label={`Remove milestone ${index + 1}`}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </fieldset>
        );
      })}

      <button
        type="button"
        aria-label="Add milestone"
        onClick={() => onChange([...rules, newRule()])}
        className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold"
      >
        <span className="material-symbols-outlined">add</span>
        Add milestone
      </button>
    </div>
  );
};

export default CustomRuleEditor;
