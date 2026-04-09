import { Navigate, Outlet, useLocation } from 'react-router';
import { useAdmin } from '../../context/AdminContext';

export function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAdmin();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm">
          Carregando sessão...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { authReady, isAuthenticated } = useAdmin();

  if (!authReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
