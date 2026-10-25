import AccountSecuritySettings from '../../components/profile/AccountSecuritySettings';
import ProxyInspectorLayout from '../../components/layout/ProxyInspectorLayout';
import { useAuth } from '../../contexts/AuthContext';

const AccountSecuritySettingsPage = () => {
  const { user } = useAuth();
  return <ProxyInspectorLayout title="Account security">
    {user ? <AccountSecuritySettings user={user} /> : <p role="alert" className="text-sm text-error">Your account is unavailable. Sign in again to manage account security.</p>}
  </ProxyInspectorLayout>;
};

export default AccountSecuritySettingsPage;
