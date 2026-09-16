import { Navigate } from "react-router-dom";
import { AuthGuardSkeleton } from "../ui/Skeleton";
import { useAuth } from "../../context/AuthContext";

export default function AuthGuard({ children, adminOnly = false, ownerOnly = false }) {
  const { user, loading, role, isOwner } = useAuth();

  // بررسی اینکه آیا توکن احراز هویت در آدرس وجود دارد و در حال اعتبارسنجی است
  const hasIncomingAuthToken = typeof window !== "undefined" && (
    window.location.hash.includes("access_token=") ||
    window.location.search.includes("token_hash=") ||
    window.location.search.includes("impersonate_token=") ||
    window.location.search.includes("code=")
  );

  // لودینگ اولیه یا در حال پردازش توکن ورود در آدرس
  if (loading || (hasIncomingAuthToken && !user)) {
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
