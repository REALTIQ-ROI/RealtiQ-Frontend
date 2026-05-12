import { useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import Card from '../../../components/ui/Card';
import LoadingState from '../../../components/ui/LoadingState';
import AssumptionForm from '../../../components/roi/AssumptionForm';
import ROIAssumptionsDisplay from '../../../components/roi/ROIAssumptionsDisplay';
import { useAsync } from '../../../hooks/useAsync';
import { roiService, type ROIAssumptions as ROIAssumptionsModel } from '../../../services/roiService';

const AdminROIAssumptions = () => {
  const { data: assumptions, loading, error, execute } = useAsync(() => roiService.getAssumptions(), true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: ROIAssumptionsModel) => {
    setSaving(true);
    try {
      await roiService.createAssumptions(payload);
      toast.success('ROI assumptions saved.');
      await execute();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save ROI assumptions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <section className="p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-bold">Admin Controls</p>
          <h1 className="text-3xl font-extrabold">ROI Assumptions</h1>
          <p className="text-sm text-secondary mt-1">Manage the default values used by ROI calculators and property scenarios.</p>
        </div>

        {loading ? <LoadingState label="Loading ROI assumptions..." /> : null}
        {error ? (
          <div className="rounded-lg bg-red-50 text-error p-4 text-sm">
            Unable to load current assumptions. You can still submit a new default set.
          </div>
        ) : null}

        <ROIAssumptionsDisplay assumptions={assumptions} loading={loading} />

        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Editable Defaults</h2>
            <p className="text-sm text-secondary mt-1">All numeric values are validated before submission.</p>
          </div>
          <AssumptionForm
            key={assumptions?._id ?? assumptions?.effectiveDate ?? 'new-assumptions'}
            initialValue={assumptions}
            saving={saving}
            onSubmit={handleSubmit}
          />
        </Card>
      </section>
    </AdminLayout>
  );
};

export default AdminROIAssumptions;
