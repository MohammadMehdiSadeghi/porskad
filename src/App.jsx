import { Outlet, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import SetupNotice from "./components/ui/SetupNotice";
import { isSupabaseConfigured } from "./lib/supabaseClient";

import FormFill from "./pages/Form";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Admin/Login";
import Dashboard from "./pages/Admin/Dashboard";
import FormsList from "./pages/Admin/Forms/FormsList";
import FormBuilder from "./pages/Admin/Forms/FormBuilder";
import Responses from "./pages/Admin/Forms/Responses";
import Managers from "./pages/Admin/Managers";
import AuthGuard from "./components/guards/AuthGuard";

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* عمومی — فقط فرم پر کردن */}
          <Route path="/f/:slug" element={<FormFill />} />

          {/* ادمین */}
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <AuthGuard adminOnly={false}>
                <AdminLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="forms" element={<FormsList />} />
            <Route path="forms/:id" element={<FormBuilder />} />
            <Route path="forms/:id/responses" element={<Responses />} />
            <Route
              path="managers"
              element={
                <AuthGuard adminOnly={true}>
                  <Managers />
                </AuthGuard>
              }
            />
          </Route>

          {/* هدایت پیش‌فرض */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
