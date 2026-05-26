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

    try {
      const result = await notificationService.sendRecentPropertiesDigest({
        daysBack: Number(daysBack),
        limit: Number(limit),
      });
      setMessage(`${result.message} (${result.recipientCount} recipients, ${result.propertyCount} properties)`);
      toast.success(result.message);
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
          <div className="bg-emerald-50 text-emerald-800 rounded-xl p-5 border border-emerald-200">
            {message}
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
};

export default NotificationDigest;
