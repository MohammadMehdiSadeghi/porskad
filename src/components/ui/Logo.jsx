export default function Logo({ className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="پرسکاد">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-black text-sm">پ</span>
      </div>
      <span className="font-black text-xl text-gray-900">پرسکاد</span>
    </div>
  );
}
