import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../context/useAuth";
import { roleHome } from "../../config/roles";
import RouteLoading from "./RouteLoading";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, authLoading, role } = useAuth();
  const location = useLocation();

  // Wait for the session check so a refresh does not bounce the user to /login.
  if (authLoading) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={roleHome[role] || "/home"} replace />;
  }

  return <Outlet />;
}