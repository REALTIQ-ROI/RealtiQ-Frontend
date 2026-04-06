import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const LoginRequired = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Login Required"
        description="You need to login before continuing this action."
        actionLabel="Go to Login"
        actionTo="/login"
      />
    </PublicLayout>
  );
};

export default LoginRequired;