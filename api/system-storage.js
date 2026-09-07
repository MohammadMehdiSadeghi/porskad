import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function getDirSize(dirPath, exclude = []) {
  let totalBytes = 0;
  let fileCount = 0;
  try {
    if (!fs.existsSync(dirPath)) return { bytes: 0, files: 0 };
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          const sub = getDirSize(fullPath, exclude);
          totalBytes += sub.bytes;
          fileCount += sub.files;
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
          fileCount += 1;
        }
      } catch {}
    }
  } catch {}
  return { bytes: totalBytes, files: fileCount };
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Check if user is superadmin (is_owner or role_id === 'admin')
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_owner")
      .eq("id", user.id)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperAdmin = Boolean(profile?.is_owner || roleData?.role_id === "admin");
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Superadmin access required" });
    }

    const rootDir = process.cwd();

    // Calculate project root file sizes
    const sourceStats = getDirSize(rootDir, [".git", "node_modules", ".agents"]);
    const fullStats = getDirSize(rootDir, [".git", ".agents"]);
    const srcStats = getDirSize(path.join(rootDir, "src"));
    const distStats = getDirSize(path.join(rootDir, "dist"));
    const publicStats = getDirSize(path.join(rootDir, "public"));
    const apiStats = getDirSize(path.join(rootDir, "api"));

    const projectStorage = {
      source_bytes: sourceStats.bytes,
      source_pretty: formatBytes(sourceStats.bytes),
      source_files: sourceStats.files,
      full_bytes: fullStats.bytes,
      full_pretty: formatBytes(fullStats.bytes),
      full_files: fullStats.files,
      breakdown: [
        { name: "Frontend Source (src/)", bytes: srcStats.bytes, pretty: formatBytes(srcStats.bytes), files: srcStats.files },
        { name: "Static Assets (public/)", bytes: publicStats.bytes, pretty: formatBytes(publicStats.bytes), files: publicStats.files },
        { name: "Build Output (dist/)", bytes: distStats.bytes, pretty: formatBytes(distStats.bytes), files: distStats.files },
        { name: "Serverless Endpoints (api/)", bytes: apiStats.bytes, pretty: formatBytes(apiStats.bytes), files: apiStats.files },
        { name: "Packages & Modules (node_modules/)", bytes: Math.max(0, fullStats.bytes - sourceStats.bytes), pretty: formatBytes(Math.max(0, fullStats.bytes - sourceStats.bytes)), files: Math.max(0, fullStats.files - sourceStats.files) },
      ],
    };

    let dbStorage = {
      db_size_bytes: 0,
      db_size_pretty: "—",
      tables: [],
      estimated: false,
    };

    if (supabaseUrl && serviceKey) {

      // اول از طریق تابع RPC get_database_storage_stats تلاش کن
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_database_storage_stats");
        if (!rpcErr && rpcData && rpcData.db_size_bytes) {
          dbStorage = rpcData;
        }
      } catch {}

      // اگر تابع RPC هنوز نبود، به روش شمارش سطرها و متادیتا تخمین بزن
      if (!dbStorage.db_size_bytes) {
        try {
          const knownTables = [
            "forms", "questions", "responses", "answers", "profiles",
            "activity_logs", "support_tickets", "telegram_config",
            "telegram_form_links", "telegram_send_log", "sms_outbox", "sms_inbox"
          ];
          let totalBytes = 0;
          const tablesList = [];

          for (const tbl of knownTables) {
            try {
              const { count } = await supabase.from(tbl).select("*", { count: "exact", head: true });
              const rowCount = count || 0;
              const bytesPerRow = tbl === "responses" ? 1200 : tbl === "answers" ? 600 : tbl === "questions" ? 2500 : 900;
              const tableBytes = rowCount * bytesPerRow + (rowCount > 0 ? 16384 : 8192);
              totalBytes += tableBytes;
              tablesList.push({
                table_name: tbl,
                bytes: tableBytes,
                pretty: formatBytes(tableBytes),
                row_count: rowCount,
              });
            } catch {}
          }

          const totalEstimatedDb = totalBytes + (7.2 * 1024 * 1024);
          dbStorage = {
            db_size_bytes: totalEstimatedDb,
            db_size_pretty: formatBytes(totalEstimatedDb),
            tables: tablesList.sort((a, b) => b.bytes - a.bytes),
            estimated: true,
          };
        } catch {}
      }
    }

    return res.status(200).json({
      project: projectStorage,
      database: dbStorage,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
