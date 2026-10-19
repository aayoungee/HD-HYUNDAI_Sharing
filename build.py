# index.html + HD_PATTERN.css + HD_PATTERN.js 를 파일 하나(HD_PATTERN.html)로 합친다.
# 실행: python3 build.py
import pathlib

root = pathlib.Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "HD_PATTERN.css").read_text(encoding="utf-8")
js = (root / "HD_PATTERN.js").read_text(encoding="utf-8")

style_tag = '<link rel="stylesheet" href="HD_PATTERN.css">'
script_tag = '<script src="HD_PATTERN.js"></script>'
assert style_tag in html and script_tag in html, "index.html의 CSS/JS 태그를 찾지 못했습니다."

html = html.replace(style_tag, "<style>\n" + css + "</style>")
html = html.replace(script_tag, "<script>\n" + js + "</script>")
(root / "HD_PATTERN.html").write_text(html, encoding="utf-8")
print("built", root / "HD_PATTERN.html")
