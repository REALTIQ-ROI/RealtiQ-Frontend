import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/forms/RegisterForm';
import AuthLayout from '../../components/layout/AuthLayout';

const RegisterToPurchase = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Register to Purchase"
      subtitle="Create your profile to unlock checkout and secure payment flow."
      footerText="Already registered?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login-to-purchase"
    >
      <RegisterForm hideRoleSelector defaultRole="buyer" onSuccess={() => navigate('/checkout')} />
    </AuthLayout>
  );
};

export default RegisterToPurchase;