import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading, Empty } from "../components/UI";
import type { Role } from "../types/api";
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading text="Restoring your session…" />;
  if (!user)
    return (
      <Navigate
        replace
        to={
          "/login?next=" +
          encodeURIComponent(location.pathname + location.search)
        }
      />
    );
  if (roles && !roles.includes(user.role))
    return (
      <div className="container page">
        <Empty title="This area is for another role.">
          <p>Your account does not have access to this dashboard.</p>
          <Link className="button" to="/hotels">
            Browse hotels
          </Link>
        </Empty>
      </div>
    );
  return <Outlet />;
}
