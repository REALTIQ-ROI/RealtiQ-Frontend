import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/ui/LoadingState';
import { marketAuthPath, marketDestination } from '../hooks/useMarketAccessIntent';

interface ProtectedRouteProps {
  allowedRoles?: Array<'buyer' | 'landlord' | 'proxy_inspector' | 'admin'>;
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, profileError, refreshProfiles } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState label="Loading your workspace..." />;

  if (profileError) {
    return <main className="mx-auto max-w-xl p-8" role="alert">
      <h1 className="text-xl font-bold">Workspace unavailable</h1>
      <p className="mt-2">{profileError}</p>
      <button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-on-primary" onClick={() => void refreshProfiles()}>Retry</button>
    </main>;
  }

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
