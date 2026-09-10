import re, glob, io, subprocess
css = "".join(open(f, encoding="utf-8").read() for f in glob.glob("dist/assets/*.css"))
out = subprocess.run(
    ["grep", "-rhoE", r"(bg|text|border|ring|from|via|to|divide|placeholder|shadow|outline|fill|stroke|accent)-(teal|orange|purple|navy|magenta|violet)-[0-9]{2,3}(/[0-9]{1,2})?", "src", "--include=*.jsx"],
    capture_output=True, text=True, shell=False).stdout
missing = sorted(set(c for c in out.splitlines() if c.replace("/", "\\/") not in css))
print("non-dark dead custom-scale classes:", len(missing))
for m in missing[:20]:
    print("  DEAD", m)
