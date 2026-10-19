# HD_PATTERN

Key Visual Pattern 생성기. 브라우저에서 열어 패턴을 조정하고 SVG·영상(MP4)으로 저장한다.

- `index.html` + `HD_PATTERN.css` + `HD_PATTERN.js` — 소스. 정적 호스팅(Vercel, Netlify, GitHub Pages 등)에 그대로 올리면 `index.html`이 첫 화면이다.
- `HD_PATTERN.html` — 위 셋을 합친 단일 파일. 더블클릭으로 바로 열린다. 소스를 고친 뒤 `python3 build.py`로 다시 만든다.
- `FEATURE_NOTES.md` — 기능 설명.

p5.js를 cdnjs에서 불러오므로 인터넷 연결이 필요하다.
