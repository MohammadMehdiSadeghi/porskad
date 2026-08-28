import { Navigate } from "react-router-dom";
import Spinner from "../ui/Spinner";
import { useAuth } from "../../context/AuthContext";

export default function AuthGuard({ children, adminOnly = false, ownerOnly = false }) {
  const { user, loading, role, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-neutral flex items-center justify-center">
        <Spinner label="در حال بررسی وضعیت ورود..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (ownerOnly && !isOwner()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
