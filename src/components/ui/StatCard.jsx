// ─── StatCard — کپی وفادار از رکاد با همان بافت‌ها و چرخش‌ها ───
// کارت آماری استیکری: لایه‌ی سایه + بوردر + بج سفید چرخیده + عدد درشت
const TEXTURES = {
  orange: { src: "/assets/StatCard/yellow.png", opacity: 80 },
  navy: { src: "/assets/StatCard/blue.png", opacity: 50 },
  magenta: { src: "/assets/StatCard/pink.png", opacity: 100 },
  teal: { src: "/assets/StatCard/green.png", opacity: 150 },
};

const THEMES = {
  orange: {
    rotate: "rotate-[1deg] lg:rotate-[2.5deg]",
    badgeRotate: "rotate-[3deg]",
    back: "bg-orange-alt",
    border: "border-orange-alt",
    text: "text-orange",
    badge: "border-orange text-orange",
    bg: "#FEF7EC",
  },
  navy: {
    rotate: "-rotate-[1deg] lg:-rotate-[2deg]",
    badgeRotate: "-rotate-[2.5deg]",
    back: "bg-navy-alt",
    border: "border-navy",
    text: "text-navy-alt",
    badge: "border-navy-alt text-navy-alt",
    bg: "#F4F5FB",
  },
  magenta: {
    rotate: "rotate-[1deg] lg:rotate-[2.5deg]",
    badgeRotate: "rotate-[3deg]",
    back: "bg-magenta",
    border: "border-magenta",
    text: "text-magenta-text",
    badge: "border-magenta-text text-magenta-text",
    bg: "#FEFAFB",
  },
  teal: {
    rotate: "-rotate-[1deg] lg:-rotate-[2deg]",
    badgeRotate: "-rotate-[2.5deg]",
    back: "bg-teal-alt",
    border: "border-teal",
    text: "text-teal-text",
    badge: "border-teal-text text-teal-text",
    bg: "#F2FAF9",
  },
};

export default function StatCard({ theme = "teal", label, value, caption }) {
  const t = THEMES[theme] ?? THEMES.teal;
  const texture = TEXTURES[theme] ?? TEXTURES.teal;
  const shapeClass =
    "rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]";

  return (
    <div className={`relative ${t.rotate} h-full`}>
      {/* لایه‌ی سایه */}
      <div
        aria-hidden="true"
        className={`absolute top-2 left-2 -right-[0.25rem] -bottom-[0.25rem] ${shapeClass} ${t.back}`}
      />
      {/* کارت اصلی */}
      <div
        className={`relative z-10 h-full flex flex-col items-center text-center overflow-visible
          ${shapeClass} border-[0.1875rem] ${t.border}
          px-3 xs:px-4 pt-3 xs:pt-5 pb-3 xs:pb-5 lg:px-5 lg:pt-6 lg:pb-6`}
        style={{ backgroundColor: t.bg }}
      >
        {/* بافت */}
        <div className={`absolute inset-0 ${shapeClass} overflow-hidden pointer-events-none`}>
          <img
            src={texture.src}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover scale-125 select-none"
            style={{ opacity: texture.opacity / 100 }}
          />
        </div>

        {label && (
          <span
            className={`relative z-20 inline-block -mt-1 mb-1.5 xs:mb-2 lg:-mt-1.5 lg:mb-4
              bg-white border-[0.0625rem] rounded-xl [corner-shape:squircle]
              px-1.5 py-0.5 lg:px-3 lg:py-1 whitespace-nowrap
              text-xs xs:text-xs lg:text-[0.8rem] font-bold shadow-sm
              ${t.badgeRotate} ${t.badge}`}
          >
            {label}
          </span>
        )}

        <div
          className={`relative z-20 mb-1 xs:mb-1.5 lg:mb-3
            text-[2rem] xs:text-[2.25rem] lg:text-[3rem] leading-none font-extrabold ${t.text}`}
        >
          {value}
        </div>

        {caption && (
          <div className={`relative z-20 ${t.text} mt-auto`}>
            <strong className="block text-xs xs:text-xs lg:text-[0.8rem] font-bold">
              {caption}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
