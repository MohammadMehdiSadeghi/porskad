import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// بارگذاری مقادیر .env
try {
  for (const f of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      for (const line of raw.split("\n")) {
        const tr = line.trim();
        if (tr && !tr.startsWith("#") && tr.includes("=")) {
          const idx = tr.indexOf("=");
          const k = tr.slice(0, idx).trim();
          const v = tr.slice(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
} catch (err) {
  console.warn("Could not load env in dispatch script:", err);
}

import amootHandler from "../api/amoot-proxy.js";

async function runDispatcher() {
  console.log(`[${new Date().toISOString()}] 🚀 Running Scheduled SMS Dispatcher...`);

  const mockReq = {
    method: "POST",
    headers: {
      host: "localhost:5173",
    },
    body: {
      action: "dispatch_scheduled_sms",
    },
  };

  let statusCode = 200;
  let responseData = null;

  const mockRes = {
    setHeader: () => {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    send(text) {
      responseData = text;
      return this;
    },
    end(text) {
      if (text) responseData = text;
      return this;
    },
  };

  await amootHandler(mockReq, mockRes);
  console.log(`[${new Date().toISOString()}] Result (${statusCode}):`, JSON.stringify(responseData, null, 2));
}

// اگر با آرگومان --daemon یا -d اجرا شد، هر ۱ دقیقه یکبار تکرار شود
const isDaemon = process.argv.includes("--daemon") || process.argv.includes("-d");

if (isDaemon) {
  console.log("⏰ Started Scheduled SMS Dispatch Daemon (runs every 60 seconds). Press Ctrl+C to stop.");
  runDispatcher();
  setInterval(runDispatcher, 60 * 1000);
} else {
  runDispatcher().then(() => process.exit(0));
}
