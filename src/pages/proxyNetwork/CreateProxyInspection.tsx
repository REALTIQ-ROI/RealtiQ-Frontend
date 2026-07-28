import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import { useProperties } from '../../contexts/PropertiesContext';
import { REQUESTED_SERVICES } from '../../features/proxyNetwork/config';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import type { RequestedService } from '../../types/proxyNetwork';

const CreateProxyInspection = () => {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { properties } = useProperties();
  const [propertyId, setPropertyId] = useState(params.get('propertyId') || '');
  const [inspectorId, setInspectorId] = useState(params.get('inspectorId') || '');
  const [services, setServices] = useState<RequestedService[]>(['physical_inspection', 'recorded_video_walkthrough', 'photos', 'condition_report']);
  const [requirements, setRequirements] = useState(''); const [preferredDate, setPreferredDate] = useState('');
  const [reviewing, setReviewing] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const eligible = properties.filter((item) => item.status === 'available' && (!item.approvalStatus || item.approvalStatus === 'approved'));
  const validate = () => { if (!propertyId || !inspectorId) return 'Select a property and inspector.'; if (!services.length) return 'Select at least one requested service.'; if (services.includes('custom') && !requirements.trim()) return 'Describe the custom requirement.'; return ''; };
  const submit = async (event: FormEvent) => { event.preventDefault(); const issue = validate(); if (issue) return setError(issue); if (!reviewing) { setReviewing(true); return; } setPending(true); setError('');
    try { const request = await proxyNetworkService.createRequest({ propertyId, inspectorId, requestedServices: services, customRequirements: requirements.trim() || undefined, preferredDate: preferredDate ? new Date(preferredDate).toISOString() : undefined }); navigate(`/buyer/proxy-inspections/${request._id}`); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to create this inspection request.'); setReviewing(false); } finally { setPending(false); }
  };
  return <BuyerPortalLayout pageTitle="Request a Proxy Inspection" pageSubtitle="Recorded evidence and an observational condition report from an independent professional."><form onSubmit={(e) => void submit(e)} className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow-sm">
    {reviewing ? <><h2 className="text-2xl font-black">Review request</h2><dl className="grid gap-4 rounded-xl bg-surface-container-low p-5 sm:grid-cols-2"><div><dt className="text-xs font-bold text-secondary">Property</dt><dd className="font-bold">{eligible.find((p) => p._id === propertyId || p.publicReference === propertyId)?.title || propertyId}</dd></div><div><dt className="text-xs font-bold text-secondary">Inspector user ID</dt><dd className="break-all text-sm">{inspectorId}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-bold text-secondary">Services</dt><dd>{services.map((s) => REQUESTED_SERVICES.find((item) => item.value === s)?.label).join(', ')}</dd></div><div><dt className="text-xs font-bold text-secondary">Preferred date</dt><dd>{preferredDate ? new Date(preferredDate).toLocaleString() : 'Flexible'}</dd></div><div><dt className="text-xs font-bold text-secondary">Instructions</dt><dd>{requirements || 'None'}</dd></div></dl><p className="text-sm text-secondary">The selected professional is an independent third party, not a RealtiQ employee. Payment is protected after both parties independently confirm the same price.</p></> : <>
      <h2 className="text-2xl font-black">Request details</h2>
      <label className="block text-sm font-bold">Eligible property<select required value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal"><option value="">Select an approved available property</option>{eligible.map((item) => <option key={item._id} value={item._id}>{item.title} · {item.publicReference || 'Reference pending'}</option>)}</select></label>
      <label className="block text-sm font-bold">Inspector user ID<input required value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /><span className="mt-1 block text-xs font-normal text-secondary">Choose a professional from the public directory; requests always use the inspector user ID, not their profile ID.</span></label>
      <fieldset><legend className="text-sm font-bold">Requested services</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{REQUESTED_SERVICES.map((item) => <label key={item.value} className="flex gap-3 rounded-lg bg-surface-container-low p-3 text-sm"><input type="checkbox" checked={services.includes(item.value)} onChange={(e) => setServices((old) => e.target.checked ? [...old,item.value] : old.filter((v) => v !== item.value))} />{item.label}</label>)}</div></fieldset>
      <label className="block text-sm font-bold">Custom instructions<textarea required={services.includes('custom')} value={requirements} onChange={(e) => setRequirements(e.target.value)} className="mt-2 min-h-28 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      <label className="block text-sm font-bold">Preferred date and time<input type="datetime-local" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
    </>}
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}<div className="flex gap-3">{reviewing ? <button type="button" onClick={() => setReviewing(false)} className="rounded-lg bg-surface-container-high px-5 py-3 font-bold">Edit</button> : null}<button disabled={pending} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">{pending ? 'Creating…' : reviewing ? 'Send private request' : 'Review request'}</button></div>
  </form></BuyerPortalLayout>;
};
export default CreateProxyInspection;
