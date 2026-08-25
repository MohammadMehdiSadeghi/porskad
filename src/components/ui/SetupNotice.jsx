export default function SetupNotice() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">پرسکاد</h1>
        <p className="text-sm text-gray-500 mb-6 leading-7">
          برای شروع، کلیدهای Supabase را در فایل <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> تنظیم کنید.
        </p>
        <div className="space-y-2 text-xs text-gray-400 text-right leading-7">
          <p>1. یک پروژه Supabase بسازید</p>
          <p>2. migration را در SQL Editor اجرا کنید</p>
          <p>3. کلیدها را در .env کپی کنید</p>
        </div>
      </div>
    </div>
  );
}
