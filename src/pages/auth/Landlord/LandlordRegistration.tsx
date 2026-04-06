import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../../components/forms/RegisterForm';
import AuthLayout from '../../../components/layout/AuthLayout';

const LandlordRegistration = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Landlord Registration"
      subtitle="Create a landlord account to list and manage properties."
      footerText="Already registered?"
      footerLinkLabel="Sign in"
      footerLinkTo="/auth/landlord/login"
    >
      <RegisterForm hideRoleSelector defaultRole="landlord" onSuccess={() => navigate('/dashboard/landlord')} />
    </AuthLayout>
  );
};

export default LandlordRegistration;