import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { propertyService } from '../../services/propertyService';
import { projectService } from '../../services/projectService';
import { tourService, type TourCalendarScope, type TourCalendarUpdate, type ViewingAssignee } from '../../services/tourService';
import type { LiveVideoReadiness, ProjectCard, Property, TourCalendarDto, TourCalendarScopeKind } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import LoadingState from '../ui/LoadingState';

type SlotDraft = { slotId?: string; startsAt: string; endsAt: string; assignedToIdentityId?: string | null };
const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const toIso = (value: string) => new Date(value).toISOString();
const resourceName = (item: { title?: string; name?: string; publicReference?: string | null }, index: number) => item.title || item.name || item.publicReference || `Property ${index + 1}`;

const SellerViewingCalendar = () => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const [scopeKind, setScopeKind] = useState<TourCalendarScopeKind>('profile');
  const [projectId, setProjectId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [unitTypes, setUnitTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [calendar, setCalendar] = useState<TourCalendarDto | null>(null);
  const [liveVideoReadiness, setLiveVideoReadiness] = useState<LiveVideoReadiness | null>(null);
  const [assignees, setAssignees] = useState<ViewingAssignee[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [assigneeError, setAssigneeError] = useState('');
  const [inheritedCalendar, setInheritedCalendar] = useState<TourCalendarDto | null>(null);
  const [inheritedFrom, setInheritedFrom] = useState<TourCalendarScopeKind | null>(null);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [liveGuidedEnabled, setLiveGuidedEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const loadGeneration = useRef(0);
  const canAssign = Array.isArray(activeProfile?.permissions) && activeProfile.permissions.includes('viewing.manage');

  const loadAssignees = useCallback(async () => {
    if (!profileId || !canAssign) { setAssignees([]); setAssigneeError(''); setAssigneeLoading(false); return; }
    const requestedProfile = profileId;
    setAssigneeLoading(true); setAssigneeError('');
    try {
      const all: ViewingAssignee[] = [];
      let after: string | undefined;
      do {
        const page = await tourService.listViewingAssignees({ limit: 100, ...(after ? { after } : {}) });
        all.push(...page.assignees.filter((entry) => entry.assignmentEligible));
        after = page.nextCursor ?? undefined;
      } while (after);
      if (activeProfile?.id === requestedProfile) setAssignees(all);
    } catch (raw) {
      if (activeProfile?.id === requestedProfile) { setAssignees([]); setAssigneeError(raw instanceof Error ? raw.message : 'Eligible team members could not be loaded.'); }
    } finally { if (activeProfile?.id === requestedProfile) setAssigneeLoading(false); }
  }, [activeProfile?.id, canAssign, profileId]);

  const scope = useMemo<TourCalendarScope | null>(() => {
    if (scopeKind === 'profile') return { scopeKind };
    if (scopeKind === 'project' || scopeKind === 'property') return resourceId ? { scopeKind, resourceId } : null;
    return projectId && resourceId ? { scopeKind, resourceId, projectId } : null;
  }, [projectId, resourceId, scopeKind]);

  useEffect(() => {
    let current = true;
    setProjects([]); setProperties([]); setUnitTypes([]); setProjectId(''); setResourceId('');
    setCalendar(null); setInheritedCalendar(null); setInheritedFrom(null); setSlots([]); setLiveGuidedEnabled(false); setConflict(false); setError(null);
    if (!profileId) { setOptionsLoading(false); return () => { current = false; }; }
    setOptionsLoading(true);
    void Promise.allSettled([projectService.listMyProjects({ page: 1, limit: 100 }), propertyService.getMyProperties(1, 100)])
      .then(([projectResult, propertyResult]) => {
        if (!current) return;
        if (projectResult.status === 'fulfilled') setProjects(projectResult.value.projects);
        if (propertyResult.status === 'fulfilled') setProperties(propertyResult.value.properties);
      }).finally(() => { if (current) setOptionsLoading(false); });
    return () => { current = false; };
  }, [profileId]);

  useEffect(() => {
    let current = true;
    if (scopeKind !== 'unit_type' || !projectId) { setUnitTypes([]); return () => { current = false; }; }
    setOptionsLoading(true);
    void projectService.listUnitTypes(projectId).then((response) => {
      if (!current) return;
      setUnitTypes(response.unitTypes.map((item, index) => ({ id: item.id, name: String(item.effectiveFields.unitTypeName ?? item.canonicalFields.unitTypeName ?? `Unit type ${index + 1}`) })));
    }).catch(() => { if (current) setUnitTypes([]); }).finally(() => { if (current) setOptionsLoading(false); });
    return () => { current = false; };
  }, [projectId, scopeKind]);

  const load = useCallback(async () => {
    if (!scope || !profileId) { setLoading(false); return; }
    const generation = ++loadGeneration.current;
    setLoading(true); setError(null); setConflict(false);
    try {
      const response = await tourService.getCalendar(scope);
      if (generation !== loadGeneration.current || activeProfile?.id !== profileId) return;
      setCalendar(response.calendar);
      setLiveVideoReadiness(response.liveVideoReadiness ?? null);
      setInheritedCalendar(response.inheritedCalendar);
      setInheritedFrom(response.inheritedFrom);
      const effective = response.calendar ?? response.inheritedCalendar;
      setSlots((effective?.slots ?? []).map((slot) => ({ slotId: slot.slotId, startsAt: toLocalDateTime(slot.startsAt), endsAt: toLocalDateTime(slot.endsAt), ...(slot.assignedToIdentityId ? { assignedToIdentityId: slot.assignedToIdentityId } : {}) })));
      setLiveGuidedEnabled(effective?.liveGuidedEnabled ?? false);
    } catch (raw) {
      if (generation === loadGeneration.current && activeProfile?.id === profileId) setError(raw instanceof Error ? raw.message : 'Viewing availability could not be loaded.');
    } finally { if (generation === loadGeneration.current) setLoading(false); }
  }, [activeProfile?.id, profileId, scope]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setAssignees([]); setAssigneeError(''); void loadAssignees(); }, [loadAssignees, profileId]);

  const save = async () => {
    if (!scope || loading || saving || slots.length > 100) return;
    if (slots.some((slot) => !slot.startsAt || !slot.endsAt || new Date(slot.endsAt).getTime() <= new Date(slot.startsAt).getTime())) {
      setError('Each slot needs a valid end time after its start time.'); return;
    }
    const orderedSlots = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    if (orderedSlots.some((slot, index) => index > 0 && new Date(slot.startsAt).getTime() < new Date(orderedSlots[index - 1].endsAt).getTime())) {
      setError('Slots in one calendar cannot overlap. Adjust the times before saving.'); return;
    }
    const body: TourCalendarUpdate = {
      ...scope,
      expectedVersion: calendar?.version ?? 0,
      liveGuidedEnabled,
      slots: slots.map((slot) => ({ ...(slot.slotId ? { slotId: slot.slotId } : {}), startsAt: toIso(slot.startsAt), endsAt: toIso(slot.endsAt), assignedToIdentityId: slot.assignedToIdentityId ?? null })),
    };
    setSaving(true); setError(null);
    try { await tourService.saveCalendar(body); toast.success('Viewing calendar saved.'); await load(); }
    catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_VIEWING_ASSIGNMENT_REVOKED') { await Promise.all([loadAssignees(), load()]); setConflict(true); setError('A team member is no longer eligible for this assignment. The team list and calendar were refreshed; choose an eligible member or clear the assignment before saving.'); }
      else if (raw instanceof ApiRequestError && raw.status === 409) { await load(); setConflict(true); setError('The calendar changed or a slot is booked. The latest server calendar is loaded; review it before saving again.'); }
      else setError(raw instanceof Error ? raw.message : 'Viewing calendar could not be saved.');
    } finally { setSaving(false); }
  };

  const removeOverride = async () => {
    if (!calendar || !scope || scopeKind === 'profile' || loading || saving) return;
    setSaving(true); setError(null);
    try {
      await tourService.removeCalendarOverride({ scopeKind, resourceId, ...(scopeKind === 'unit_type' ? { projectId } : {}), expectedVersion: calendar.version });
      toast.success('The override was removed. Inherited availability is restored.'); await load();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) { await load(); setConflict(true); setError('This override changed or has a booked slot. Review the latest calendar before trying again.'); }
      else setError(raw instanceof Error ? raw.message : 'The override could not be removed.');
    } finally { setSaving(false); }
  };

  const selectScope = (value: TourCalendarScopeKind) => { setScopeKind(value); setProjectId(''); setResourceId(''); setCalendar(null); setInheritedCalendar(null); setLiveVideoReadiness(null); setSlots([]); setLiveGuidedEnabled(false); setError(null); setLoading(true); };

  return <Card className="space-y-4 p-5">
    <div><h2 className="text-xl font-black">Viewing availability</h2><p className="mt-1 text-sm text-secondary">Manage profile hours and more-specific project, unit-type or property overrides. Availability applies only after the backend confirms each save.</p><p className="mt-2 text-xs text-secondary">Selected seller profile: <strong>{activeProfile?.name ?? 'Not selected'}</strong></p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Calendar scope<select aria-label="Calendar scope" className="mt-1 block w-full rounded-lg border px-3 py-2" value={scopeKind} onChange={(event) => selectScope(event.target.value as TourCalendarScopeKind)}><option value="profile">My profile</option><option value="project">Project override</option><option value="unit_type">Unit type override</option><option value="property">Property override</option></select></label>
      {scopeKind === 'project' || scopeKind === 'unit_type' ? <label className="text-sm font-semibold">Project<select aria-label="Calendar project" className="mt-1 block w-full rounded-lg border px-3 py-2" value={projectId} onChange={(event) => { setProjectId(event.target.value); setResourceId(''); setCalendar(null); setInheritedCalendar(null); setSlots([]); setLiveGuidedEnabled(false); setLoading(true); }}><option value="">Choose a project</option>{projects.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label> : null}
      {scopeKind === 'property' ? <label className="text-sm font-semibold">Property<select aria-label="Calendar property" className="mt-1 block w-full rounded-lg border px-3 py-2" value={resourceId} onChange={(event) => { setResourceId(event.target.value); setCalendar(null); setInheritedCalendar(null); setSlots([]); setLiveGuidedEnabled(false); setLoading(true); }}><option value="">Choose a property</option>{properties.map((item, index) => <option key={item._id} value={item._id}>{resourceName({ title: item.title, publicReference: item.publicReference }, index)}</option>)}</select></label> : null}
      {scopeKind === 'project' && projectId ? <input aria-label="Project resource" type="hidden" value={projectId} /> : null}
      {scopeKind === 'unit_type' && projectId ? <label className="text-sm font-semibold">Unit type<select aria-label="Calendar unit type" className="mt-1 block w-full rounded-lg border px-3 py-2" value={resourceId} onChange={(event) => { setResourceId(event.target.value); setCalendar(null); setInheritedCalendar(null); setSlots([]); setLiveGuidedEnabled(false); setLoading(true); }}><option value="">Choose a unit type</option>{unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    </div>
    {optionsLoading ? <p role="status" className="text-sm text-secondary">Loading project and property choices…</p> : null}
    {!scope && !optionsLoading && scopeKind !== 'profile' ? <p role="status" className="rounded bg-surface-container-low p-3 text-sm">Choose the resource for this override. No resource IDs are entered manually.</p> : null}
    {scope ? loading ? <LoadingState label="Loading current and inherited viewing slots…" /> : error && !conflict ? <ErrorState message={error} onRetry={() => void load()} /> : <>
      {error ? <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-950">{error}</p> : null}
      {liveVideoReadiness ? <p role="status" className={`rounded p-3 text-sm ${liveVideoReadiness.state === 'ready' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>Live video: {liveVideoReadiness.state.replaceAll('_', ' ')}{liveVideoReadiness.reasonCode ? ` · ${liveVideoReadiness.reasonCode.replaceAll('_', ' ')}` : ''}. Video sessions depend on current provider and scheduler readiness.</p> : null}
      <p role="status" className="text-sm text-secondary">{calendar ? `This scope has its own calendar, version ${calendar.version}.` : inheritedCalendar ? `No override is saved. Current availability is inherited from ${inheritedFrom ?? 'a parent scope'}. Saving creates an override.` : 'No calendar is configured for this scope yet.'}</p>
      <label className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-sm"><input type="checkbox" checked={liveGuidedEnabled} onChange={(event) => setLiveGuidedEnabled(event.target.checked)} /><span><strong>Offer live guided video tours</strong><span className="mt-1 block text-xs text-secondary">This records your choice. Booking remains unavailable if the backend reports that Zoom is not configured.</span></span></label>
      <div className="space-y-3">{slots.map((slot, index) => { const currentAssignmentAvailable = assignees.some((person) => person.identityId === slot.assignedToIdentityId); return <div key={slot.slotId ?? `new-${index}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="text-xs font-semibold">Starts at<input aria-label={`Viewing slot ${index + 1} start`} type="datetime-local" value={slot.startsAt} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startsAt: event.target.value } : item))} className="mt-1 block w-full rounded border px-2 py-2" /></label><label className="text-xs font-semibold">Ends at<input aria-label={`Viewing slot ${index + 1} end`} type="datetime-local" value={slot.endsAt} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endsAt: event.target.value } : item))} className="mt-1 block w-full rounded border px-2 py-2" /></label><label className="text-xs font-semibold">Assigned team member<select aria-label={`Viewing slot ${index + 1} team member`} className="mt-1 block w-full rounded border px-2 py-2" value={currentAssignmentAvailable ? slot.assignedToIdentityId ?? '' : slot.assignedToIdentityId ? '__unavailable__' : ''} disabled={!canAssign || assigneeLoading} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assignedToIdentityId: event.target.value || null } : item))}><option value="">Unassigned</option>{slot.assignedToIdentityId && !currentAssignmentAvailable ? <option value="__unavailable__" disabled>Previously assigned member unavailable</option> : null}{assignees.map((person) => <option key={person.identityId} value={person.identityId}>{person.displayName} · {person.role.replaceAll('_', ' ')}</option>)}</select></label><Button type="button" variant="secondary" disabled={saving} onClick={() => setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></div>; })}</div>
      {assigneeLoading ? <p role="status" className="text-xs text-secondary">Loading eligible team members…</p> : null}{assigneeError ? <p role="alert" className="text-xs text-error">Team-member choices are unavailable: {assigneeError}</p> : null}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={loading || slots.length >= 100 || saving} onClick={() => setSlots((current) => [...current, { startsAt: '', endsAt: '' }])}>Add a time slot</Button><Button type="button" disabled={loading || saving || !profileId || Boolean(conflict)} onClick={() => void save()}>{saving ? 'Saving…' : 'Save calendar'}</Button>{calendar && scopeKind !== 'profile' ? <Button type="button" variant="secondary" disabled={loading || saving} onClick={() => void removeOverride()}>Remove override</Button> : null}</div>
      {conflict ? <Button type="button" variant="secondary" onClick={() => void load()}>Refresh current calendar</Button> : null}
    </> : null}
  </Card>;
};

export default SellerViewingCalendar;
