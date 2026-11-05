import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { useAuth } from '../../../contexts/AuthContext';
import { canManageAdminStaff } from '../../../services/adminAccessService';
import { staffAccessChangeService, staffDepartments, type AdminStaffRecord, type StaffAccessChange, type StaffDepartment } from '../../../services/staffAccessChangeService';

const invitationStatus = (record?: AdminStaffRecord | null) => record?.invitation?.status?.replaceAll('_', ' ') || 'not reported';
const staffIdentityLabel = (identityId: string, records: AdminStaffRecord[], currentUser?: { _id: string; name?: string; email?: string } | null) => {
  const record = records.find((item) => item.identityId === identityId);
  const name = (identityId === currentUser?._id ? currentUser?.name?.trim() || record?.name : record?.name)?.trim();
  const email = (identityId === currentUser?._id ? currentUser?.email?.trim() || record?.email : record?.email)?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || 'Account details unavailable';
};
const formatInvitationExpiry = (record: AdminStaffRecord) => {
  const expiry = record.invitation?.expiresAt;
  return expiry && Number.isFinite(Date.parse(expiry)) ? new Date(expiry).toLocaleString() : null;
};

const StaffAccessChanges = () => {
  const { adminAccess, activeProfile, user } = useAuth();
  const [items, setItems] = useState<StaffAccessChange[]>([]);
  const [staff, setStaff] = useState<AdminStaffRecord[]>([]);
  const [staffCursor, setStaffCursor] = useState<string | null>(null);
  const [staffQuery, setStaffQuery] = useState('');
  const [targetIdentityId, setTargetIdentityId] = useState('');
  const [departments, setDepartments] = useState<StaffDepartment[]>([]);
  const [departmentSelectionError, setDepartmentSelectionError] = useState('');
  const [removeAccess, setRemoveAccess] = useState(false);
  const [selected, setSelected] = useState<StaffAccessChange | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createDepartments, setCreateDepartments] = useState<StaffDepartment[]>([]);
  const [createNotice, setCreateNotice] = useState('');
  const [invitationNotice, setInvitationNotice] = useState('');
  const [decisionNotice, setDecisionNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadVersion = useRef(0);
  const activeProfileIdRef = useRef(activeProfile?.id);
  activeProfileIdRef.current = activeProfile?.id;
  const createStepUp = useBoundStepUp<AdminStaffRecord>();
  const prepareStepUp = useBoundStepUp<StaffAccessChange>();
  const decisionStepUp = useBoundStepUp<StaffAccessChange>();
  const resendStepUp = useBoundStepUp<AdminStaffRecord>();
  const canManageStaff = canManageAdminStaff(adminAccess) && adminAccess?.profileId === activeProfile?.id;

  const load = useCallback(async (query = '', after?: string) => {
    const version = ++loadVersion.current;
    const requestProfileId = activeProfile?.id;
    if (after) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const [changes, staffPage] = await Promise.all([
        staffAccessChangeService.list(),
        staffAccessChangeService.listStaff({ q: query.trim() || undefined, limit: 25, ...(after ? { after } : {}), includeUnassigned: true }),
      ]);
      if (loadVersion.current !== version || activeProfileIdRef.current !== requestProfileId) return;
      setItems(changes);
      setStaff((current) => {
        if (!after) return staffPage.staff;
        const byId = new Map(current.map((record) => [record.identityId, record]));
        staffPage.staff.forEach((record) => byId.set(record.identityId, record));
        return [...byId.values()];
      });
      setStaffCursor(staffPage.nextCursor);
    } catch (raw) {
      if (loadVersion.current !== version || activeProfileIdRef.current !== requestProfileId) return;
      setError(raw instanceof Error ? raw.message : 'Unable to load staff administration data.');
      if (!after) {
        setItems([]);
        setStaff([]);
        setStaffCursor(null);
      }
    } finally {
      if (loadVersion.current === version && activeProfileIdRef.current === requestProfileId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    if (!canManageStaff) {
      loadVersion.current += 1;
      setItems([]);
      setStaff([]);
      setStaffCursor(null);
      setSelected(null);
      setTargetIdentityId('');
      setDepartments([]);
      setRemoveAccess(false);
      setDepartmentSelectionError('');
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    setItems([]);
    setStaff([]);
    setStaffCursor(null);
    setSelected(null);
    setTargetIdentityId('');
    setDepartments([]);
    setRemoveAccess(false);
    setDepartmentSelectionError('');
    void load();
    return () => { loadVersion.current += 1; };
  }, [canManageStaff, load]);

  const assignableDepartments = adminAccess?.assignableDepartments ?? [];
  const adminStaff = useMemo(() => staff.filter((record) => record.role === 'admin'), [staff]);
  const eligibleTargets = useMemo(() => adminStaff.filter((record) => record.identityId !== user?._id), [adminStaff, user?._id]);

  const selectTargetDepartments = (identityId: string) => {
    setDepartments([]);
    setDepartmentSelectionError('');
    if (!identityId) return;
    const target = eligibleTargets.find((record) => record.identityId === identityId);
    if (!target || target.departments === undefined) {
      setDepartmentSelectionError('The account’s current departments were not returned. Refresh the staff directory before preparing a change.');
      return;
    }
    const supportedDepartments = target.departments.filter((department): department is StaffDepartment =>
      staffDepartments.includes(department as StaffDepartment));
    const unavailableDepartments = supportedDepartments.filter((department) =>
      !assignableDepartments.some((choice) => choice.id === department));
    if (supportedDepartments.length !== target.departments.length || unavailableDepartments.length) {
      setDepartments(supportedDepartments.filter((department) =>
        assignableDepartments.some((choice) => choice.id === department)));
      setDepartmentSelectionError('Some existing department assignments are unavailable to your current Executive profile. No change can be prepared without preserving or explicitly managing those assignments.');
      return;
    }
    setDepartments(supportedDepartments);
  };

  const updateDepartments = (
    department: StaffDepartment,
    checked: boolean,
    setValue: (update: (previous: StaffDepartment[]) => StaffDepartment[]) => void,
  ) => {
    setValue((previous) => {
      if (department === 'internal_audit' && checked) return ['internal_audit'];
      if (department !== 'internal_audit' && checked) return [...previous.filter((item) => item !== 'internal_audit' && item !== department), department];
      return previous.filter((item) => item !== department);
    });
  };

  const beginCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageStaff || createStepUp.busy || createStepUp.challenge) return;
    const body = {
      name: createName.trim(),
      email: createEmail.trim().toLowerCase(),
      departments: [...createDepartments],
    };
    const allowed = new Set(assignableDepartments.map((department) => department.id));
    if (!body.name || !body.email || !body.departments.length || body.departments.some((department) => !allowed.has(department))) {
      setError('Enter the staff member’s name and email, then select one or more departments returned for your Executive profile.');
      return;
    }
    if (body.departments.includes('internal_audit') && body.departments.length !== 1) {
      setError('Internal Audit must be assigned by itself.');
      return;
    }
    setError('');
    setCreateNotice('');
    await createStepUp.begin({
      method: 'POST',
      path: '/api/admin/staff',
      body,
      label: 'Create Admin staff account and queue its invitation',
      execute: (challengeId, exactBody) => staffAccessChangeService.createStaff(exactBody, challengeId),
    });
  };

  const finishCreate = async (code: string) => {
    const result = await createStepUp.complete(code);
    if (!result.ok) return false;
    setCreateName('');
    setCreateEmail('');
    setCreateDepartments([]);
    setCreateNotice(`Admin account created. Invitation status returned by the server: ${invitationStatus(result.value)}. This status does not confirm email delivery.`);
    await load(staffQuery);
    return true;
  };

  const beginPrepare = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageStaff || prepareStepUp.busy || prepareStepUp.challenge) return;
    if (!targetIdentityId || !eligibleTargets.some((record) => record.identityId === targetIdentityId)) {
      setError('Select an existing Admin account from the current staff directory.');
      return;
    }
    if (departmentSelectionError) { setError(departmentSelectionError); return; }
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
    setDecisionNotice(result.value.state === 'approved'
      ? 'Department change approved. The target’s existing sessions were revoked; they must sign in again.'
      : `Department change state: ${result.value.state}.`);
    await load(staffQuery);
    return true;
  };

  const beginResend = async (record: AdminStaffRecord) => {
    if (!canManageStaff || record.firstLoginRequired !== true || resendStepUp.busy || resendStepUp.challenge) return;
    setInvitationNotice('');
    await resendStepUp.begin({
      method: 'POST',
      path: `/api/admin/staff/${encodeURIComponent(record.identityId)}/resend-invitation`,
      body: {},
      label: 'Queue a replacement Admin staff invitation',
      execute: (challengeId) => staffAccessChangeService.resendInvitation(record.identityId, challengeId),
    });
  };

  const finishResend = async (code: string) => {
    const result = await resendStepUp.complete(code);
    if (!result.ok) return false;
    setInvitationNotice(`Replacement invitation status returned by the server: ${invitationStatus(result.value)}. This status does not confirm email delivery.`);
    await load(staffQuery);
    return true;
  };

  const updateDepartment = (department: StaffDepartment, checked: boolean) => {
    setRemoveAccess(false);
    updateDepartments(department, checked, setDepartments);
  };
  const updateCreateDepartment = (department: StaffDepartment, checked: boolean) =>
    updateDepartments(department, checked, setCreateDepartments);

  if (!canManageStaff) return <AdminLayout><main className="mx-auto max-w-2xl p-6"><section className="rounded-2xl border border-outline-variant/20 bg-white p-6" role="status"><h1 className="text-2xl font-bold text-primary">Staff management unavailable</h1><p className="mt-3 text-sm text-secondary">The current server-issued access projection does not grant Executive staff-management authority. Internal Audit remains read-only.</p></section></main></AdminLayout>;

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Executive staff administration</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Staff access</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Create Admin staff accounts and manage department assignments. Sensitive actions require an authenticator. The backend enforces Executive authority, department rules and independent approval.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load(staffQuery)} /> : null}

    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5">
      <h2 className="text-lg font-bold">Create Admin staff</h2>
      <p className="mt-1 text-sm text-secondary">The server creates the account and queues an invitation email containing a temporary password. The password is never returned to this screen, and a queued invitation does not mean it was delivered.</p>
      <form onSubmit={(event) => void beginCreate(event)} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="new-staff-name">Full name<input id="new-staff-name" autoComplete="name" required value={createName} onChange={(event) => setCreateName(event.target.value)} disabled={createStepUp.busy || Boolean(createStepUp.challenge)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 font-normal disabled:opacity-60" /></label>
          <label className="block text-sm font-semibold" htmlFor="new-staff-email">Email address<input id="new-staff-email" autoComplete="email" required type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} disabled={createStepUp.busy || Boolean(createStepUp.challenge)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 font-normal disabled:opacity-60" /></label>
        </div>
        <fieldset disabled={!canManageStaff || createStepUp.busy || Boolean(createStepUp.challenge) || !assignableDepartments.length} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-bold">Departments available to your current Executive profile</legend>
          {assignableDepartments.map((department) => <label key={department.id} className="flex items-start gap-2 rounded-lg border border-outline-variant/15 p-3 text-sm">
            <input type="checkbox" checked={createDepartments.includes(department.id as StaffDepartment)} onChange={(event) => updateCreateDepartment(department.id as StaffDepartment, event.target.checked)} />
            <span><strong>{department.label}</strong>{department.readOnly ? <span className="mt-0.5 block text-xs text-secondary">Read-only assignment; must be assigned by itself.</span> : null}</span>
          </label>)}
          {!assignableDepartments.length ? <p className="text-sm text-secondary">The server has not returned departments that this Executive may assign.</p> : null}
        </fieldset>
        <Button type="submit" disabled={!canManageStaff || !createName.trim() || !createEmail.trim() || !createDepartments.length || createStepUp.busy || Boolean(createStepUp.challenge)}>Create with authenticator</Button>
        {createStepUp.error ? <p role="alert" className="text-sm text-error">{createStepUp.error}{createStepUp.errorCode === 'CONFLICT_IDENTITY_EMAIL' ? ' This account already exists; search for it in the Admin staff directory and use department management.' : ' Refresh the directory before trying again if the result is unclear.'}</p> : null}
        {createNotice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{createNotice}</p> : null}
      </form>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Admin staff directory</h2><p className="mt-1 text-xs text-secondary">Invitation status reflects the server’s email worker record; delivery is not inferred.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load(staffQuery)}>Refresh</Button></div>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setTargetIdentityId(''); void load(staffQuery.trim()); }}><label className="sr-only" htmlFor="staff-directory-query">Search Admin staff</label><input id="staff-directory-query" value={staffQuery} onChange={(event) => setStaffQuery(event.target.value)} minLength={2} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-outline-variant/30 px-3 py-2 text-sm" placeholder="Search name or email" /><Button type="submit" variant="secondary" disabled={loading}>Search</Button></form>
        {loading && !staff.length ? <LoadingState label="Loading Admin staff…" /> : null}
        {invitationNotice ? <p role="status" className="mt-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{invitationNotice}</p> : null}
        <ul className="mt-4 space-y-2">{adminStaff.map((record) => <li key={record.identityId} className="rounded-lg border border-outline-variant/15 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{record.name?.trim() || 'Name unavailable'} <span className="font-normal text-secondary">· {record.email?.trim() || 'Email unavailable'}</span></p><p className="mt-1 text-xs text-secondary">{record.departments === undefined ? 'Departments unavailable' : record.departments.join(', ') || 'No departments'} · {record.accountStatus || 'Status unavailable'} · email {record.emailVerified === true ? 'verified' : record.emailVerified === false ? 'unverified' : 'status unavailable'} · phone {record.phoneVerified === true ? 'verified' : record.phoneVerified === false ? 'unverified' : 'status unavailable'}</p><p className="mt-1 text-xs text-secondary">Invitation: {invitationStatus(record)}{formatInvitationExpiry(record) ? ` · expires ${formatInvitationExpiry(record)}` : ''}{record.invitation?.errorCode ? ` · ${record.invitation.errorCode}` : ''}</p>{record.firstLoginRequired ? <p className="mt-1 text-xs font-semibold text-amber-800">First login setup is still required.</p> : null}</div>
          {record.firstLoginRequired === true ? <Button type="button" variant="secondary" disabled={!canManageStaff || resendStepUp.busy || Boolean(resendStepUp.challenge)} onClick={() => void beginResend(record)}>Resend invitation with authenticator</Button> : null}</div></li>)}</ul>
        {!loading && !adminStaff.length ? <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-secondary">No Admin staff records match this search.</p> : null}
        {staffCursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loadingMore} loading={loadingMore} loadingLabel="Loading…" onClick={() => void load(staffQuery, staffCursor)}>Load more staff</Button> : null}
        {resendStepUp.error ? <p role="alert" className="mt-3 text-sm text-error">{resendStepUp.error} Refresh the directory before retrying if the request outcome is unclear.</p> : null}
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Prepare a department change</h2><p className="mt-1 text-xs text-secondary">Choose only an existing Admin account. A prepared change requires a different Executive to decide.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load(staffQuery)}>Refresh</Button></div>
        <form onSubmit={(event) => void beginPrepare(event)} className="mt-4 space-y-4">
          <label className="block text-sm font-semibold" htmlFor="staff-target">Admin account to update
            <select id="staff-target" required value={targetIdentityId} disabled={prepareStepUp.busy || Boolean(prepareStepUp.challenge)} onChange={(event) => { const identityId = event.target.value; setTargetIdentityId(identityId); setRemoveAccess(false); selectTargetDepartments(identityId); }} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-2 font-normal disabled:opacity-60">
              <option value="">Select an Admin account</option>
              {eligibleTargets.map((record) => <option key={record.identityId} value={record.identityId}>{record.name?.trim() || 'Name unavailable'} · {record.email?.trim() || record.identityId}</option>)}
            </select>
          </label>
          {!eligibleTargets.length ? <p className="text-sm text-secondary">No other Admin accounts are available in the loaded directory. Search or load more staff above.</p> : null}
          <p className="text-xs text-secondary">The selected account’s current departments are preselected. Review them before submitting the replacement assignment.</p>
          {departmentSelectionError ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{departmentSelectionError}</p> : null}
          <fieldset disabled={removeAccess || Boolean(departmentSelectionError) || !assignableDepartments.length || prepareStepUp.busy || Boolean(prepareStepUp.challenge)} className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold">Departments allowed by your current Executive assignment</legend>
            {assignableDepartments.map((department) => <label key={department.id} className="flex items-start gap-2 rounded-lg border border-outline-variant/15 p-3 text-sm">
              <input type="checkbox" checked={departments.includes(department.id as StaffDepartment)} onChange={(event) => updateDepartment(department.id as StaffDepartment, event.target.checked)} />
              <span><strong>{department.label}</strong>{department.readOnly ? <span className="mt-0.5 block text-xs text-secondary">Read-only assignment; must be assigned by itself.</span> : null}</span>
            </label>)}
          </fieldset>
          <label className="flex items-start gap-2 rounded-lg border border-outline-variant/15 p-3 text-sm"><input type="checkbox" disabled={!targetIdentityId || Boolean(departmentSelectionError) || prepareStepUp.busy || Boolean(prepareStepUp.challenge)} checked={removeAccess} onChange={(event) => { const removing = event.target.checked; setRemoveAccess(removing); if (removing) setDepartments([]); else selectTargetDepartments(targetIdentityId); }} /><span><strong>Remove staff access</strong><span className="mt-0.5 block text-xs text-secondary">Prepares an assignment with an empty departments array; the account remains an Admin.</span></span></label>
          <Button type="submit" disabled={!canManageStaff || !targetIdentityId || Boolean(departmentSelectionError) || prepareStepUp.busy || Boolean(prepareStepUp.challenge)}>Prepare with authenticator</Button>
          {prepareStepUp.error ? <p role="alert" className="text-sm text-error">{prepareStepUp.error}{prepareStepUp.errorCode?.startsWith('CONFLICT_STAFF_') ? ' Refresh the staff directory and review the current record before preparing another change.' : ''}</p> : null}
        </form>
      </div>
    </section>

    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Pending department changes</h2><p className="mt-1 text-xs text-secondary">The preparer and target cannot review their own change. The backend enforces the independent-Executive rule. If an account name is unavailable, load more staff in the directory above.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load(staffQuery)}>Refresh</Button></div>
      {decisionNotice ? <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{decisionNotice}</p> : null}
      {loading && !items.length ? <LoadingState label="Loading pending department changes…" /> : null}
      <div className="mt-4 grid gap-5 xl:grid-cols-2"><div className="space-y-2">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><strong>{staffIdentityLabel(item.targetIdentityId, staff, user)}</strong><span className="float-right text-xs uppercase">{item.state}</span><span className="mt-1 block text-xs text-secondary">{item.departments.length ? item.departments.join(', ') : 'Remove staff access'} · v{item.version}</span></button>)}{!loading && !items.length ? <p className="rounded border border-dashed p-4 text-sm text-secondary">No pending staff access changes.</p> : null}</div>
        <div className="border-t border-outline-variant/10 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">{selected ? <><h3 className="text-lg font-bold">Decision review</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-secondary">Target account</dt><dd className="font-semibold">{staffIdentityLabel(selected.targetIdentityId, staff, user)}</dd></div><div><dt className="text-secondary">Proposed departments</dt><dd className="font-semibold">{selected.departments.length ? selected.departments.join(', ') : 'Remove staff access'}</dd></div><div><dt className="text-secondary">Prepared by</dt><dd className="font-semibold">{staffIdentityLabel(selected.preparedBy, staff, user)}</dd></div></dl>
          {['pending', 'prepared'].includes(selected.state) ? canDecideSelected ? <div className="mt-4 space-y-3"><label className="block text-sm font-semibold">Decision<select disabled={decisionStepUp.busy || Boolean(decisionStepUp.challenge)} value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="mt-1 w-full rounded border p-2 font-normal disabled:opacity-60"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label><Button type="button" disabled={decisionStepUp.busy || Boolean(decisionStepUp.challenge)} onClick={() => void beginDecision()}>Submit decision with authenticator</Button>{decisionStepUp.error ? <p role="alert" className="text-sm text-error">{decisionStepUp.error}{decisionStepUp.errorCode?.startsWith('CONFLICT_STAFF_') ? ' Refresh the queue and review the latest change version before deciding.' : ''}</p> : null}</div> : <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This change cannot be decided by your current identity. The preparer and target cannot review it; the server enforces this independently.</p> : <p className="mt-3 text-sm">Final state: {selected.state}</p>}
        </> : <p className="text-sm text-secondary">Select a prepared change to review it.</p>}</div>
      </div>
    </section>
    <StepUpDialog challenge={createStepUp.challenge} busy={createStepUp.busy} error={createStepUp.error} onCancel={createStepUp.cancel} onSubmit={finishCreate} />
    <StepUpDialog challenge={prepareStepUp.challenge} busy={prepareStepUp.busy} error={prepareStepUp.error} onCancel={prepareStepUp.cancel} onSubmit={finishPrepare} />
    <StepUpDialog challenge={decisionStepUp.challenge} busy={decisionStepUp.busy} error={decisionStepUp.error} onCancel={decisionStepUp.cancel} onSubmit={finishDecision} />
    <StepUpDialog challenge={resendStepUp.challenge} busy={resendStepUp.busy} error={resendStepUp.error} onCancel={resendStepUp.cancel} onSubmit={finishResend} />
  </main></AdminLayout>;
};

export default StaffAccessChanges;
