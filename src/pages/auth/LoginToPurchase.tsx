import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/forms/LoginForm';
import AuthLayout from '../../components/layout/AuthLayout';

const LoginToPurchase = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Login to Purchase"
      subtitle="Sign in to continue with your property purchase."
      footerText="Need an account?"
      footerLinkLabel="Register"
      footerLinkTo="/register-to-purchase"
    >
      <LoginForm role="buyer" onSuccess={() => navigate('/checkout')} />
    </AuthLayout>
  );
};

export default LoginToPurchase;