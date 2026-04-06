import { useNavigate } from 'react-router-dom';
import LoginForm from '../../../components/forms/LoginForm';
import AuthLayout from '../../../components/layout/AuthLayout';

const LandlordLogin = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Landlord Login"
      subtitle="Manage your property portfolio and inquiries."
      footerText="Need to onboard?"
      footerLinkLabel="Register as landlord"
      footerLinkTo="/auth/landlord/register"
    >
      <LoginForm role="landlord" onSuccess={() => navigate('/dashboard/landlord')} />
    </AuthLayout>
  );
};

export default LandlordLogin;