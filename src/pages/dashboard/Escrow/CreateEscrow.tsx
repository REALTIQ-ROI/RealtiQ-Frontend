import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import CustomRuleEditor from '../../../components/escrow/CustomRuleEditor';
import {
  formatEscrowMoney,
  RULE_LABELS,
} from '../../../components/escrow/escrowConfig';
import {
  milestoneAllocation,
  validateRules,
  type EditableRule,
  type RuleErrors,
} from '../../../components/escrow/ruleValidation';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { ApiRequestError } from '../../../lib/axios';
import { escrowService } from '../../../services/escrowService';
import { propertyService } from '../../../services/propertyService';
import { propertyRouteReference, resolvePropertyOwnerId } from '../../../types';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';

const initialRule = (): EditableRule => ({
  clientId: crypto.randomUUID(),
  type: 'inspection_completed',
  description: 'Buyer must confirm physical inspection before release',
  required: true,
  amount: undefined,
  metadata: {},
});

const AllocationSummary = ({
  escrowAmount,
  totalAllocated,
  difference,
  currency,
}: {
  escrowAmount: number;
  totalAllocated: number;
  difference: number;
  currency?: string;
}) => (
  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
    <dl className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt>Escrow amount</dt>
        <dd className="font-bold">{formatEscrowMoney(escrowAmount, currency)}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt>Total milestone allocation</dt>
        <dd className="font-bold">{formatEscrowMoney(totalAllocated, currency)}</dd>
      </div>
      <div className="border-t border-outline-variant/20 pt-2">
        <div className="flex items-center justify-between gap-4">
          <dt>{difference < 0 ? 'Overallocated amount' : 'Unallocated amount'}</dt>
          <dd
            className={`font-black ${
              difference === 0
                ? 'text-emerald-700'
                : difference < 0
                  ? 'text-error'
                  : 'text-amber-700'
            }`}
          >
            {formatEscrowMoney(Math.abs(difference), currency)}
          </dd>
        </div>
      </div>
    </dl>
    <p
      id="escrow-allocation-status"
      className={`mt-3 text-xs font-bold ${
        difference === 0 ? 'text-emerald-700' : 'text-amber-800'
      }`}
      role="status"
    >
      {difference === 0
        ? 'Allocation complete. The milestones exactly match the escrow amount.'
        : difference > 0
          ? `Allocate the remaining ${formatEscrowMoney(difference, currency)} before continuing.`
          : `Reduce milestone allocations by ${formatEscrowMoney(Math.abs(difference), currency)} before continuing.`}
    </p>
    <p className="mt-3 text-xs text-secondary">
      The full escrow amount is funded upfront. Milestone amounts are accounting
      allocations only and are released together after every required milestone
      and final administrator approval.
    </p>
  </div>
);

const CreateEscrow = () => {
  const { propertyId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data: property,
    loading,
    error,
    execute,
  } = useAsync(() => propertyService.getPropertyById(propertyId), true);
  const [custom, setCustom] = useState(false);
  const [rules, setRules] = useState<EditableRule[]>([initialRule()]);
  const [errors, setErrors] = useState<RuleErrors>({});
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const owner = useMemo(
    () =>
      property?.owner ??
      (property && typeof property.ownerId !== 'string' ? property.ownerId : null),
    [property],
  );
  const reference = property ? propertyRouteReference(property) : propertyId;
  const escrowOffered = property
    ? normalizePropertyPaymentTypes(
        property.paymentTypes,
        property.price,
      ).includes('escrow')
    : false;
  const unavailable =
    property?.status !== 'available' ||
    Boolean(property?.approvalStatus && property.approvalStatus !== 'approved') ||
    Boolean(property && resolvePropertyOwnerId(property) === user?._id) ||
    !escrowOffered;
  const allocation = useMemo(
    () => milestoneAllocation(property?.price ?? 0, rules),
    [property?.price, rules],
  );

  const updateRules = (nextRules: EditableRule[]) => {
    setRules(nextRules);
    setErrors({});
    setSubmissionError(null);
  };

  const validateCustomPlan = () => {
    if (!rules.length) {
      toast.error('Add at least one custom milestone.');
      return false;
    }
    const nextErrors = validateRules(rules, { requireAmounts: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Correct the highlighted milestone fields.');
      return false;
    }
    if (!allocation.exact) {
      toast.error(
        allocation.overallocated
          ? 'Milestone allocations exceed the escrow amount.'
          : 'Milestone allocations must total the full escrow amount.',
      );
      return false;
    }
    return true;
  };

  const continueToReview = () => {
    setSubmissionError(null);
    if (custom && !validateCustomPlan()) return;
    setReview(true);
  };

  const create = async () => {
    if (!property || submitting || duplicateConflict) return;
    if (custom && !validateCustomPlan()) {
      setReview(false);
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);
    try {
      const escrow = await escrowService.create({
        propertyId: reference,
        amount: property.price,
        ...(custom
          ? {
              rules: rules.map((rule) => ({
                type: rule.type,
                description: rule.description.trim(),
                required: rule.required,
                amount: rule.amount,
                metadata: rule.metadata,
              })),
            }
          : {}),
        metadata: {},
      });
      toast.success('Escrow created. Review it before starting payment.');
      navigate(`/dashboard/buyer/escrows/${escrow._id}`);
    } catch (raw) {
      const message =
        raw instanceof Error ? raw.message : 'Unable to create escrow.';
      setSubmissionError(message);
      if (
        raw instanceof ApiRequestError &&
        raw.status === 409 &&
        raw.message === 'You already have an active escrow for this property'
      ) {
        setDuplicateConflict(true);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BuyerPortalLayout
      pageTitle="Create Escrow"
      pageSubtitle="Secure your payment until the agreed property conditions are complete and an administrator approves release."
    >
      {duplicateConflict ? (
        <div
          role="alert"
          className="mb-6 rounded-xl bg-amber-100 p-4 text-sm text-amber-900"
        >
          <strong>You already have an active escrow for this property.</strong>
          <p className="mt-1">
            Open your escrow list to continue with the existing transaction.
          </p>
          <Link
            to="/dashboard/buyer/escrows"
            className="mt-3 inline-block font-bold underline"
          >
            View my escrows
          </Link>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Loading property..." />
      ) : error || !property ? (
        <ErrorState
          message={error ?? 'Property not found.'}
          onRetry={() => void execute()}
        />
      ) : unavailable ? (
        <div className="rounded-xl bg-white p-10 text-center">
          <h2 className="text-xl font-bold">Escrow is unavailable</h2>
          <p className="mt-2 text-sm text-secondary">
            {!escrowOffered
              ? 'The landlord has not offered escrow for this property.'
              : 'Only available, approved properties owned by another user can be purchased through escrow.'}
          </p>
          <Link
            to={`/properties/${reference}`}
            className="mt-5 inline-block text-sm font-bold text-primary"
          >
            Return to property
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-xl bg-white p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
              <span
                className={`rounded-full px-3 py-1 ${
                  !review ? 'bg-primary text-on-primary' : 'bg-surface-container'
                }`}
              >
                1 Milestones
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  review ? 'bg-primary text-on-primary' : 'bg-surface-container'
                }`}
              >
                2 Review
              </span>
            </div>

            {submissionError ? (
              <p
                role="alert"
                className="mb-5 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800"
              >
                {submissionError}
              </p>
            ) : null}

            {!review ? (
              <>
                <div className="rounded-xl bg-primary/5 p-4 text-sm text-on-surface-variant">
                  <strong className="block text-primary">
                    How escrow protects the transaction
                  </strong>
                  Paystack funds the complete property price upfront. Satisfying
                  a milestone records progress only; it does not transfer or
                  release that milestone amount. Final release still requires
                  every required milestone and administrator approval.
                </div>

                <fieldset className="mt-6 space-y-3">
                  <legend className="font-bold">Release milestones</legend>
                  <label
                    className={`block cursor-pointer rounded-xl border p-4 ${
                      !custom
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/20'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={!custom}
                      onChange={() => {
                        setCustom(false);
                        setSubmissionError(null);
                      }}
                      className="mr-3"
                    />
                    Use RealtiQ default milestones
                    <p className="ml-7 mt-1 text-xs text-secondary">
                      Buyer confirmation, administrator approval, and document
                      verification. Legacy default milestones do not use custom
                      allocations.
                    </p>
                  </label>
                  <label
                    className={`block cursor-pointer rounded-xl border p-4 ${
                      custom
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/20'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={custom}
                      onChange={() => {
                        setCustom(true);
                        setSubmissionError(null);
                      }}
                      className="mr-3"
                    />
                    Define custom milestone allocations
                  </label>
                </fieldset>

                {custom ? (
                  <div className="mt-5 space-y-5">
                    <CustomRuleEditor
                      rules={rules}
                      errors={errors}
                      escrowAmount={property.price}
                      currency={property.currency}
                      onChange={updateRules}
                    />
                    <AllocationSummary
                      escrowAmount={allocation.escrowAmount}
                      totalAllocated={allocation.totalAllocated}
                      difference={allocation.difference}
                      currency={property.currency}
                    />
                  </div>
                ) : null}

                <Button
                  className="mt-8"
                  disabled={custom && (!rules.length || !allocation.exact)}
                  aria-describedby={custom ? 'escrow-allocation-status' : undefined}
                  onClick={continueToReview}
                >
                  Review Escrow
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Confirm escrow terms</h2>
                <p className="mt-2 text-sm text-secondary">
                  Payment will not start automatically. After creation, Paystack
                  will still charge the full escrow amount in one funding
                  transaction.
                </p>
                <dl className="mt-6 grid gap-4 rounded-xl bg-surface-container-low p-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase text-secondary">
                      Fixed escrow amount
                    </dt>
                    <dd className="mt-1 font-black">
                      {formatEscrowMoney(property.price, property.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-secondary">
                      Seller
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {owner?.name ?? 'Property seller'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <h3 className="font-bold">Milestones</h3>
                  {custom ? (
                    <>
                      <ol className="mt-3 space-y-2">
                        {rules.map((rule, index) => (
                          <li
                            key={rule.clientId}
                            className="rounded-lg border border-outline-variant/20 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <strong>
                                  {index + 1}. {RULE_LABELS[rule.type]}
                                </strong>
                                <p className="mt-1 text-secondary">
                                  {rule.description}{' '}
                                  <span>
                                    ({rule.required ? 'Required' : 'Optional'})
                                  </span>
                                </p>
                              </div>
                              <strong className="text-primary">
                                {formatEscrowMoney(
                                  rule.amount ?? 0,
                                  property.currency,
                                )}
                              </strong>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-4">
                        <AllocationSummary
                          escrowAmount={allocation.escrowAmount}
                          totalAllocated={allocation.totalAllocated}
                          difference={allocation.difference}
                          currency={property.currency}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 rounded-lg bg-surface-container-low p-4 text-sm">
                      RealtiQ default milestones will be created by the backend.
                    </p>
                  )}
                </div>

                <label className="mt-6 flex items-start gap-3 rounded-lg border border-outline-variant/20 p-4 text-sm">
                  <input
                    required
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1"
                  />
                  I understand that the full property price is funded upfront,
                  milestone satisfaction does not release money, and final
                  ownership requires administrator release.
                </label>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setReview(false)}>
                    Back
                  </Button>
                  <Button
                    disabled={
                      submitting ||
                      !confirmed ||
                      (custom && !allocation.exact)
                    }
                    onClick={() => void create()}
                  >
                    {submitting ? 'Creating...' : 'Create Escrow'}
                  </Button>
                </div>
              </>
            )}
          </section>

          <aside className="h-fit rounded-xl bg-white p-5">
            <div className="h-44 overflow-hidden rounded-lg">
              <MediaPreview
                media={property.media?.[0]}
                alt={property.title}
                className="h-full w-full object-cover"
              />
            </div>
            <h2 className="mt-4 text-lg font-bold">{property.title}</h2>
            <p className="text-sm text-secondary">{property.location}</p>
            <p className="mt-4 text-2xl font-black text-primary">
              {formatEscrowMoney(property.price, property.currency)}
            </p>
            <p className="mt-2 text-xs text-secondary">
              The escrow amount is fixed to the property price and is funded in
              full through the existing Paystack flow.
            </p>
          </aside>
        </div>
      )}
    </BuyerPortalLayout>
  );
};

export default CreateEscrow;
