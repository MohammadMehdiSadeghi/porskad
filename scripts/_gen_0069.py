import re, io

path = "C:/Users/Mohammad/Documents/porskad/supabase/migrations/0061_save_form_default_theme.sql"
text = io.open(path, encoding="utf-8").read()

marker = "v_existing_ids uuid[];\nBEGIN\n"
if marker not in text:
    raise SystemExit("marker not found")

guard = (
    "v_existing_ids uuid[];\n"
    "BEGIN\n"
    "  -- \u2500\u2500\u2500 \u06af\u0627\u0631\u062f \u0627\u0645\u0646\u06cc\u062a\u06cc (0069): \u0641\u0642\u0637 \u0645\u0627\u0644\u06a9/\u0645\u062f\u06cc\u0631 \u0641\u0631\u0645 \u06cc\u0627 \u0627\u062f\u0645\u06cc\u0646 \u0645\u06cc\u062a\u0648\u0627\u0646\u062f \u0630\u062e\u06cc\u0631\u0647 \u06a9\u0646\u062f \u2500\u2500\u2500\n"
    "  IF NOT EXISTS (\n"
    "    SELECT 1 FROM public.forms f\n"
    "    WHERE f.id = p_form_id\n"
    "      AND (\n"
    "        public.is_owner(auth.uid())\n"
    "        OR public.is_admin(auth.uid())\n"
    "        OR f.created_by = auth.uid()\n"
    "        OR f.manager_id = auth.uid()\n"
    "      )\n"
    "  ) THEN\n"
    "    RAISE EXCEPTION 'not authorized to save this form';\n"
    "  END IF;\n"
    "\n"
)

text = text.replace(marker, guard, 1)

out = "C:/Users/Mohammad/Documents/porskad/supabase/migrations/0069_save_form_owner_guard.sql"
io.open(out, "w", encoding="utf-8").write(text)
print("written", len(text), "chars ->", out)
