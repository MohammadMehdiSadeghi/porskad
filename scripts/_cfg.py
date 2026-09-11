import io, subprocess
def run(sql, label):
    io.open("_t.sql","w",encoding="utf-8",newline="\n").write(sql)
    p = subprocess.run("supabase db query --linked -f _t.sql", shell=True, capture_output=True, text=True)
    t = p.stdout
    i = t.find('"v": ')
    print(label + ":", t[i:i+400] if i>=0 else (p.stdout+p.stderr)[:200])
