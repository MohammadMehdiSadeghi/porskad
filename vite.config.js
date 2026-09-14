import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// افزونه توسعه محلی: اجرای مستقیم اندپوینت‌های API در سرور توسعه Vite بدون نیاز به Vercel CLI
function apiDevPlugin() {
  return {
    name: "api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (url.startsWith("/api/")) {
          try {
            // تزئین متدهای کمکی Express/Vercel روی شیء پاسخ Node.js
            if (!res.status) {
              res.status = function (code) {
                this.statusCode = code;
                return this;
              };
            }
            if (!res.json) {
              res.json = function (data) {
                if (!this.getHeader("Content-Type")) {
                  this.setHeader("Content-Type", "application/json; charset=utf-8");
                }
                this.end(JSON.stringify(data));
                return this;
              };
            }

            // استخراج خودکار Query Params برای شبیه‌سازی دقیق محیط Vercel
            if (!req.query) {
              try {
                const parsedUrl = new URL(req.url, "http://localhost:5173");
                req.query = Object.fromEntries(parsedUrl.searchParams.entries());
              } catch {
                req.query = {};
              }
            }

            let handlerModule = null;
            if (url.startsWith("/api/openapi")) {
              handlerModule = await import("./api/openapi.js");
            } else if (url.startsWith("/api/v1")) {
              handlerModule = await import("./api/v1/[...route].js");
            } else {
              const routeName = url.split("?")[0].replace(/^\/api\//, "").replace(/\.js$/, "");
              try {
                handlerModule = await import(`./api/${routeName}.js`);
              } catch (importErr) {
                return next();
              }
            }

            const apiHandler = handlerModule?.default;
            if (typeof apiHandler !== "function") {
              return next();
            }

            if (["POST", "PUT", "PATCH"].includes(req.method)) {
              let bodyStr = "";
              req.on("data", (chunk) => {
                bodyStr += chunk;
              });
              req.on("end", async () => {
                try {
                  req.body = bodyStr ? JSON.parse(bodyStr) : {};
                } catch {
                  req.body = {};
                }
                await apiHandler(req, res);
              });
              return;
            }

            await apiHandler(req, res);
            return;
          } catch (err) {
            console.error("Vite API Dev Server Error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  server: {
    proxy: {
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
