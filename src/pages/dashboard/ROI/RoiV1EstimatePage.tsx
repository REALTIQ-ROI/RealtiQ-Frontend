import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/PublicLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { RoiEstimateView } from '../../../components/roiV1/RoiEstimateView';
import { useAuth } from '../../../contexts/AuthContext';
import { roiV1Cache } from '../../../features/roiV1/cache';
import { toCreateInput, validateRoiForm, type RoiFormErrors, type RoiFormValues } from '../../../features/roiV1/validation';
import { ApiRequestError } from '../../../lib/axios';
import { roiV1Service } from '../../../services/roiV1Service';
import type { RoiEstimate, RoiPurpose } from '../../../types/roiV1';

const randomKey = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
const initial: RoiFormValues = { asOf: '', projectionPeriodYears: '5', purpose: 'buyer_research', annualRent: '', operatingExpenses: '', vacancyRate: '', appreciationRate: '' };
const errorCopy = (error: unknown) => {
  const status = error instanceof ApiRequestError ? error.status : undefined;
  if (status === 400) return error instanceof Error ? error.message : 'Check the submitted values and idempotency key.';
  if (status === 401) return 'Your session expired. Sign in again without sharing this estimate request.';
  if (status === 403) return 'You do not have access to calculate an estimate for this property.';
  if (status === 404) return 'This approved property is unavailable.';
  if (status === 409) return 'This retry key no longer matches the inputs. Submit again to start a new calculation.';
  if (status === 422) return 'No reliable immutable property snapshot existed by that date. Choose a later evidence date; current facts will not be substituted.';
  if (status === 429) return 'The estimate limit was reached (30 requests per 15 minutes). Your inputs are preserved; retry after the server window resets.';
  return error instanceof Error ? error.message : 'The estimate could not be created.';
};

const RoiV1EstimatePage = () => {
  const { propertyReference = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<RoiFormErrors>({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roi, setRoi] = useState<RoiEstimate | null>(null);
  const retryRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const purposeOptions = useMemo(() => {
    const options: Array<[RoiPurpose, string]> = [];
    if (user?.role === 'buyer') options.push(['buyer_research', 'Buyer research']);
    if (user?.role === 'landlord') options.push(['seller_research', 'Seller research']);
    if (user?.role === 'admin') options.push(['admin_review', 'Admin review']);
    return options;
  }, [user?.role]);
  useEffect(() => { if (purposeOptions[0]) setValues((old) => ({ ...old, purpose: purposeOptions[0][0] })); }, [purposeOptions]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const change = (field: keyof RoiFormValues, value: string) => {
    setValues((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    retryRef.current = null;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !/^RTQ-PROP-[A-Za-z0-9-]+$/.test(propertyReference)) return;
    const nextErrors = validateRoiForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const input = toCreateInput(propertyReference, values);
    const fingerprint = JSON.stringify(input);
    const key = retryRef.current?.fingerprint === fingerprint ? retryRef.current.key : randomKey();
    retryRef.current = { fingerprint, key };
    abortRef.current?.abort();
    const controller = new AbortController(); abortRef.current = controller;
    setLoading(true); setRequestError('');
    try {
      const response = await roiV1Service.createEstimate(input, key, controller.signal);
      if (controller.signal.aborted) return;
      setRoi(response.roi);
      if (user) roiV1Cache.setEstimate(user._id, response.roi);
      if (user && (user.role === 'landlord' || user.role === 'admin')) roiV1Cache.invalidateHistory(user._id, propertyReference);
      retryRef.current = null;
      requestAnimationFrame(() => document.getElementById('roi-result-heading')?.focus());
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiRequestError && error.status === 409) retryRef.current = null;
      setRequestError(errorCopy(error));
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };

  return <PublicLayout><main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8"><header><button className="text-primary" onClick={() => navigate(-1)}>← Back</button><h1 className="mt-4 text-3xl font-bold">ROI evidence projection</h1><p className="mt-2">Property <strong>{propertyReference}</strong></p></header>
    <form onSubmit={submit} className="space-y-6 rounded-xl border p-5" noValidate aria-describedby={requestError ? 'roi-submit-error' : undefined}><h2 className="text-xl font-bold">Projection request</h2><Input id="roi-period" label="Projection period (years)" type="number" min="0.25" max="50" step="0.25" required value={values.projectionPeriodYears} error={errors.projectionPeriodYears} onChange={(e) => change('projectionPeriodYears', e.target.value)}/><Input id="roi-asof" label="Evidence as of (optional, your local time)" type="datetime-local" value={values.asOf} error={errors.asOf} onChange={(e) => change('asOf', e.target.value)}/><div><label htmlFor="roi-purpose" className="block text-xs font-bold uppercase">Purpose</label><select id="roi-purpose" className="mt-2 w-full rounded-lg border p-3" value={values.purpose} onChange={(e) => change('purpose', e.target.value)}>{purposeOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
      <fieldset className="grid gap-4 border-t pt-5 sm:grid-cols-2"><legend className="px-2 text-lg font-bold">Your optional assumptions</legend><p className="sm:col-span-2 text-sm text-secondary">Blank values are omitted. These inputs are kept separate from sourced evidence.</p><Input id="roi-rent" label="Annual asking rent" type="number" min="0.01" max="1000000000000000" step="any" value={values.annualRent} error={errors.annualRent} onChange={(e) => change('annualRent', e.target.value)}/><Input id="roi-expenses" label="Annual operating expenses" type="number" min="0" max="1000000000000000" step="any" value={values.operatingExpenses} error={errors.operatingExpenses} onChange={(e) => change('operatingExpenses', e.target.value)}/><Input id="roi-vacancy" label="Vacancy rate (%)" type="number" min="0" max="100" step="any" value={values.vacancyRate} error={errors.vacancyRate} onChange={(e) => change('vacancyRate', e.target.value)}/><Input id="roi-appreciation" label="Appreciation assumption (%)" type="number" min="-50" max="100" step="any" value={values.appreciationRate} error={errors.appreciationRate} onChange={(e) => change('appreciationRate', e.target.value)}/></fieldset>
      {requestError ? <div id="roi-submit-error" role="alert" tabIndex={-1} className="rounded-lg border border-red-300 bg-red-50 p-4 text-slate-900">{requestError}</div> : null}<Button type="submit" loading={loading} loadingLabel="Calculating…">Create evidence-backed estimate</Button></form>
    {roi ? <RoiEstimateView roi={roi}/> : null}{user && (user.role === 'landlord' || user.role === 'admin') ? <Link className="inline-block font-bold text-primary" to={`/dashboard/roi-v1/properties/${propertyReference}/history`}>View property estimate history</Link> : null}
  </main></PublicLayout>;
};
export default RoiV1EstimatePage;
