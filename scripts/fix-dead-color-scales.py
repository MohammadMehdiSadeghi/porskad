import re, glob, io

# Colors overridden in tailwind.config.js as single values -> their -{shade} scales are DEAD.
CUSTOM = ["teal", "orange", "purple", "navy", "magenta", "violet"]
PROPS = r"bg|text|border|ring|from|via|to|divide|placeholder|shadow|outline|fill|stroke|accent"
pat = re.compile(rf"(?P<pre>dark:)??(?P<prop>{PROPS})-(?P<color>{'|'.join(CUSTOM)})-\d{{2,3}}(?P<op>/\d{{1,2}})?")

def repl(m):
    pre = m.group("pre") or ""
    return f"{pre}{m.group('prop')}-{m.group('color')}{m.group('op') or ''}"

changed = []
for f in glob.glob("src/**/*.jsx", recursive=True):
    s = io.open(f, encoding="utf-8").read()
    new = pat.sub(repl, s)
    if new != s:
        io.open(f, "w", encoding="utf-8", newline="").write(new)
        changed.append(f)
print("files changed:", len(changed))
