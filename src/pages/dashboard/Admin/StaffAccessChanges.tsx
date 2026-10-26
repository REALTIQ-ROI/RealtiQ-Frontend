import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { staffAccessChangeService, staffDepartments, type StaffAccessChange, type StaffDepartment } from '../../../services/staffAccessChangeService';

const StaffAccessChanges = () => {
  const [items, setItems] = useState<StaffAccessChange[]>([]);
  const [targetIdentityId, setTargetIdentityId] = useState('');
  const [departments, setDepartments] = useState<StaffDepartment[]>([]);
  const [selected, setSelected] = useState<StaffAccessChange | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const prepareStepUp = useBoundStepUp<StaffAccessChange>();
  const decisionStepUp = useBoundStepUp<StaffAccessChange>();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await staffAccessChangeService.list()); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load staff access changes.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const beginPrepare = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[a-f\d]{24}$/i.test(targetIdentityId.trim()) || prepareStepUp.busy || prepareStepUp.challenge) { setError('Enter a valid target account ID before preparing this change.'); return; }
    const body = { targetIdentityId: targetIdentityId.trim(), departments };
    await prepareStepUp.begin({ method: 'POST', path: '/api/admin/staff-access-changes', body, label: 'Prepare a staff access change', execute: (challengeId, exactBody) => staffAccessChangeService.prepare(exactBody, challengeId) });
  };

  const finishPrepare = async (code: string) => {
    const result = await prepareStepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'Staff access change preparation failed.'); return false; }
    setSelected(result.value); setTargetIdentityId(''); setDepartments([]); await load(); return true;
  };

  const beginDecision = async () => {
    if (!selected || !['pending', 'prepared'].includes(selected.state)) return;
    const body = { decision, expectedVersion: selected.version };
    await decisionStepUp.begin({ method: 'POST', path: `/api/admin/staff-access-changes/${encodeURIComponent(selected.id)}/decision`, body, label: `${decision === 'approved' ? 'Approve' : 'Reject'} staff access change ${selected.id}`, execute: (challengeId, exactBody) => staffAccessChangeService.decide(selected.id, exactBody, challengeId) });
  };

  const finishDecision = async (code: string) => {
    const result = await decisionStepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The staff access decision failed. Refresh before trying again.'); return false; }
    setSelected(result.value); await load(); return true;
  };

  return <AdminLayout><main className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Executive staff administration</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Staff access changes</h1><p className="mt-2 text-sm text-secondary">Changes are prepared and decided by separate authorized Executive staff. Approval revokes the target’s sessions; they must sign in again.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5"><h2 className="text-lg font-bold">Prepare access change</h2><form onSubmit={(event) => void beginPrepare(event)} className="mt-4 space-y-4"><label className="block text-xs font-bold">Target account ID<input required value={targetIdentityId} onChange={(event) => setTargetIdentityId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><legend className="mb-2 text-xs font-bold">Departments (leave empty to request staff access removal)</legend>{staffDepartments.map((department) => <label key={department} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={departments.includes(department)} onChange={(event) => setDepartments((current) => event.target.checked ? [...current, department] : current.filter((item) => item !== department))} />{department.replaceAll('_', ' ')}</label>)}</fieldset><Button type="submit" disabled={prepareStepUp.busy || Boolean(prepareStepUp.challenge)}>Prepare with authenticator</Button>{prepareStepUp.error ? <p role="alert" className="text-sm text-error">{prepareStepUp.error}</p> : null}</form></section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-outline-variant/10 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Pending access changes</h2><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button></div>{loading ? <LoadingState label="Loading staff access changes…" /> : null}<div className="mt-3 space-y-2">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><strong>{item.targetIdentityId}</strong><span className="float-right text-xs uppercase">{item.state}</span><span className="mt-1 block text-xs text-secondary">{item.departments.length ? item.departments.join(', ') : 'Remove staff access'} · v{item.version}</span></button>)}{!loading && !items.length ? <p className="rounded border border-dashed p-4 text-sm text-secondary">No pending staff access changes.</p> : null}</div></div>
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">{selected ? <><h2 className="text-lg font-bold">Decision review</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-secondary">Change</dt><dd className="break-all font-semibold">{selected.id}</dd></div><div><dt className="text-secondary">Target</dt><dd className="break-all font-semibold">{selected.targetIdentityId}</dd></div><div><dt className="text-secondary">Proposed departments</dt><dd className="font-semibold">{selected.departments.length ? selected.departments.join(', ') : 'Remove staff access'}</dd></div><div><dt className="text-secondary">Prepared by</dt><dd className="break-all font-semibold">{selected.preparedBy}</dd></div></dl>{['pending', 'prepared'].includes(selected.state) ? <div className="mt-4 space-y-3"><p className="text-xs text-secondary">The server rejects a decision by the preparer and rechecks target auth version and current Executive authority.</p><label className="text-xs font-bold">Decision<select value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="mt-1 w-full rounded border p-2 text-sm font-normal"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label><Button type="button" disabled={decisionStepUp.busy || Boolean(decisionStepUp.challenge)} onClick={() => void beginDecision()}>Submit decision with authenticator</Button></div> : <p className="mt-3 text-sm">Final state: {selected.state}</p>}</> : <p className="text-sm text-secondary">Select an access change to review.</p>}</div></section>
    <StepUpDialog challenge={prepareStepUp.challenge} busy={prepareStepUp.busy} error={prepareStepUp.error} onCancel={prepareStepUp.cancel} onSubmit={finishPrepare} />
    <StepUpDialog challenge={decisionStepUp.challenge} busy={decisionStepUp.busy} error={decisionStepUp.error} onCancel={decisionStepUp.cancel} onSubmit={finishDecision} />
  </main></AdminLayout>;
};

export default StaffAccessChanges;
