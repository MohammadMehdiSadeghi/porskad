import defaultTheme from "tailwindcss/defaultTheme";
// توکن‌های دیزاین‌سیستم (منبع: DESIGN.md) — به‌صورت افزودنی مرج می‌شن
// تا کلاس‌های موجود (bg-navy، text-teal و…) نشکنن؛ توکن‌های معنایی جدید
// (primary/secondary/accent + تایپوگرافی نقش‌محور) در کنارشون اضافه می‌شن
import mdTheme from "./tailwind.theme.json";

const md = mdTheme.theme.extend;

/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        screens: {
            xs: "26.25rem",
            ...defaultTheme.screens,
        },
        extend: {
            fontFamily: {
                // Montserrat اول می‌شینه تا هر گلیف لاتین با اون رندر بشه؛
                // حروف فارسی در Montserrat وجود ندارن و به IRANSansX
                // برمی‌گردن (fallback per-character توسط مرورگر)
                sans: ["Montserrat", "IRANSansX", "Tahoma", "sans-serif"],
                ...md.fontFamily,
            },
            colors: {
                navy: "#21295a",
                "navy-alt": "#202a5a",
                teal: "#58bdaf",
                "teal-alt": "#59bbaf",
                "teal-text": "#347e75",
                "teal-text-alt": "#2e7068",
                "teal-wordmark": "#4bb5a8",
                magenta: "#e0195b",
                "magenta-text": "#ce1754",
                orange: "#f4971f",
                "orange-alt": "#f9a21d",

                purple: "#4F215A",

                ink: "#292827",
                "bg-mint": "#f2faf9",
                "bg-blush": "#fefafb",
                "bg-lavender": "#f4f5fb",
                "bg-neutral": "#f6f6f6",
                ...md.colors,
            },
            borderRadius: {
                "pill-sm": "0.1875rem",
                "pill-md": "0.5rem",
                "pill-lg": "0.625rem",
                badge: "0.475rem",
                chip: "0.51875rem",
                "card-sm": "0.8375rem",
                "card-lg": "2.5625rem",
                navbar: "1.375rem",
                ...md.borderRadius,
            },
            fontSize: {
                "2xs": "0.81875rem",
                xs2: "0.89375rem",
                base2: "0.9375rem",
                "sm-alt": "0.9875rem",
                md2: "1rem",
                lg2: "1.09375rem",
                xl2: "1.275rem",
                "2xl2": "2rem",
                "3xl2": "2.6875rem",
                "4xl2": "3.325rem",
                "5xl2": "3.7125rem",
                "6xl2": "4.40625rem",
                ...md.fontSize,
            },
            spacing: {
                "section": "4rem",
                "section-sm": "3rem",
                "section-lg": "6rem",
                "section-xl": "8rem",
                "gutter": "3rem",
                "gutter-md": "4rem",
                "gutter-lg": "6rem",
                "gutter-xl": "7.5rem",
                ...md.spacing,
            },
            maxWidth: {
                content: "75rem",
                canvas: "90rem",
                container: "75rem",
            },
            boxShadow: {
                soft: "0 1.25rem 3.75rem -1.25rem rgba(33,41,90,0.25)",
            },
        },
    },
    plugins: [],
};
