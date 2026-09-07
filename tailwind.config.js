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
                // ── Brand Aliases (Design System) ──
                primary: "#59BBAF",
                "primary-alt": "#59bbaf",
                "primary-hover": "#50A89E",
                girl: "#E0195B",
                third: "#F8A41D",
                sec: "#202A5A",

                // ── Ecosystem Theme ──
                ecosystem: {
                    light: "#EEF8F7",
                    normal: "#59BBAF",
                    dark: "#438C83",
                    darker: "#1F413D",
                },

                // ── Male Theme ──
                male: {
                    light: "#E9EAEF",
                    normal: "#202A5A",
                    dark: "#182044",
                    darker: "#0B0F1F",
                },

                // ── Female Theme ──
                female: {
                    light: "#FCE8EF",
                    normal: "#E0195B",
                    dark: "#A81344",
                    darker: "#4E0920",
                },

                // ── College Theme ──
                college: {
                    light: "#FEF6E8",
                    normal: "#F8A41D",
                    dark: "#BA7B16",
                    darker: "#57390A",
                },

                // ── Club Theme ──
                club: {
                    light: "#F0EAF4",
                    normal: "#652D90",
                    dark: "#4C226C",
                    darker: "#231032",
                },

                // ── Text & Title (Neutral) ──
                ink: {
                    DEFAULT: "#292827",
                    light: "#EAEAE9",
                    dark: "#1F1E1D",
                    darker: "#0E0E0E",
                    faq: "#3d3b3a",
                    subtle: "#777777",
                    soft: "#333230",
                },

                // ── Accents ──
                "accent-green": "#009966",
                "accent-red": "#C60036",
                "accent-purple": "#8A38F5",

                // ── Legacy aliases (backward compat) ──
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

                // ── Background Surfaces ──
                "bg-mint": "#f2faf9",
                "bg-blush": "#fefafb",
                "bg-lavender": "#f4f5fb",
                "bg-neutral": "#f6f6f6",

                // ── Theme colors from md ──
                ...md.colors,
            },
            borderRadius: {
                // ── Design System Radius Tokens ──
                xs: "5px",
                sm: "8px",
                md: "12px",
                lg: "17px",
                xl: "24px",
                "2xl": "34px",
                pill: "40px",

                // ── Legacy aliases (backward compat) ──
                "pill-sm": "0.1875rem",
                "pill-md": "0.5rem",
                "pill-lg": "0.625rem",
                badge: "0.475rem",
                chip: "0.51875rem",
                "card-sm": "0.8375rem",
                "card-lg": "2.5625rem",
                navbar: "1.375rem",
                "squircle-sm": "0.75rem",
                "squircle-md": "0.875rem",
                "squircle-lg": "2.75rem",
                "squircle-xl": "2.5rem",
                ...md.borderRadius,
            },
            fontSize: {
                // ── Design System Typography Scale (Standard & Legible) ──
                xs: ["0.75rem", { lineHeight: "1.125rem" }], // 12px
                sm: ["0.875rem", { lineHeight: "1.3125rem" }], // 14px
                base: ["1rem", { lineHeight: "1.5rem" }], // 16px
                md: ["1.125rem", { lineHeight: "1.6875rem" }], // 18px
                lg: ["1.3125rem", { lineHeight: "1.875rem" }], // 21px
                xl: ["1.625rem", { lineHeight: "2.25rem" }], // 26px
                "2xl": ["2.125rem", { lineHeight: "2.75rem" }], // 34px
                "3xl": ["2.875rem", { lineHeight: "3.5rem" }], // 46px

                // ── Legacy aliases (backward compat) ──
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
                section: "4rem",
                "section-sm": "3rem",
                "section-lg": "5rem",
                "section-xl": "6rem",
                gutter: "3rem",
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
                // ── Design System Hard Shadows (Brand Signature) ──
                ecosystem: "2.75px 2.75px 0 #59BBAF",
                male: "2.75px 2.75px 0 #202A5A",
                female: "2.75px 2.75px 0 #E0195B",
                college: "2.75px 2.75px 0 #F8A41D",
                club: "2.75px 2.75px 0 #652D90",
                neutral: "2.75px 2.75px 0 #292827",

                // ── Legacy ──
                soft: "0 1.25rem 3.75rem -1.25rem rgba(33,41,90,0.25)",
                navbar: "0 0.0625rem 0.1875rem rgba(0,0,0,0.04), 0 0.5rem 1.25rem rgba(33,41,90,0.05), 0 1.25rem 2.5rem -0.25rem rgba(33,41,90,0.06)",
                "card-offset": "6px 8px 0 0",
                "card-offset-sm": "4px 4px 0 0",
            },
        },
    },
    plugins: [],
};
