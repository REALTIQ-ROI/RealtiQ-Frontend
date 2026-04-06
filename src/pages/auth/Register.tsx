import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/forms/RegisterForm';
import AuthLayout from '../../components/layout/AuthLayout';

const Register = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join RealtiQ to access premium listings and inquiry tools."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      <RegisterForm onSuccess={() => navigate('/dashboard')} />
    </AuthLayout>
  );
};

export default Register;