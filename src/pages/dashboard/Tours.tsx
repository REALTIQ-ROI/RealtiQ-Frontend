import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { tourService } from '../../services/tourService';
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

const Tours = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const { data, loading, error, execute } = useAsync(() => tourService.getTours(), true);
  const tours = data ?? [];
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [type, setType] = useState<'open_house' | 'virtual_paid' | 'staging_view'>('open_house');
  const [mode, setMode] = useState<'physical' | 'virtual'>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, TourStatus>>({});

  const visibleTours = tours;

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
    <DashboardLayout>
      <section className="space-y-8">
        <header className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Tour Module</span>
          <h1 className="text-3xl font-extrabold tracking-tighter">Tours</h1>
          <p className="text-secondary text-sm">
            {user?.role === 'buyer'
              ? 'Request and track your property tours.'
              : 'Review, approve, and complete tour requests.'}
          </p>
        </header>

        {user?.role === 'buyer' ? (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10" onSubmit={(event) => void handleRequestTour(event)}>
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
          visibleTours.length > 0 ? (
            <div className="space-y-4">
              {visibleTours.map((tour) => (
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
                      <p className="font-semibold">{typeof tour.propertyId === 'string' ? tour.propertyId : tour.propertyId.title ?? tour.propertyId._id}</p>
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
      </section>
    </DashboardLayout>
  );
};

export default Tours;
