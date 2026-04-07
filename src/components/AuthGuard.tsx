import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { isAuthenticated, getRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toastShown = useRef(false);

  // Show session-expired toast once on login page (handled there), but also if user lands here
  useEffect(() => {
    if (searchParams.get("session") === "expired" && !toastShown.current) {
      toastShown.current = true;
      toast.error("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = getRole();

  // Pending users can only see the dashboard
  if (role === "pending" && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  // Role-based route check
  if (!canAccessRoute(location.pathname, role)) {
    toast.error("You don't have permission to access this page.");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
