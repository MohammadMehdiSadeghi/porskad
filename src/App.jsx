import { Outlet, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-red-100 p-8 max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">خطا در بارگذاری</h1>
            <p className="text-sm text-gray-500 mb-4">
              یک خطا رخ داد. لطفاً صفحه را رفرش کنید.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              رفرش صفحه
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500">
                <summary>جزئیات خطا</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
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
    </ErrorBoundary>
  );
}
