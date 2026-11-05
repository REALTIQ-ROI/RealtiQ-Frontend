import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../services/userService';
import { canManageAdminStaff } from '../../../services/adminAccessService';
import { staffAccessChangeService, type AdminStaffRecord, type StaffAccessChange, type StaffDepartment } from '../../../services/staffAccessChangeService';
import type { User } from '../../../types';

type StaffAssignmentCandidate = User & { accountStatus?: string; phoneVerified?: boolean };

const isEligibleTarget = (candidate: StaffAssignmentCandidate, currentIdentityId?: string) =>
  candidate._id !== currentIdentityId && candidate.accountStatus === 'active' && candidate.emailVerified === true && candidate.phoneVerified === true;

const StaffAccessChanges = () => {
  const { adminAccess, user } = useAuth();
  const [items, setItems] = useState<StaffAccessChange[]>([]);
  const [staff, setStaff] = useState<AdminStaffRecord[]>([]);
  const [candidates, setCandidates] = useState<StaffAssignmentCandidate[]>([]);
  const [staffCursor, setStaffCursor] = useState<string | null>(null);
  const [staffQuery, setStaffQuery] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [targetIdentityId, setTargetIdentityId] = useState('');
  const [departments, setDepartments] = useState<StaffDepartment[]>([]);
  const [removeAccess, setRemoveAccess] = useState(false);
  const [selected, setSelected] = useState<StaffAccessChange | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadVersion = useRef(0);
  const prepareStepUp = useBoundStepUp<StaffAccessChange>();
  const decisionStepUp = useBoundStepUp<StaffAccessChange>();
  const canManageStaff = canManageAdminStaff(adminAccess);

  const load = useCallback(async (query = '', after?: string) => {
    const version = ++loadVersion.current;
    if (after) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const [changes, staffPage, accounts] = await Promise.all([
        staffAccessChangeService.list(),
        staffAccessChangeService.listStaff({ q: query.trim() || undefined, limit: 25, ...(after ? { after } : {}) }),
        userService.fetchUsers(),
      ]);
      if (loadVersion.current !== version) return;
      setItems(changes);
      setStaff((current) => after ? [...current, ...staffPage.staff] : staffPage.staff);
      setStaffCursor(staffPage.nextCursor);
      setCandidates(accounts as StaffAssignmentCandidate[]);
    } catch (raw) {
      if (loadVersion.current !== version) return;
      setError(raw instanceof Error ? raw.message : 'Unable to load staff administration data.');
      if (!after) {
        setItems([]);
        setStaff([]);
        setStaffCursor(null);
      }
    } finally {
      if (loadVersion.current === version) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => { void load(); return () => { loadVersion.current += 1; }; }, [load]);

  const eligibleCandidates = useMemo(() => candidates
    .filter((candidate) => isEligibleTarget(candidate, user?._id))
    .filter((candidate) => {
      const query = candidateQuery.trim().toLowerCase();
      return !query || candidate.name.toLowerCase().includes(query) || candidate.email.toLowerCase().includes(query);
    }), [candidateQuery, candidates, user?._id]);

  const assignableDepartments = adminAccess?.assignableDepartments ?? [];

  const beginPrepare = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageStaff || prepareStepUp.busy || prepareStepUp.challenge) return;
    if (!targetIdentityId) { setError('Select an existing eligible account.'); return; }
    if (!removeAccess && !departments.length) { setError('Select at least one department, or choose “Remove staff access”.'); return; }
    const body = { targetIdentityId, departments: removeAccess ? [] : departments };
    setError('');
    await prepareStepUp.begin({
      method: 'POST',
      path: '/api/admin/staff-access-changes',
      body,
      label: removeAccess ? 'Prepare staff access removal' : 'Prepare staff department assignment',
      execute: (challengeId, exactBody) => staffAccessChangeService.prepare(exactBody, challengeId),
    });
  };

  const finishPrepare = async (code: string) => {
    const result = await prepareStepUp.complete(code);
    if (!result.ok) return false;
    setSelected(result.value);
    setTargetIdentityId('');
    setDepartments([]);
    setRemoveAccess(false);
    await load(staffQuery);
    return true;
  };

  const canDecideSelected = Boolean(selected && canManageStaff && ['pending', 'prepared'].includes(selected.state) &&
    selected.preparedBy !== user?._id && selected.targetIdentityId !== user?._id);

  const beginDecision = async () => {
    if (!selected || !canDecideSelected || decisionStepUp.busy || decisionStepUp.challenge) return;
    const body = { decision, expectedVersion: selected.version };
    await decisionStepUp.begin({
      method: 'POST',
      path: `/api/admin/staff-access-changes/${encodeURIComponent(selected.id)}/decision`,
      body,
      label: `${decision === 'approved' ? 'Approve' : 'Reject'} staff access change`,
      execute: (challengeId, exactBody) => staffAccessChangeService.decide(selected.id, exactBody, challengeId),
    });
  };

  const finishDecision = async (code: string) => {
    const result = await decisionStepUp.complete(code);
    if (!result.ok) return false;
    setSelected(result.value);
    await load(staffQuery);
    return true;
  };

  const updateDepartment = (department: StaffDepartment, checked: boolean) => {
    setRemoveAccess(false);
    setDepartments((current) => {
      if (department === 'internal_audit' && checked) return ['internal_audit'];
      if (department !== 'internal_audit' && checked) return [...current.filter((item) => item !== 'internal_audit'), department];
      return current.filter((item) => item !== department);
    });
  };

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Executive staff administration</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Staff access</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Assign or remove staff departments for existing RealtiQ accounts. Changes require an authenticator and approval by a different Executive. The server rechecks identity eligibility, authority, versions, and separation of duties.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load(staffQuery)} /> : null}
    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5">
      <h2 className="text-lg font-bold">Prepare a staff change</h2>
      <p className="mt-1 text-sm text-secondary">Only active accounts with verified email and phone are eligible. Your own account is excluded.</p>
      <form onSubmit={(event) => void beginPrepare(event)} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="staff-target-search">Find an existing account by name or email
          <input id="staff-target-search" value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 font-normal" placeholder="Search eligible accounts" />
        </label>
        <label className="block text-sm font-semibold" htmlFor="staff-target">Account to update
          <select id="staff-target" required value={targetIdentityId} onChange={(event) => setTargetIdentityId(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 font-normal">
            <option value="">Select an eligible account</option>
            {eligibleCandidates.map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name} · {candidate.email}</option>)}
          </select>
        </label>
        {!eligibleCandidates.length ? <p className="text-sm text-secondary">No eligible accounts match. The account directory only supplies existing identities; this workflow does not create accounts.</p> : null}
        <fieldset disabled={removeAccess || !assignableDepartments.length} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-bold">Departments allowed by your current Executive assignment</legend>
          {assignableDepartments.map((department) => <label key={department.id} className="flex items-start gap-2 rounded-lg border border-outline-variant/15 p-3 text-sm">
            <input type="checkbox" checked={departments.includes(department.id as StaffDepartment)} onChange={(event) => updateDepartment(department.id as StaffDepartment, event.target.checked)} />
            <span><strong>{department.label}</strong>{department.readOnly ? <span className="mt-0.5 block text-xs text-secondary">Read-only assignment; must be assigned by itself.</span> : null}</span>
          </label>)}
          {!assignableDepartments.length ? <p className="text-sm text-secondary">The server has not returned departments that this Executive may assign.</p> : null}
        </fieldset>
        <label className="flex items-start gap-2 rounded-lg border border-outline-variant/15 p-3 text-sm"><input type="checkbox" checked={removeAccess} onChange={(event) => { setRemoveAccess(event.target.checked); if (event.target.checked) setDepartments([]); }} /><span><strong>Remove staff access</strong><span className="mt-0.5 block text-xs text-secondary">Prepares an assignment with an empty departments array.</span></span></label>
        <Button type="submit" disabled={!canManageStaff || !targetIdentityId || prepareStepUp.busy || Boolean(prepareStepUp.challenge)}>Prepare with authenticator</Button>
        {prepareStepUp.error ? <p role="alert" className="text-sm text-error">{prepareStepUp.error}</p> : null}
      </form>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Current staff</h2><p className="mt-1 text-xs text-secondary">Server-issued assignments; approval revokes the target’s sessions.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load(staffQuery)}>Refresh</Button></div>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(staffQuery.trim()); }}><label className="sr-only" htmlFor="staff-directory-query">Search current staff</label><input id="staff-directory-query" value={staffQuery} onChange={(event) => setStaffQuery(event.target.value)} minLength={2} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-outline-variant/30 px-3 py-2 text-sm" placeholder="Search name or email" /><Button type="submit" variant="secondary" disabled={loading}>Search</Button></form>
        {loading && !staff.length ? <LoadingState label="Loading current staff…" /> : null}
        <ul className="mt-4 space-y-2">{staff.map((record) => <li key={record.identityId} className="rounded-lg border border-outline-variant/15 p-3"><p className="font-semibold">{record.name?.trim() || 'Name unavailable'} <span className="font-normal text-secondary">· {record.email?.trim() || 'Email unavailable'}</span></p><p className="mt-1 text-xs text-secondary">{record.departments === undefined ? 'Departments unavailable' : record.departments.join(', ') || 'No departments'} · {record.accountStatus || 'Status unavailable'} · email {record.emailVerified === true ? 'verified' : record.emailVerified === false ? 'unverified' : 'status unavailable'} · phone {record.phoneVerified === true ? 'verified' : record.phoneVerified === false ? 'unverified' : 'status unavailable'}</p></li>)}</ul>
        {!loading && !staff.length ? <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-secondary">No staff records match this search.</p> : null}
        {staffCursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loadingMore} loading={loadingMore} loadingLabel="Loading…" onClick={() => void load(staffQuery, staffCursor)}>Load more staff</Button> : null}
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Pending access changes</h2><p className="mt-1 text-xs text-secondary">Prepared changes require a different Executive to decide.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load(staffQuery)}>Refresh</Button></div>
        {loading && !items.length ? <LoadingState label="Loading pending access changes…" /> : null}
        <div className="mt-4 space-y-2">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><strong className="break-all">{item.targetIdentityId}</strong><span className="float-right text-xs uppercase">{item.state}</span><span className="mt-1 block text-xs text-secondary">{item.departments.length ? item.departments.join(', ') : 'Remove staff access'} · v{item.version}</span></button>)}{!loading && !items.length ? <p className="rounded border border-dashed p-4 text-sm text-secondary">No pending staff access changes.</p> : null}</div>
        <div className="mt-5 border-t border-outline-variant/10 pt-5">{selected ? <><h3 className="text-lg font-bold">Decision review</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-secondary">Change</dt><dd className="break-all font-semibold">{selected.id}</dd></div><div><dt className="text-secondary">Target account</dt><dd className="break-all font-semibold">{selected.targetIdentityId}</dd></div><div><dt className="text-secondary">Proposed departments</dt><dd className="font-semibold">{selected.departments.length ? selected.departments.join(', ') : 'Remove staff access'}</dd></div><div><dt className="text-secondary">Prepared by</dt><dd className="break-all font-semibold">{selected.preparedBy}</dd></div></dl>
          {['pending', 'prepared'].includes(selected.state) ? canDecideSelected ? <div className="mt-4 space-y-3"><label className="block text-sm font-semibold">Decision<select value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="mt-1 w-full rounded border p-2 font-normal"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label><Button type="button" disabled={decisionStepUp.busy || Boolean(decisionStepUp.challenge)} onClick={() => void beginDecision()}>Submit decision with authenticator</Button>{decisionStepUp.error ? <p role="alert" className="text-sm text-error">{decisionStepUp.error}</p> : null}</div> : <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This change cannot be decided by your current identity. The preparer and target cannot review it; the server enforces this independently.</p> : <p className="mt-3 text-sm">Final state: {selected.state}</p>}
        </> : <p className="text-sm text-secondary">Select a prepared change to review it.</p>}</div>
      </div>
    </section>
    <StepUpDialog challenge={prepareStepUp.challenge} busy={prepareStepUp.busy} error={prepareStepUp.error} onCancel={prepareStepUp.cancel} onSubmit={finishPrepare} />
    <StepUpDialog challenge={decisionStepUp.challenge} busy={decisionStepUp.busy} error={decisionStepUp.error} onCancel={decisionStepUp.cancel} onSubmit={finishDecision} />
  </main></AdminLayout>;
};

export default StaffAccessChanges;
