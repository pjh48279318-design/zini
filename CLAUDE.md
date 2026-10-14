# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code가 따라야 할 지침입니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어 블로그 웹사이트로 보여주는 정적 사이트입니다.
**프레임워크와 빌드 도구 없이** 순수 HTML, CSS, JavaScript만으로 구현합니다.
모바일을 우선으로 설계하며, 데스크톱에서도 잘 보여야 합니다.

- **블로그 주제**: 지브리 스튜디오와 작곡가·피아니스트 히사이시 조 소개 (블로그 이름: "바람이 지나간 자리")
- **디자인**: 자연·수채화 느낌 (하늘색, 숲 초록, 크림 배경). 색상은 `css/style.css`의 `:root` 변수로 관리합니다.
- **이미지 정책**: 지브리 공식 이미지, 영화 장면, 인물 사진 등 저작권이 있는 이미지는 사용하지 않습니다. CSS 그라데이션과 이모지로 꾸밉니다. 가사나 대사도 길게 인용하지 않습니다.

## 기술 원칙

- **바닐라만 사용**: React, Vue, Svelte, jQuery, Tailwind, Bootstrap 등 프레임워크·UI 라이브러리를 쓰지 않습니다.
- **빌드 단계 없음**: npm, 번들러, 트랜스파일러 없이 브라우저에서 그대로 실행되어야 합니다.
- **외부 의존성 최소화**: 마크다운 파서도 직접 구현합니다(`js/markdown.js`). 꼭 필요하면 사용자에게 먼저 묻습니다.
- **모던 표준 문법**: ES Modules(`<script type="module">`), `fetch`, `async/await`, CSS 변수, Flexbox/Grid를 사용합니다.

## 디렉터리 구조

```
blog/
├── index.html          # 단일 진입점 (SPA)
├── css/
│   └── style.css       # 전체 스타일 (모바일 우선)
├── js/
│   ├── app.js          # 초기화, 라우팅, 화면 렌더링
│   ├── markdown.js     # 마크다운 → HTML 변환기
│   └── posts.js        # 글 목록/본문 로딩, front matter 파싱
├── posts/
│   ├── index.json      # 글 목록 매니페스트
│   └── *.md            # 블로그 글
└── images/             # 글에서 참조하는 이미지
```

## 동작 방식

1. `posts/index.json`에서 글 목록을 불러옵니다. 정적 사이트는 폴더 목록을 읽을 수 없으므로 **새 글을 추가하면 이 파일에도 반드시 등록**해야 합니다.
   ```json
   [
     { "slug": "studio-ghibli", "title": "지브리 스튜디오 이야기", "date": "2026-10-05", "tags": ["지브리"], "emoji": "🌳", "summary": "한 줄 요약" }
   ]
   ```
2. 해시 기반 라우팅을 사용합니다. 서버 설정 없이 GitHub Pages 등 어디서나 동작합니다.
   - `#/` → 글 목록 (최신순)
   - `#/post/<slug>` → `posts/<slug>.md`를 fetch하여 렌더링
   - `#/tag/<태그>` → 태그별 목록
3. 각 `.md` 파일 맨 위에는 YAML 형식의 front matter를 둡니다.
   ```markdown
   ---
   title: 지브리 스튜디오 이야기
   date: 2026-10-05
   tags: [지브리, 스튜디오]
   emoji: 🌳
   summary: 한 줄 요약
   ---

   본문...
   ```
   `emoji`는 목록 카드와 글 머리에 아이콘으로 표시됩니다. front matter 값이 `index.json`보다 우선합니다.

## 마크다운 파서 지원 범위

`js/markdown.js`는 최소한 다음을 지원해야 합니다.

- 제목(`#`~`######`), 문단, 줄바꿈
- 굵게, 기울임, 취소선, 인라인 코드
- 링크, 이미지
- 순서/비순서 목록 (중첩 포함)
- 인용문(`>`), 수평선(`---`)
- 펜스 코드 블록(```` ``` ````, 언어 클래스 `language-xxx` 부여)
- 표(GFM 테이블)

**보안**: 마크다운 원문의 HTML 특수문자(`< > & " '`)는 반드시 이스케이프하고, 링크의 `javascript:` 스킴은 차단합니다. 렌더링 결과를 `innerHTML`에 넣기 전에 이 처리가 되어 있어야 합니다.

## 반응형 / 모바일 가이드

- `index.html`에 `<meta name="viewport" content="width=device-width, initial-scale=1">`를 반드시 포함합니다.
- **모바일 우선**: 기본 스타일은 좁은 화면 기준으로 작성하고, `@media (min-width: 768px)` 등으로 넓은 화면을 확장합니다.
- 본문 최대 폭은 약 `720px`(`max-width: 72ch` 정도)로 제한해 가독성을 유지합니다.
- 좌우 여백은 모바일에서 최소 `16px`.
- 기본 글자 크기 `16px` 이상, 줄간격 `1.7` 내외 (한글 가독성 고려).
- 터치 대상(링크·버튼)은 최소 `44×44px`.
- 가로 스크롤이 생기지 않아야 합니다. 단, 코드 블록과 표는 자체적으로 `overflow-x: auto` 처리합니다.
- 이미지는 `max-width: 100%; height: auto;`.
- 긴 URL 등은 `overflow-wrap: anywhere;`로 줄바꿈합니다.
- 색상은 CSS 변수로 정의하고 `prefers-color-scheme: dark`로 다크 모드를 지원합니다.
- 폰트: 시스템 폰트 스택 사용 (`-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif` 등).

## 로컬 실행

`fetch`는 `file://` 경로에서 동작하지 않으므로 반드시 로컬 서버로 실행합니다.

```bash
python -m http.server 8000
```

그 후 브라우저에서 `http://localhost:8000` 접속. (VS Code의 Live Server 확장도 가능)

모바일 확인은 브라우저 개발자 도구의 기기 모드(375px 폭 등)로 점검합니다.

## 코딩 컨벤션

- 들여쓰기 2칸, 세미콜론 사용, 문자열은 작은따옴표.
- 변수/함수는 `camelCase`, CSS 클래스는 `kebab-case`.
- 전역 변수를 만들지 않고 ES 모듈의 `import`/`export`로 기능을 나눕니다.
- 시맨틱 HTML(`header`, `main`, `article`, `nav`, `time`, `footer`)을 사용하고, 이미지에는 `alt`를 넣습니다.
- 글 로딩 실패 시 사용자에게 보이는 오류 메시지와 목록으로 돌아가는 링크를 표시합니다.
- 주석과 UI 문구는 한국어로 작성합니다.
