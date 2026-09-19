import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { marketAuthPath, marketDestination } from '../hooks/useMarketAccessIntent';

interface ProtectedRouteProps {
  allowedRoles?: Array<'buyer' | 'landlord' | 'proxy_inspector' | 'admin'>;
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const marketRedirect = marketDestination(location.pathname + location.search + location.hash);
    return <Navigate to={marketAuthPath(marketRedirect ? '/register' : '/login', marketRedirect)} replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
