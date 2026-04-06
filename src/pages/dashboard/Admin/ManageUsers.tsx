import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const ManageUsers = () => {
  const { data: users, execute } = useAsync(() => userService.getUsers(), true);

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Manage Users</h1>
        <div className="mt-6 space-y-3">
          {(users ?? []).map((user) => (
            <article key={user._id} className="rounded-xl border border-outline-variant/20 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-secondary">{user.email}</p>
                <p className="text-xs uppercase tracking-wide">{user.role}</p>
              </div>
              <Button variant="secondary" onClick={() => void execute()}>
                Refresh
              </Button>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ManageUsers;