import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (user.role === 'landlord') {
    return <Navigate to="/dashboard/landlord" replace />;
  }

  if (user.role === 'proxy_inspector') {
    return <Navigate to="/proxy/tasks" replace />;
  }

  return <Navigate to="/dashboard/buyer" replace />;
};

export default Dashboard;
