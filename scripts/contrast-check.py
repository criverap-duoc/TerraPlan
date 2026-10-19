"""WCAG contrast checker for oklch design tokens (TerraPlan)."""
import math, sys, json

def oklch_to_srgb(L, C, h):
    a = C * math.cos(math.radians(h)); b = C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return [min(1, max(0, x)) for x in (r, g, bl)]  # linear, clipped

def lum(o):
    r, g, b = oklch_to_srgb(*o)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)

def gamut_ok(o):
    L, C, h = o
    a = C * math.cos(math.radians(h)); b = C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    rgb = [4.0767416621*l-3.3077115913*m+0.2309699292*s,
           -1.2684380046*l+2.6097574011*m-0.3413193965*s,
           -0.0041960863*l-0.7034186147*m+1.7076147010*s]
    return all(-0.002 <= x <= 1.002 for x in rgb)

P = {
 "terraplan-light": {
  "background": [
   0.985,
   0.004,
   150
  ],
  "foreground": [
   0.22,
   0.03,
   160
  ],
  "card": [
   1,
   0,
   0
  ],
  "primary": [
   0.42,
   0.09,
   158
  ],
  "primary_fg": [
   0.985,
   0.005,
   150
  ],
  "secondary": [
   0.94,
   0.02,
   215
  ],
  "secondary_fg": [
   0.3,
   0.06,
   235
  ],
  "muted": [
   0.96,
   0.008,
   160
  ],
  "muted_fg": [
   0.48,
   0.025,
   160
  ],
  "accent": [
   0.93,
   0.035,
   160
  ],
  "accent_fg": [
   0.3,
   0.07,
   158
  ],
  "destructive": [
   0.5,
   0.19,
   27
  ],
  "destructive_fg": [
   0.985,
   0,
   0
  ],
  "success": [
   0.46,
   0.11,
   148
  ],
  "success_fg": [
   0.985,
   0,
   0
  ],
  "warning": [
   0.8,
   0.15,
   80
  ],
  "warning_fg": [
   0.28,
   0.06,
   70
  ],
  "info": [
   0.5,
   0.128,
   245
  ],
  "info_fg": [
   0.985,
   0,
   0
  ],
  "success_soft": [
   0.95,
   0.05,
   148
  ],
  "success_soft_fg": [
   0.34,
   0.09,
   148
  ],
  "warning_soft": [
   0.96,
   0.042,
   85
  ],
  "warning_soft_fg": [
   0.38,
   0.08,
   70
  ],
  "danger_soft": [
   0.95,
   0.024,
   25
  ],
  "danger_soft_fg": [
   0.42,
   0.16,
   27
  ],
  "info_soft": [
   0.95,
   0.024,
   245
  ],
  "info_soft_fg": [
   0.38,
   0.098,
   245
  ],
  "input": [
   0.62,
   0.02,
   160
  ],
  "ring": [
   0.55,
   0.1,
   158
  ],
  "chart1": [
   0.5,
   0.1,
   158
  ],
  "chart2": [
   0.55,
   0.12,
   245
  ],
  "chart3": [
   0.66,
   0.14,
   75
  ],
  "chart4": [
   0.58,
   0.14,
   40
  ],
  "chart5": [
   0.58,
   0.02,
   160
  ]
 },
 "terraplan-dark": {
  "background": [
   0.17,
   0.02,
   165
  ],
  "foreground": [
   0.96,
   0.006,
   150
  ],
  "card": [
   0.21,
   0.025,
   165
  ],
  "primary": [
   0.74,
   0.14,
   158
  ],
  "primary_fg": [
   0.17,
   0.03,
   165
  ],
  "secondary": [
   0.28,
   0.04,
   230
  ],
  "secondary_fg": [
   0.92,
   0.02,
   220
  ],
  "muted": [
   0.25,
   0.02,
   165
  ],
  "muted_fg": [
   0.72,
   0.02,
   160
  ],
  "accent": [
   0.3,
   0.05,
   160
  ],
  "accent_fg": [
   0.92,
   0.04,
   158
  ],
  "destructive": [
   0.68,
   0.19,
   25
  ],
  "destructive_fg": [
   0.17,
   0.03,
   25
  ],
  "success": [
   0.72,
   0.15,
   148
  ],
  "success_fg": [
   0.17,
   0.03,
   150
  ],
  "warning": [
   0.82,
   0.15,
   85
  ],
  "warning_fg": [
   0.22,
   0.04,
   80
  ],
  "info": [
   0.72,
   0.12,
   240
  ],
  "info_fg": [
   0.17,
   0.03,
   245
  ],
  "success_soft": [
   0.3,
   0.06,
   150
  ],
  "success_soft_fg": [
   0.88,
   0.1,
   150
  ],
  "warning_soft": [
   0.32,
   0.06,
   85
  ],
  "warning_soft_fg": [
   0.9,
   0.1,
   85
  ],
  "danger_soft": [
   0.3,
   0.07,
   25
  ],
  "danger_soft_fg": [
   0.88,
   0.062,
   25
  ],
  "info_soft": [
   0.3,
   0.06,
   245
  ],
  "info_soft_fg": [
   0.88,
   0.06,
   245
  ],
  "input": [
   0.58,
   0.025,
   165
  ],
  "ring": [
   0.65,
   0.12,
   158
  ],
  "chart1": [
   0.74,
   0.14,
   158
  ],
  "chart2": [
   0.72,
   0.12,
   240
  ],
  "chart3": [
   0.82,
   0.15,
   85
  ],
  "chart4": [
   0.72,
   0.14,
   40
  ],
  "chart5": [
   0.7,
   0.02,
   160
  ]
 }
}
P = {n: {k: tuple(v) for k, v in t.items()} for n, t in P.items()}

TEXT = [("foreground","background"),("foreground","card"),("primary_fg","primary"),
        ("secondary_fg","secondary"),("muted_fg","background"),("muted_fg","muted"),("muted_fg","card"),
        ("accent_fg","accent"),("destructive_fg","destructive"),("success_fg","success"),
        ("warning_fg","warning"),("info_fg","info"),
        ("success_soft_fg","success_soft"),("warning_soft_fg","warning_soft"),
        ("danger_soft_fg","danger_soft"),("info_soft_fg","info_soft")]
UI = [("input","background"),("input","card"),("ring","background"),("ring","card"),
      ("chart1","card"),("chart2","card"),("chart3","card"),("chart4","card"),("chart5","card"),
      ("primary","background"),("destructive","background"),("success","background"),("info","background")]
UI_EXTRA = [("spc_limit","card"),("spc_spec","card")]

fails = 0
for name, t in P.items():
    print(f"\n== {name} ==")
    for k, v in t.items():
        if not gamut_ok(v): print(f"  [gamut] {k} {v} outside sRGB (will be clipped)")
    for fg, bg in TEXT:
        if fg in t and bg in t:
            r = ratio(t[fg], t[bg]); ok = r >= 4.5
            if not ok: fails += 1
            print(f"  text {fg:16s} on {bg:13s} {r:5.2f} {'OK' if ok else 'FAIL (<4.5)'}")
    for fg, bg in UI + UI_EXTRA:
        if fg in t and bg in t:
            r = ratio(t[fg], t[bg]); ok = r >= 3.0
            if not ok: fails += 1
            print(f"  ui   {fg:16s} on {bg:13s} {r:5.2f} {'OK' if ok else 'FAIL (<3.0)'}")
print(f"\nTOTAL FAILS: {fails}")

sys.exit(1 if fails else 0)
