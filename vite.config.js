import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // برای تست لوکال APIهای Vercel: `vercel dev` را روی پورت 3000 اجرا کن
      // (npx vercel dev) — بعد این proxy درخواست‌های /api را به آن می‌فرستد.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
