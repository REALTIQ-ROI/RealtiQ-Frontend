import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/forms/LoginForm';
import AuthLayout from '../../components/layout/AuthLayout';

const Login = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Please enter your details to access your collection."
      footerText="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkTo="/register"
    >
      <LoginForm onSuccess={() => navigate('/dashboard')} />
    </AuthLayout>
  );
};

export default Login;