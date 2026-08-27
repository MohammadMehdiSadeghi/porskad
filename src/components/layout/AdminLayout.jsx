import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";
import { LayoutDashboard, FileText, Share2, Users, User, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin", label: "داشبورد", icon: LayoutDashboard, end: true },
  { to: "/admin/forms", label: "فرم‌ها", icon: FileText, end: false },
  { to: "/admin/embed", label: "اشتراک‌گذاری", icon: Share2, end: false },
  { to: "/admin/managers", label: "مدیران", icon: Users, end: false, adminOnly: true },
  { to: "/admin/profile", label: "پروفایل", icon: User, end: false },
];

export default function AdminLayout() {
  const { user, loading, role, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen bg-bg-lavender"><Spinner label="چک کردن لاگین..." /></div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg-lavender flex flex-col sm:flex-row">
      {/* سایدبار */}
      <aside className="bg-navy text-white sm:w-60 shrink-0 sm:min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <span className="inline-flex items-baseline gap-1 text-xl font-black rotate-[-2deg] select-none">
            <span>پرس</span>
            <span className="text-teal">کاد</span>
          </span>
          <span className="text-[0.65rem] font-bold bg-teal/25 text-teal rounded-pill-sm px-1.5 py-0.5">
            پنل ادمین
          </span>
        </div>

        <nav className="flex sm:flex-col gap-1 px-3 py-3 overflow-x-auto">
          {NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-pill-md px-3.5 py-2.5
                 text-sm font-bold transition-colors ${
                   isActive
                     ? "bg-teal text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.25)]"
                     : "text-white/70 hover:text-white hover:bg-white/10"
                 }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sm:mt-auto px-3 py-3 border-t border-white/10 flex sm:flex-col items-center gap-2">
          <span className="text-[0.7rem] font-medium text-white/50 truncate sm:w-full text-center" dir="ltr">
            {user.email}
          </span>
          <Button variant="ghost" size="sm" className="!text-white/80 hover:!text-white !border-white/20" onClick={handleLogout}>
            <LogOut size={14} className="ml-1" /> خروج
          </Button>
        </div>
      </aside>

      {/* محتوا */}
      <main className="flex-1 min-w-0 p-4 sm:p-7">
        <Outlet />
      </main>
    </div>
  );
}
