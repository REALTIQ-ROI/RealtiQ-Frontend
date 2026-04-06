import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const LandlordDetails = () => {
  const { data } = useAsync(() => userService.getLandlords(), true);
  const landlord = (data ?? [])[0];

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Landlord Details</h1>
        {landlord ? (
          <div className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <p><strong>Name:</strong> {landlord.name}</p>
            <p><strong>Email:</strong> {landlord.email}</p>
            <p><strong>Role:</strong> {landlord.role}</p>
          </div>
        ) : (
          <p className="text-secondary">No landlord found.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default LandlordDetails;