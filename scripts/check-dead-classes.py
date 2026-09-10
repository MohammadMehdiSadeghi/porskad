import subprocess, glob
css = "".join(open(f, encoding="utf-8").read() for f in glob.glob("dist/assets/*.css"))
out = subprocess.run(
    ["grep", "-rhoE", r"dark:[a-z0-9]+(-[a-z0-9]+)*(/[0-9]+)?", "src", "--include=*.jsx"],
    capture_output=True, text=True, shell=False).stdout
missing = set()
for c in set(out.splitlines()):
    esc = c.replace("/", "\\/").replace(":", "\\:")
    if esc not in css:
        missing.add(c)
print("dark:* classes used in src but NOT generated in built CSS:")
for m in sorted(missing):
    print("  DEAD", m)
print("total dead:", len(missing))
