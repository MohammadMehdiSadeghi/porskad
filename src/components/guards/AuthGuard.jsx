import { Navigate } from "react-router-dom";
import Spinner from "../ui/Spinner";
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-neutral dark:bg-[#0B0F19]" dir="rtl">
        <Spinner label="در حال تایید نشست و ورود به پنل..." />
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
