import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PortalShell from '../../components/phase2/PortalShell';
import { useRealtime } from '../../contexts/RealtimeContext';
import { notificationService } from '../../services/notificationService';
import type { NotificationCategory, NotificationPreferenceValues, PreferenceKey, RealtiqNotification } from '../../types';
import { isDisplayableNotification } from '../../utils/notificationVisibility';

const editable: Array<{ key: PreferenceKey; label: string; description: string; icon: string }> = [
  { key: 'messages', label: 'Messages', description: 'New conversations, replies and status changes', icon: 'forum' },
  { key: 'savedSearches', label: 'Saved searches', description: 'New listings matching your saved criteria', icon: 'manage_search' },
  { key: 'listingChanges', label: 'Listing changes', description: 'Price, availability and property updates', icon: 'home_work' },
  { key: 'inquiries', label: 'Inquiries', description: 'Updates about property inquiries', icon: 'contact_support' },
  { key: 'marketplace', label: 'Marketplace', description: 'Important marketplace activity', icon: 'storefront' },
];
const categoryMeta: Record<NotificationCategory, { label: string; icon: string; tone: string }> = {
  messages: { label: 'Messages', icon: 'forum', tone: 'bg-blue-50 text-blue-700' },
  saved_searches: { label: 'Saved search', icon: 'manage_search', tone: 'bg-violet-50 text-violet-700' },
  listing_changes: { label: 'Listing update', icon: 'home_work', tone: 'bg-amber-50 text-amber-700' },
  inquiries: { label: 'Inquiry', icon: 'contact_support', tone: 'bg-cyan-50 text-cyan-700' },
  marketplace: { label: 'Marketplace', icon: 'storefront', tone: 'bg-emerald-50 text-emerald-700' },
  security: { label: 'Security', icon: 'shield', tone: 'bg-red-50 text-red-700' },
  payments: { label: 'Payment', icon: 'payments', tone: 'bg-teal-50 text-teal-700' },
  legal: { label: 'Legal', icon: 'gavel', tone: 'bg-slate-100 text-slate-700' },
};
const safeRoute = (notification: RealtiqNotification) => {
  const route = notification.navigation?.route;
  if (route?.startsWith('/messages/') || route?.startsWith('/dashboard/') || route === '/properties') return route;
  const reference = notification.navigation?.publicReference;
  return reference?.startsWith('RTQ-PROP-') ? `/properties/${reference}` : null;
};

export default function Notifications() {
  const realtime = useRealtime();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPreferenceValues | null>(null);
  const [mandatory, setMandatory] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void notificationService.getPreferences().then(
      (data) => { setPrefs(data.preferences.categories); setMandatory(data.mandatoryCategories); },
      (nextError: Error) => setError(nextError.message),
    );
  }, []);
  const visibleNotifications = useMemo(
    () => realtime.notifications.filter(isDisplayableNotification).filter((item) => filter === 'all' || !item.readAt),
    [realtime.notifications, filter],
  );
  const markAllRead = async () => {
    try { await notificationService.readAll(); await realtime.refreshNotifications(); toast.success('All notifications marked as read.'); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to mark notifications as read.'); }
  };
  const openNotification = async (item: RealtiqNotification) => {
    const route = safeRoute(item);
    try { if (!item.readAt) await notificationService.markRead(item._id); await realtime.refreshNotifications(); if (route) navigate(route); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to open notification.'); }
  };

  return <PortalShell>
    <main className='mx-auto max-w-6xl p-4 md:p-8'>
      <header className='mb-7 overflow-hidden rounded-2xl bg-primary px-5 py-6 text-white shadow-[0_18px_45px_rgba(23,61,50,0.2)] sm:px-7'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
          <div><p className='mb-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200'>Activity centre</p><h1 className='text-3xl font-black tracking-tight'>Notifications</h1><p className='mt-1 max-w-xl text-sm text-emerald-50/80'>Updates about messages, properties, inquiries, payments and account activity.</p></div>
          <div className='flex items-center gap-3'><div className='rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/15'><span className='block text-2xl font-black'>{realtime.notificationUnread}</span><span className='text-[11px] font-bold uppercase tracking-wider text-emerald-100'>Unread</span></div><button className='h-11 rounded-xl bg-white px-4 text-sm font-bold text-primary shadow-sm transition hover:bg-emerald-50 disabled:opacity-50' disabled={!realtime.notificationUnread} onClick={() => void markAllRead()}>Mark all read</button></div>
        </div>
      </header>

      {error && <div role='alert' className='mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'><span className='material-symbols-outlined text-lg'>error</span><span className='flex-1'>{error}</span><button aria-label='Dismiss error' onClick={() => setError('')}>×</button></div>}

      <div className='grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <section aria-labelledby='notification-list-title'>
          <div className='mb-4 flex items-end justify-between gap-3'><div><h2 id='notification-list-title' className='text-xl font-black text-slate-950'>Recent activity</h2><p className='text-sm text-slate-500'>Your latest account updates</p></div><div className='inline-flex rounded-xl bg-slate-100 p-1' aria-label='Notification filters'>{(['all','unread'] as const).map((value) => <button key={value} className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div></div>
          <div className='space-y-3' aria-label='Notification centre'>
            {visibleNotifications.length === 0 ? <div className='grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center'><div><span className='material-symbols-outlined mb-3 text-5xl text-slate-300'>{filter === 'unread' ? 'done_all' : 'notifications_none'}</span><h3 className='font-bold text-slate-800'>{filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}</h3><p className='mt-1 text-sm text-slate-500'>{realtime.notificationUnread ? 'Refresh the page to retrieve your latest activity.' : filter === 'unread' ? 'There are no unread notifications.' : 'New account activity will appear here.'}</p></div></div> : visibleNotifications.map((item) => {
              const meta = categoryMeta[item.category];
              const route = safeRoute(item);
              return <article key={item._id} className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.readAt ? 'border-slate-200' : 'border-emerald-200'}`}>
                {!item.readAt && <span className='absolute left-0 top-0 h-full w-1 bg-emerald-600' />}
                <div className='flex gap-4'><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${meta.tone}`}><span className='material-symbols-outlined' aria-hidden='true'>{meta.icon}</span></span><button className='min-w-0 flex-1 text-left' onClick={() => void openNotification(item)}><span className='flex flex-wrap items-center gap-2'><span className='font-extrabold text-slate-950'>{item.title}</span>{!item.readAt && <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700'>New</span>}</span><span className='mt-1 block text-sm leading-6 text-slate-600'>{item.body}</span><span className='mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400'><span className='font-semibold text-slate-500'>{meta.label}</span><span>·</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{route && <><span>·</span><span className='font-bold text-primary'>View details</span></>}</span></button><button className='grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100' aria-label={`Archive ${item.title}`} onClick={() => void notificationService.archive(item._id).then(realtime.refreshNotifications)}><span className='material-symbols-outlined text-xl'>archive</span></button></div>
              </article>;
            })}
          </div>
        </section>

        <aside className='h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6'>
          <div className='mb-5'><span className='grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700'><span className='material-symbols-outlined'>tune</span></span><h2 className='mt-3 text-xl font-black text-slate-950'>Delivery preferences</h2><p className='mt-1 text-sm leading-6 text-slate-500'>Choose where optional updates reach you.</p></div>
          {prefs ? <form onSubmit={(event) => { event.preventDefault(); setSaving(true); void notificationService.updatePreferences(prefs).then((data) => { setPrefs(data.preferences.categories); setMandatory(data.mandatoryCategories); toast.success('Preferences saved.'); }, (nextError: Error) => setError(nextError.message)).finally(() => setSaving(false)); }}>
            <div className='divide-y divide-slate-100'>{editable.map(({ key, label, description, icon }) => <fieldset key={key} className='py-4 first:pt-0'><legend className='flex items-center gap-2 font-bold text-slate-800'><span className='material-symbols-outlined text-lg text-slate-500'>{icon}</span>{label}</legend><p className='mb-3 mt-1 text-xs leading-5 text-slate-500'>{description}</p><div className='flex gap-4'>{(['inApp','email'] as const).map((channel) => <label key={channel} className='flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600'><input className='h-4 w-4 accent-emerald-700' aria-label={`${label} ${channel}`} type='checkbox' checked={prefs[key][channel]} onChange={(event) => setPrefs({ ...prefs, [key]: { ...prefs[key], [channel]: event.target.checked } })} />{channel === 'inApp' ? 'In app' : 'Email'}</label>)}</div></fieldset>)}</div>
            <button className='mt-2 h-11 w-full rounded-xl bg-primary font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50' disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
          </form> : <div className='space-y-3'>{[1,2,3].map((item) => <div key={item} className='h-20 animate-pulse rounded-xl bg-slate-100' />)}</div>}
          <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3'><div className='flex gap-2'><span className='material-symbols-outlined text-lg text-amber-700'>verified_user</span><div><p className='text-sm font-bold text-amber-900'>Always delivered</p><p className='mt-1 text-xs leading-5 text-amber-800'>Security, payment and legal notices cannot be disabled.</p>{mandatory.length > 0 && <p className='mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700'>{mandatory.join(' · ')}</p>}</div></div></div>
        </aside>
      </div>
    </main>
  </PortalShell>;
}
