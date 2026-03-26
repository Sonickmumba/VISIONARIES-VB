import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function ProtectedRoute() {
  const { user, initializing } = useSelector((state) => state.auth);
  const location = useLocation();

  if (initializing) return null; // wait for fetchCurrentUser

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, initializing } = useSelector((state) => state.auth);

  if (initializing) return null;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
