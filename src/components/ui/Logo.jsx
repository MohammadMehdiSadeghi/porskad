export default function Logo({ className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="پرسکاد">
      <div className="relative">
        <div aria-hidden="true" className="absolute top-[0.1rem] left-[0.1rem] w-full h-full bg-teal-text rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle]" />
        <div className="relative w-8 h-8 bg-teal border-2 border-ink/10 rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle] flex items-center justify-center">
          <span className="text-white font-black text-sm">پ</span>
        </div>
      </div>
      <span className="font-black text-xl text-navy">پرسکاد</span>
    </div>
  );
}
