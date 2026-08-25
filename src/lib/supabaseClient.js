import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("YOUR-PROJECT") && anonKey !== "your-anon-public-key",
);

// اگر کلیدها تنظیم نشده باشند client ساختیم نمی‌کنیم تا اپ کرش نکند؛
// SetupNotice مسیر راه‌اندازی را نشان می‌دهد.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
