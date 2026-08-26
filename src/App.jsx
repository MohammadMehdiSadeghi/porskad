import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import SetupNotice from "./components/ui/SetupNotice";
import { isSupabaseConfigured } from "./lib/supabaseClient";

import Landing from "./pages/Landing";
import FormFill from "./pages/Form";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Admin/Login";
import Dashboard from "./pages/Admin/Dashboard";
import FormsList from "./pages/Admin/Forms/FormsList";
import FormBuilder from "./pages/Admin/Forms/FormBuilder";
import Responses from "./pages/Admin/Forms/Responses";

export default function App() {
  // تا وقتی کلیدهای Supabase تنظیم نشده‌اند، کل اپ راهنمای راه‌اندازی نشان می‌دهد
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* عمومی */}
            <Route path="/" element={<Landing />} />
            <Route path="/f/:slug" element={<FormFill />} />

            {/* ادمین */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="forms" element={<FormsList />} />
              <Route path="forms/:id" element={<FormBuilder />} />
              <Route path="forms/:id/responses" element={<Responses />} />
            </Route>

            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
