import { Navigate } from "react-router-dom";
import Spinner from "../ui/Spinner";
import { useAuth } from "../../context/AuthContext";

export default function AuthGuard({ children, adminOnly = false, ownerOnly = false }) {
  const { user, loading, role, isOwner } = useAuth();

  // لودینگ اولیه (بررسی سشن) — هنوز هیچی از پنل نیست؛ اسپینر، نه اسکلتون
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-neutral dark:bg-[#0B0F19]" dir="rtl">
        <Spinner label="در حال بررسی ورود شما..." />
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
    return <Navigate to="/admin/forms" replace />;
  }

  return children;
}
