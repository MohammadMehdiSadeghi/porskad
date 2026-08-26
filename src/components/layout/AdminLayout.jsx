import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/admin", label: "داشبورد", icon: LayoutDashboard, end: true },
  { to: "/admin/forms", label: "فرم‌ها", icon: FileText },
  { to: "/admin/managers", label: "مدیران", icon: Users, adminOnly: true },
];

export default function AdminLayout() {
  const { user, loading, logout, role } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-neutral">
        <Spinner label="چک کردن لاگین..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg-neutral flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-navy flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute top-[0.1rem] left-[0.1rem] w-full h-full bg-teal-text rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle]"
              />
              <div className="relative w-9 h-9 bg-teal border-2 border-white/20 rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle] flex items-center justify-center">
                <span className="text-white font-black text-sm">پ</span>
              </div>
            </div>
            <div>
              <h1 className="font-black text-lg text-white leading-tight">پرسکاد</h1>
              <p className="text-[0.65rem] text-white/45 font-medium">
                {role === "admin" ? "مدیر ارشد" : "مدیر"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.adminOnly && role !== "admin") return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-[0.625rem] [corner-shape:squircle] text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-teal text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white/70 text-sm font-bold">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/70 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 !text-magenta hover:!bg-white/10"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            خروج
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-ink/10 px-4 sm:px-6 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-[0.5rem] [corner-shape:squircle] hover:bg-ink/5 text-navy"
          >
            <Menu size={20} />
          </button>
          <span className="font-black text-navy">پرسکاد</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
