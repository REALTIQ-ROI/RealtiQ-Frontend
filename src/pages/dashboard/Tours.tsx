import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { tourService } from '../../services/tourService';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import type { Tour, TourStatus } from '../../types';

const statusClasses: Record<TourStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
};

const toLabel = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPropertyRef = (propertyId: Tour['propertyId']) => {
  if (!propertyId) return 'Property unavailable';
  if (typeof propertyId === 'string') return propertyId;
  return propertyId.title ?? propertyId._id ?? 'Property unavailable';
};

const Tours = () => {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const { data, loading, error, execute } = useAsync(() => tourService.getTours(), true);
  const tours = Array.isArray(data) ? data : [];
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [type, setType] = useState<'open_house' | 'virtual_paid' | 'staging_view'>('open_house');
  const [mode, setMode] = useState<'physical' | 'virtual'>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, TourStatus>>({});

  const handleRequestTour = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId.trim()) {
      toast.error('Property ID is required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await tourService.requestTour({
        propertyId: propertyId.trim(),
        type,
        mode,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      toast.success('Tour request submitted.');
      setNotes('');
      setScheduledAt('');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to request tour.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTourStatus = async (tour: Tour) => {
    const nextStatus = statusUpdates[tour._id];
    if (!nextStatus || nextStatus === tour.status) return;

    try {
      await tourService.updateTourStatus(tour._id, { status: nextStatus });
      toast.success('Tour status updated.');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update tour status.');
    }
  };

  return (
    <div className="bg-surface text-on-background antialiased min-h-screen">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">Curator</h1>
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase opacity-60">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer"><span className="material-symbols-outlined">dashboard</span><span>Overview</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/my-properties"><span className="material-symbols-outlined">domain</span><span>My Properties</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold text-sm" to="/dashboard/buyer/tours"><span className="material-symbols-outlined">tour</span><span>Tours</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/installments"><span className="material-symbols-outlined">schedule</span><span>Installments</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span><span>Payment History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span><span>Inquiry History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span><span>Settings</span></Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold">
            <span className="material-symbols-outlined">help</span>
            <span>Help Center</span>
          </button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20" placeholder="Search tours..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="text-slate-500 hover:text-slate-900 transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <button className="text-slate-500 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined">mail</span>
            </button>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="text-sm font-bold text-slate-900">{user?.name ?? 'Buyer'}</span>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Tours</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Tour Module</p>
            </div>
            <div className="h-1 w-24 bg-primary" />
            <p className="text-secondary text-sm mt-4">
              {user?.role === 'buyer'
                ? 'Request and track your property tours.'
                : 'Review, approve, and complete tour requests.'}
            </p>
          </header>

          {user?.role === 'buyer' ? (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 mb-8" onSubmit={(event) => void handleRequestTour(event)}>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Property ID</label>
                <input
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                  placeholder="Property ID"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Tour Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm">
                  <option value="open_house">Open House</option>
                  <option value="virtual_paid">Virtual Paid</option>
                  <option value="staging_view">Staging View</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm">
                  <option value="physical">Physical</option>
                  <option value="virtual">Virtual</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm resize-none"
                  placeholder="Need evening access, virtual walkthrough, etc."
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Request Tour'}
                </Button>
              </div>
            </form>
          ) : null}

          {loading ? <LoadingState label="Loading tours..." /> : null}
          {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}

          {!loading && !error ? (
            tours.length > 0 ? (
              <div className="space-y-4">
                {tours.map((tour) => (
                  <article key={tour._id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg">{tour._id}</h3>
                        <p className="text-sm text-secondary">
                          {toLabel(tour.type)} • {toLabel(tour.mode)}
                        </p>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[tour.status]}`}>
                        {tour.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-secondary">Property</p>
                        <p className="font-semibold">{formatPropertyRef(tour.propertyId)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-secondary">Scheduled</p>
                        <p className="font-semibold">{tour.scheduledAt ? new Date(tour.scheduledAt).toLocaleString() : 'Not scheduled'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-secondary">Price</p>
                        <p className="font-semibold">{tour.price ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(tour.price) : 'N/A'}</p>
                      </div>
                    </div>
                    {tour.notes ? <p className="text-sm text-secondary">{tour.notes}</p> : null}
                    {user?.role !== 'buyer' ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          className="bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                          value={statusUpdates[tour._id] ?? tour.status}
                          onChange={(e) =>
                            setStatusUpdates((current) => ({
                              ...current,
                              [tour._id]: e.target.value as TourStatus,
                            }))
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                        <Button type="button" variant="secondary" onClick={() => void updateTourStatus(tour)}>
                          Update Status
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
                <p className="text-secondary">No tours found.</p>
              </div>
            )
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Tours;
