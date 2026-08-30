import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import { useProperties } from '../../contexts/PropertiesContext';
import { REQUESTED_SERVICES } from '../../features/proxyNetwork/config';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import type { ProxyInspectionRequest, RequestedService } from '../../types/proxyNetwork';

const refId = (value: ProxyInspectionRequest['property'] | ProxyInspectionRequest['inspector']) =>
  typeof value === 'string' ? value : value._id;

const CreateProxyInspection = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { properties } = useProperties();
  const [propertyId, setPropertyId] = useState(params.get('propertyId') || '');
  const [inspectorId] = useState(params.get('inspectorId') || '');
  const [inspectorName, setInspectorName] = useState((location.state as { inspectorName?: string } | null)?.inspectorName || '');
  const [inspectorLookupError, setInspectorLookupError] = useState('');
  const [services, setServices] = useState<RequestedService[]>(['physical_inspection', 'recorded_video_walkthrough', 'photos', 'condition_report']);
  const [requirements, setRequirements] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateRequestId, setDuplicateRequestId] = useState('');
  const [error, setError] = useState('');
  const eligible = properties.filter((item) => item.status === 'available' && (!item.approvalStatus || item.approvalStatus === 'approved'));
  const selectedProperty = eligible.find((property) => property._id === propertyId || property.publicReference === propertyId);
  const requestPropertyId = selectedProperty?._id || propertyId;

  useEffect(() => {
    if (!inspectorId || inspectorName) return;
    const controller = new AbortController();
    proxyNetworkService.getPublicInspector(inspectorId, controller.signal)
      .then((profile) => {
        setInspectorName(typeof profile.user === 'string' ? 'RealtIQ Verified Property Agent' : profile.user.name);
        setInspectorLookupError('');
      })
      .catch(() => setInspectorLookupError('The selected Property Agent could not be loaded. Choose an agent again from the directory.'));
    return () => controller.abort();
  }, [inspectorId, inspectorName]);

  const validate = () => {
    if (!propertyId || !inspectorId) return 'Select a property and Property Agent.';
    if (!services.length) return 'Select at least one requested service.';
    if (services.includes('custom') && !requirements.trim()) return 'Describe the custom requirement.';
    return '';
  };

  const findDuplicateRequest = async () => {
    const result = await proxyNetworkService.listRequests({
      property: requestPropertyId,
      inspector: inspectorId,
      page: 1,
      limit: 5,
    });
    return result.requests.find((request) =>
      refId(request.property) === requestPropertyId && refId(request.inspector) === inspectorId,
    ) || result.requests[0] || null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const issue = validate();
    if (issue) return setError(issue);
    setCheckingDuplicate(true);
    setDuplicateRequestId('');
    setError('');
    try {
      const duplicate = await findDuplicateRequest();
      if (duplicate) {
        setDuplicateRequestId(duplicate._id);
        setReviewing(false);
        return setError('You already have a Property Agent inspection request for this property with this Property Agent.');
      }
    } catch (raw) {
      return setError(raw instanceof Error ? raw.message : 'Unable to check for an existing inspection request.');
    } finally {
      setCheckingDuplicate(false);
    }
    if (!reviewing) {
      setReviewing(true);
      return;
    }
    setPending(true);
    setError('');
    try {
      const request = await proxyNetworkService.createRequest({
        propertyId: requestPropertyId,
        inspectorId,
        requestedServices: services,
        customRequirements: requirements.trim() || undefined,
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : undefined,
      });
      navigate(`/buyer/proxy-inspections/${request._id}`);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to create this inspection request.');
      setReviewing(false);
    } finally {
      setPending(false);
    }
  };

  const agentDirectoryPath = `/proxy-inspectors${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`;
  const agentDisplayName = inspectorName || 'RealtIQ Verified Property Agent';

  return (
    <BuyerPortalLayout pageTitle="Request a Property Agent Inspection" pageSubtitle="Recorded evidence and an observational condition report from an independent professional.">
      <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        {reviewing ? (
          <>
            <h2 className="text-2xl font-black">Review request</h2>
            <dl className="grid gap-4 rounded-xl bg-surface-container-low p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-secondary">Property</dt>
                <dd className="font-bold">{selectedProperty?.title || propertyId}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Selected Property Agent</dt>
                <dd className="font-bold">{agentDisplayName}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold text-secondary">Services</dt>
                <dd>{services.map((service) => REQUESTED_SERVICES.find((item) => item.value === service)?.label).join(', ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Preferred date</dt>
                <dd>{preferredDate ? new Date(preferredDate).toLocaleString() : 'Flexible'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Instructions</dt>
                <dd>{requirements || 'None'}</dd>
              </div>
            </dl>
            <p className="text-sm text-secondary">The selected professional is an independent third party, not a RealtIQ employee. Payment is protected after both parties independently confirm the same price.</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black">Request details</h2>
            <label className="block text-sm font-bold">
              Eligible property
              <select required value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setReviewing(false); setDuplicateRequestId(''); setError(''); }} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal">
                <option value="">Select an approved available property</option>
                {eligible.map((item) => <option key={item._id} value={item._id}>{item.title} - {item.publicReference || 'Reference pending'}</option>)}
              </select>
            </label>
            <section className="rounded-lg bg-surface-container-low p-4" aria-labelledby="selected-agent-heading">
              <p id="selected-agent-heading" className="text-sm font-bold">Selected Property Agent</p>
              {inspectorId ? (
                <>
                  <p className="mt-2 text-lg font-black">{inspectorName || 'Loading selected Property Agent...'}</p>
                  <p className="mt-1 text-xs text-secondary">This selection is locked for the request. Choose a different agent from the public directory to change it.</p>
                  <Link to={agentDirectoryPath} className="mt-3 inline-block text-sm font-bold text-primary underline">Choose a different Property Agent</Link>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-secondary">No Property Agent selected yet.</p>
                  <Link to={agentDirectoryPath} className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Choose a Property Agent</Link>
                </>
              )}
              {inspectorLookupError ? <p role="alert" className="mt-3 text-sm text-red-800">{inspectorLookupError}</p> : null}
            </section>
            <fieldset>
              <legend className="text-sm font-bold">Requested services</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {REQUESTED_SERVICES.map((item) => (
                  <label key={item.value} className="flex gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
                    <input type="checkbox" checked={services.includes(item.value)} onChange={(event) => setServices((old) => event.target.checked ? [...old, item.value] : old.filter((value) => value !== item.value))} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-bold">
              Custom instructions
              <textarea required={services.includes('custom')} value={requirements} onChange={(event) => setRequirements(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-bold">
              Preferred date and time
              <input type="datetime-local" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" />
            </label>
          </>
        )}
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{duplicateRequestId ? <> <Link to={`/buyer/proxy-inspections/${duplicateRequestId}`} className="font-bold underline">Open existing request.</Link></> : null}</p> : null}
        <div className="flex gap-3">
          {reviewing ? <button type="button" onClick={() => setReviewing(false)} className="rounded-lg bg-surface-container-high px-5 py-3 font-bold">Edit</button> : null}
          <button disabled={pending || checkingDuplicate} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">{checkingDuplicate ? 'Checking...' : pending ? 'Creating...' : reviewing ? 'Send private request' : 'Review request'}</button>
        </div>
      </form>
    </BuyerPortalLayout>
  );
};

export default CreateProxyInspection;
