import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../context/useAuth";
import { roleHome } from "../../config/roles";
import RouteLoading from "./RouteLoading";

export default function PermissionRoute({ permission }) {
  const { can, isAuthenticated, authLoading, role } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!can(permission)) {
    return <Navigate to={roleHome[role] || "/home"} replace />;
  }

  return <Outlet />;
}