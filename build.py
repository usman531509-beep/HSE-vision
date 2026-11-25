"""Build the single-file "Visual HSE.html" from src/.

Inlines styles.css, data.js and app.js, and embeds the Inter variable font
(fonts/inter-latin.woff2) as base64 so the file works offline.

    python build.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "Visual HSE.html"
FONT = ROOT / "fonts" / "inter-latin.woff2"

html = (SRC / "index.html").read_text(encoding="utf-8")
css = (SRC / "styles.css").read_text(encoding="utf-8")
data_js = (SRC / "data.js").read_text(encoding="utf-8")
app_js = (SRC / "app.js").read_text(encoding="utf-8")

font_css = ""
if FONT.exists():
    b64 = base64.b64encode(FONT.read_bytes()).decode("ascii")
    font_css = (
        "@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;"
        f"src:url(data:font/woff2;base64,{b64}) format('woff2');"
        "unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
        "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}\n"
    )

import re
html = re.sub(r"<!--FONT-->.*?<!--/FONT-->", "", html, flags=re.S)
html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{font_css}{css}</style>")
html = html.replace('<script src="data.js"></script>', f"<script>\n{data_js}</script>")
html = html.replace('<script src="app.js"></script>', f"<script>\n{app_js}</script>")

OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.name}: {OUT.stat().st_size / 1024:.0f} KB")
