# Skeleton ↔ Design-System similarity test
# Each page has a checklist of design-system tokens/structure that the REAL page uses.
# A check passes when the token appears in BOTH the real page source and Skeleton.jsx.
import io

def read(p):
    return io.open(p, encoding="utf-8").read()

skel = read("src/components/ui/Skeleton.jsx")

PAGES = {
    "Dashboard":   "src/pages/Admin/Dashboard.jsx",
    "FormsList":   "src/pages/Admin/Forms/FormsList.jsx",
    "Responses":   "src/pages/Admin/Forms/Responses.jsx",
    "FormFill":    "src/pages/Form/index.jsx",
    "ShareForm":   "src/pages/Admin/Forms/ShareForm.jsx",
    "AuthGuard":   "src/pages/Form/index.jsx",  # مرجع: کارت مجنتای «ثبت‌نام محدود است»
    "StatCard":    "src/components/ui/StatCard.jsx",
    "StickerCard": "src/components/ui/StickerCard.jsx",
}

CHECKS = {
  "Dashboard": [
    ("grid آماری ۴تایی",        "grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5"),
    ("تم teal",                 'theme="teal"'),
    ("تم orange",               'theme="orange"'),
    ("تم navy",                 'theme="navy"'),
    ("تم magenta",              'theme="magenta"'),
    ("کارت سفید استیکری",       'theme="white"'),
    ("چرخش جدول 0.3deg",        "rotate-[0.3deg]"),
    ("شعاع cardSm (1.25/گوشه‌گرد نامتقارن)", "rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none"),
    ("بوردر هدر border-b-2 ink/10", "border-b-2 border-ink/10"),
    ("zebra بنفش bg-bg-lavender/60", "bg-bg-lavender/60"),
  ],
  "FormsList": [
    ("شبکه کارت sm:2 gap-3/5",  "grid sm:grid-cols-2 gap-3 lg:gap-5"),
    ("چرخش ±0.5deg کارت",       "rotate-[0.5deg]"),
    ("بنر سهمیه teal/30",       "border-teal/30"),
    ("جستجوی rounded-pill-md",  "rounded-pill-md"),
    ("تب فیلتر rounded-pill-sm","rounded-pill-sm"),
  ],
  "Responses": [
    ("شبکه خلاصه gap-2.5",      "grid grid-cols-2 lg:grid-cols-4 gap-2.5"),
    ("آیکون w-9 h-9 rounded-xl","w-9 h-9"),
    ("کارت خلاصه p-3.5",        "p-3.5"),
    ("border-2 border-ink/10",  "border-2 border-ink/10"),
  ],
  "FormFill": [
    ("پترن نقطه‌ای",            "dot-pattern"),
    ("زمینه bg-ecosystem-light","bg-ecosystem-light"),
    ("هدر max-w-[75rem]",       "max-w-[75rem]"),
    ("کارت max-w-2xl",          "max-w-2xl"),
    ("چرخش -0.5deg",            "-rotate-[0.5deg]"),
    ("شعاع cardSm",             "rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none"),
    ("StickerCard سفید",        'theme="white"'),
  ],
  "ShareForm": [
    ("فاصله gap-6",             "flex flex-col gap-6"),
    ("شعاع کارت 1.5rem",        "rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none"),
    ("باکس PublicID bg-bg-mint","bg-bg-mint"),
    ("بوردر teal/20",           "border-teal/20"),
    ("p-5 sm:p-6",              "p-5 sm:p-6"),
  ],
  "AuthGuard": [
    ("زمینه bg-male-light",     "bg-male-light"),
    ("چرخش -0.5deg",            "-rotate-[0.5deg]"),
    ("تم magenta",              'theme="magenta"'),
    ("max-w-sm",                "max-w-sm"),
  ],
}

total = passed = 0
lines = []
for name, items in CHECKS.items():
    real = read(PAGES[name])
    ok_ct = 0
    fails = []
    for lbl, tok in items:
        in_real = tok in real
        in_skel = tok in skel
        if in_real and in_skel:
            ok_ct += 1
        elif not in_real:
            fails.append(f"{lbl}(در صفحه نیست!)")
        else:
            fails.append(lbl)
    total += len(items); passed += ok_ct
    pct = 100.0 * ok_ct / len(items)
    status = "✅" if pct == 100 else "⚠️"
    lines.append(f"{status} {name:<10} {ok_ct:>2}/{len(items):<2}  {pct:5.1f}%" + (f"   ← {', '.join(fails)}" if fails else ""))

print("\n".join(lines))
print("-" * 60)
print(f"OVERALL: {passed}/{total}  = {100.0*passed/total:.1f}%")