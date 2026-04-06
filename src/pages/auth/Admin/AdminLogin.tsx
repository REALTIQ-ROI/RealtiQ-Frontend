import { useNavigate } from 'react-router-dom';
import LoginForm from '../../../components/forms/LoginForm';
import AuthLayout from '../../../components/layout/AuthLayout';

const AdminLogin = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Admin Login"
      subtitle="Use the platform admin credentials to access admin controls."
      footerText="Need buyer access?"
      footerLinkLabel="Go to user login"
      footerLinkTo="/login"
    >
      <div className="mb-4 rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
        Admin test credentials: <strong>admin@realtiq.com</strong> / <strong>Admin@12345</strong>
      </div>
      <LoginForm role="admin" initialEmail="admin@realtiq.com" initialPassword="Admin@12345" onSuccess={() => navigate('/dashboard/admin')} />
    </AuthLayout>
  );
};

export default AdminLogin;