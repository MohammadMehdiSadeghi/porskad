import defaultTheme from "tailwindcss/defaultTheme";
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
                sans: ["Montserrat", "IRANSansX", "Tahoma", "sans-serif"],
                ...md.fontFamily,
            },
            colors: {
                navy: "#21295a",
                "navy-alt": "#202a5a",
                "navy-hover": "#15244a",
                teal: "#58bdaf",
                "teal-alt": "#59bbaf",
                "teal-text": "#347e75",
                "teal-text-alt": "#2e7068",
                "teal-wordmark": "#4bb5a8",
                "teal-light": "#e4f4f2",
                magenta: "#e0195b",
                "magenta-text": "#ce1754",
                orange: "#f4971f",
                "orange-alt": "#f9a21d",
                purple: "#4F215A",
                violet: "#5b3e9e",
                ink: "#292827",
                "ink-faq": "#3d3b3a",
                "ink-subtle": "#777777",
                "ink-soft": "#333230",
                "progress-bg": "#ededec",
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
                navbar:
                    "0 0.0625rem 0.1875rem rgba(0,0,0,0.04), 0 0.5rem 1.25rem rgba(33,41,90,0.05), 0 1.25rem 2.5rem -0.25rem rgba(33,41,90,0.06)",
                "card-offset": "6px 8px 0 0",
                "card-offset-sm": "4px 4px 0 0",
            },
        },
    },
    plugins: [],
};
