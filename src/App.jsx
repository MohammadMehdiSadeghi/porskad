import React, { Component } from "react";
import { Outlet, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { NotificationProvider } from "./context/NotificationContext";
import SetupNotice from "./components/ui/SetupNotice";
import { isSupabaseConfigured } from "./lib/supabaseClient";

import FormFill from "./pages/Form";
import EmbedForm from "./pages/Embed";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Admin/Login";
import Dashboard from "./pages/Admin/Dashboard";
import FormsList from "./pages/Admin/Forms/FormsList";
import FormBuilder from "./pages/Admin/Forms/FormBuilder";
import Responses from "./pages/Admin/Forms/Responses";
import ShareForm from "./pages/Admin/Forms/ShareForm";
import EmbedHub from "./pages/Admin/EmbedHub";
import SmsPanel from "./pages/Admin/SmsPanel";
import Managers from "./pages/Admin/Managers";
import Profile from "./pages/Admin/Profile";
import SuperAdmin from "./pages/Admin/SuperAdmin";
import AuthGuard from "./components/guards/AuthGuard";

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-mint flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rotate-[0.5deg]">
            <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-navy rounded-[1.5rem] [corner-shape:squircle]" />
            <div className="relative z-10 bg-white border-2 border-navy rounded-[1.5rem] [corner-shape:squircle] p-8 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-black text-navy mb-2">خطا در بارگذاری</h1>
              <p className="text-sm text-ink/50 mb-4">
                یک خطا رخ داد. لطفاً صفحه را رفرش کنید.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-teal text-white px-4 py-2 rounded-[0.625rem] [corner-shape:squircle] text-sm font-bold hover:bg-teal-text transition-colors"
              >
                رفرش صفحه
              </button>
              {this.state.error && (
                <details className="mt-4 text-left text-xs text-ink/50">
                  <summary>جزئیات خطا</summary>
                  <pre className="mt-2 bg-bg-neutral p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <NotificationProvider>
          <Routes>
            {/* عمومی — فرم پر کردن */}
            <Route path="/f/:slug" element={<FormFill />} />

            {/* Embed — جاسازی فرم در سایت‌های دیگر */}
            <Route path="/embed/:formId" element={<EmbedForm />} />

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
              <Route path="forms/:id/share" element={<ShareForm />} />
              <Route path="managers" element={<AuthGuard adminOnly={true}><Managers /></AuthGuard>} />
              <Route path="superadmin" element={<AuthGuard ownerOnly={true}><SuperAdmin /></AuthGuard>} />
              <Route path="embed" element={<EmbedHub />} />
              <Route path="sms" element={<SmsPanel />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* هدایت پیش‌فرض */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
