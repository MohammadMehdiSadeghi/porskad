import io, subprocess
def run(sql, label):
    io.open("_t.sql","w",encoding="utf-8",newline="\n").write(sql)
    p = subprocess.run("supabase db query --linked -f _t.sql", shell=True, capture_output=True, text=True)
    t = p.stdout
    i = t.find('"v": ')
    print(label + ":", (t[i:i+500] if i>=0 else (p.stdout+p.stderr)[:300]).replace("\n"," "))
run("select polname::text as v, pg_get_expr(polqual,polrelid)::text as q from pg_policy where polrelid='public.forms'::regclass;", "FORMS-POLICIES")
run("select column_name::text as v from information_schema.columns where table_name='questions' order by 1;", "QUESTIONS-COLS")
