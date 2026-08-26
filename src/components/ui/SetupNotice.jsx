export default function SetupNotice() {
  return (
    <div className="min-h-screen bg-bg-mint flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rotate-[0.5deg]">
        <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-navy rounded-[1.5rem] [corner-shape:squircle]" />
        <div className="relative z-10 bg-white border-2 border-navy rounded-[1.5rem] [corner-shape:squircle] p-8 text-center">
          <div className="w-16 h-16 bg-bg-mint border-2 border-teal-text/30 rounded-[0_1rem_0_1rem] [corner-shape:squircle] flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-black text-navy mb-2">پرسکاد</h1>
          <p className="text-sm text-ink/50 mb-6 leading-7">
            برای شروع، کلیدهای Supabase را در فایل <code className="bg-bg-neutral px-1.5 py-0.5 rounded text-xs font-mono">.env</code> تنظیم کنید.
          </p>
          <div className="space-y-2 text-xs text-ink/40 text-right leading-7">
            <p>1. یک پروژه Supabase بسازید</p>
            <p>2. migration را در SQL Editor اجرا کنید</p>
            <p>3. کلیدها را در .env کپی کنید</p>
          </div>
        </div>
      </div>
    </div>
  );
}
