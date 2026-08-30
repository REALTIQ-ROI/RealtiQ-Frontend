import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAsync } from '../../hooks/useAsync';
import { propertyService } from '../../services/propertyService';
import type { MediaItem, OffPlanDevelopmentStatus, Property } from '../../types';
import { formatDate, labelize } from '../../utils/projectFormatters';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import MediaUploader from './MediaUploader';

const stages: OffPlanDevelopmentStatus[] = ['planned', 'pre_construction', 'foundation', 'structural', 'roofing', 'finishing', 'completed'];
const inputClass = 'w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none';

const ConstructionUpdateManager = ({ property, onPropertyUpdated }: { property: Property; onPropertyUpdated?: (property: Property) => void }) => {
  const propertyId = property.publicReference || property._id;
  const { data, loading, execute } = useAsync(() => propertyService.listConstructionUpdates(propertyId, { page: 1, limit: 20, sort: 'desc' }), true);
  const [developmentStatus, setDevelopmentStatus] = useState<OffPlanDevelopmentStatus>(property.offPlan?.developmentStatus ?? 'planned');
  const [progressPercentage, setProgressPercentage] = useState(property.offPlan?.constructionProgress?.toString() ?? '0');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const progress = Number(progressPercentage);
    if (!title.trim()) {
      toast.error('Construction update title is required.');
      return;
    }
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error('Progress must be between 0 and 100.');
      return;
    }
    setSaving(true);
    try {
      const result = await propertyService.createConstructionUpdate(propertyId, {
        developmentStatus,
        progressPercentage: progress,
        title: title.trim(),
        description: description.trim() || undefined,
        reason: reason.trim() || undefined,
        media,
      });
      toast.success('Construction update posted.');
      onPropertyUpdated?.(result.property);
      setTitle('');
      setDescription('');
      setReason('');
      setMedia([]);
      await execute();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to post construction update.');
    } finally {
      setSaving(false);
    }
  };

  const completeOffPlan = async () => {
    setCompleting(true);
    try {
      const result = await propertyService.completeOffPlanProperty(propertyId, { convertToReady: false });
      toast.success('Off-plan property marked complete.');
      onPropertyUpdated?.(result.property);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to complete off-plan property.');
    } finally {
      setCompleting(false);
    }
  };

  if (property.listingType !== 'off_plan') return null;

  return (
    <section className="mt-10 rounded-xl border border-outline-variant/10 bg-white p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Construction updates</h2>
          <p className="text-sm text-secondary">Post updates without overwriting history. RealtIQ updates the current progress from each accepted entry.</p>
        </div>
        <Button type="button" variant="secondary" disabled={completing} onClick={() => void completeOffPlan()}>
          {completing ? 'Completing...' : 'Complete Off-Plan'}
        </Button>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4 md:grid-cols-2">
        <select value={developmentStatus} onChange={(event) => setDevelopmentStatus(event.target.value as OffPlanDevelopmentStatus)} className={inputClass}>
          {stages.map((stage) => <option key={stage} value={stage}>{labelize(stage)}</option>)}
        </select>
        <input type="number" min={0} max={100} value={progressPercentage} onChange={(event) => setProgressPercentage(event.target.value)} className={inputClass} placeholder="Progress %" />
        <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Update title" />
        <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} placeholder="Reason, required when moving backward" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`${inputClass} resize-none md:col-span-2`} placeholder="Description" />
        <div className="md:col-span-2">
          <MediaUploader value={media} onChange={setMedia} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Posting...' : 'Post update'}
        </Button>
      </form>

      <div className="mt-8">
        {loading ? <LoadingState label="Loading construction history..." /> : null}
        <div className="space-y-4">
          {(data?.updates ?? []).map((update) => (
            <article key={update._id} className="border-l-4 border-primary pl-4">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">{formatDate(update.updateDate || update.createdAt)}</p>
              <h3 className="font-black">{update.title}</h3>
              <p className="text-sm text-secondary">{labelize(update.developmentStatus)} - {update.progressPercentage}%</p>
              {update.description ? <p className="mt-1 text-sm">{update.description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ConstructionUpdateManager;
