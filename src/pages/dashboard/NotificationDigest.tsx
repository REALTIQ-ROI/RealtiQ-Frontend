import { useState, type FormEvent } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { toast } from 'sonner';

const NotificationDigest = () => {
  const { user } = useAuth();
  const [daysBack, setDaysBack] = useState('7');
  const [limit, setLimit] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="pt-10 px-8">
          <ErrorState message="This page is only available to admins." />
        </div>
      </AdminLayout>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setNeedsReview(false);

    try {
      const parsedDays = Number(daysBack);
      const parsedLimit = Number(limit);
      if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 30 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
        throw new Error('Days Back must be 1–30 and Limit must be 1–20.');
      }
      const result = await notificationService.sendRecentPropertiesDigest({
        daysBack: parsedDays,
        limit: parsedLimit,
      });
      const isPartial = result.httpStatus === 207;
      setNeedsReview(result.httpStatus !== 202);
      const outcome = isPartial ? 'Some dispatches failed.' : result.httpStatus === 202 ? 'Dispatch accepted.' : `Request returned status ${result.httpStatus}.`;
      setMessage(`${outcome} ${result.recipientCount} recipients and ${result.propertyCount} properties were considered. Delivery is not confirmed by this request.`);
      if (isPartial) toast.error('Some digest dispatches failed. Review delivery status before retrying.');
      else if (result.httpStatus === 202) toast.success('Digest dispatch accepted.');
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Unable to send digest.';
      setError(nextError);
      toast.error(nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <section className="pt-8 pb-12 px-8 max-w-4xl mx-auto space-y-8">
        <header>
          <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase">Admin Broadcast</span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter mt-2">Recent Properties Digest</h1>
          <p className="text-secondary mt-2">
            Queue a digest of recent properties for newsletter subscribers.
          </p>
        </header>

        <form className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Days Back</label>
            <input
              type="number"
              min={1}
              max={30}
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Limit</label>
            <input
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Queuing...' : 'Send Digest'}
            </Button>
          </div>
        </form>

        {loading ? <LoadingState label="Sending digest..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => undefined} /> : null}

        {message ? (
          <div className={`${needsReview ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'} rounded-xl border p-5`}>
            {message}
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
};

export default NotificationDigest;
