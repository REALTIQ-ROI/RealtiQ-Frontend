import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const ManageLandlords = () => {
  const { data } = useAsync(() => userService.getLandlords(), true);

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Manage Landlords</h1>
        <div className="mt-6 space-y-3">
          {(data ?? []).map((landlord) => (
            <article key={landlord._id} className="rounded-xl border border-outline-variant/20 p-4">
              <p className="font-semibold">{landlord.name}</p>
              <p className="text-sm text-secondary">{landlord.email}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ManageLandlords;