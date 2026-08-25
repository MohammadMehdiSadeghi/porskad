import { Navigate } from "react-router-dom";
import Spinner from "../ui/Spinner";
import { useAuth } from "../../context/AuthContext";

export default function AuthGuard({ children, adminOnly = false }) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return children;
}
