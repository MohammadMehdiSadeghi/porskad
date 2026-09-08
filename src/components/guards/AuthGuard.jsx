import { Navigate } from "react-router-dom";
import { AuthGuardSkeleton } from "../ui/Skeleton";
import { useAuth } from "../../context/AuthContext";

export default function AuthGuard({ children, adminOnly = false, ownerOnly = false }) {
  const { user, loading, role, isOwner } = useAuth();

  if (loading) {
    return <AuthGuardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (ownerOnly && !isOwner()) {
    return <Navigate to="/admin/forms" replace />;
  }

  return children;
}
