// 마크다운 → HTML 변환기 (외부 의존성 없음)

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// 블록 문법 판별용 정규식
const FENCE_RE = /^\s*(```|~~~)\s*([\w+-]*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

// 허용하는 링크 스킴 (상대 경로와 #앵커는 항상 허용)
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

function sanitizeUrl(url) {
  const cleaned = url.replace(/[\u0000-\u001f\s]/g, '');
  const scheme = cleaned.match(/^([a-z][a-z0-9+.-]*:)/i);
  if (scheme && !SAFE_SCHEMES.includes(scheme[1].toLowerCase())) {
    return '#';
  }
  return cleaned;
}

function isExternal(url) {
  return /^https?:/i.test(url);
}

// ---------- 인라인 문법 ----------

function renderInline(raw) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;

  let text = escapeHtml(raw);

  // 1) 인라인 코드: 내부는 다른 문법을 적용하지 않음
  text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => keep(`<code>${code.trim()}</code>`));

  // 2) 이미지
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) =>
    keep(`<img src="${sanitizeUrl(url)}" alt="${alt}" loading="lazy">`));

  // 3) 링크: 링크 글자에는 강조 문법을 적용
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = sanitizeUrl(url);
    const attrs = isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return keep(`<a href="${href}"${attrs}>${applyEmphasis(label)}</a>`);
  });

  text = applyEmphasis(text);

  // 줄 끝 공백 두 칸 또는 역슬래시는 줄바꿈
  text = text.replace(/( {2,}|\\)\n/g, '<br>\n');

  // 보관해 둔 조각 복원 (중첩된 경우를 위해 반복)
  while (/\u0000\d+\u0000/.test(text)) {
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
  }
  return text;
}

function applyEmphasis(text) {
  return text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
}

// ---------- 블록 문법 ----------

function indentOf(line) {
  return line.match(/^\s*/)[0].replace(/\t/g, '    ').length;
}

function isBlank(line) {
  return line.trim() === '';
}

function isTableStart(lines, i) {
  return lines[i].includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-');
}

function startsBlock(lines, i) {
  const line = lines[i];
  return FENCE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line) ||
    QUOTE_RE.test(line) || LIST_RE.test(line) || isTableStart(lines, i);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function renderTable(lines) {
  const header = splitRow(lines[0]);
  const aligns = splitRow(lines[1]).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    if (cell.startsWith(':')) return 'left';
    return '';
  });
  const cell = (tag, text, idx) => {
    const align = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : '';
    return `<${tag}${align}>${renderInline(text)}</${tag}>`;
  };
  const head = `<tr>${header.map((text, idx) => cell('th', text, idx)).join('')}</tr>`;
  const body = lines.slice(2).map((line) => {
    const cells = splitRow(line);
    return `<tr>${header.map((_, idx) => cell('td', cells[idx] || '', idx)).join('')}</tr>`;
  }).join('\n');
  return `<div class="table-wrap"><table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`;
}

// 목록 블록을 들여쓰기 기준으로 항목별로 나눈 뒤 재귀적으로 렌더링
function renderList(lines) {
  const first = lines[0].match(LIST_RE);
  const baseIndent = indentOf(lines[0]);
  const ordered = /\d/.test(first[2]);
  const items = [];

  for (const line of lines) {
    const m = line.match(LIST_RE);
    if (m && indentOf(line) <= baseIndent + 1) {
      items.push({ text: m[3], children: [] });
    } else if (items.length) {
      items[items.length - 1].children.push(line);
    }
  }

  const itemsHtml = items.map(({ text, children }) => {
    const rest = children.filter((line) => !isBlank(line));
    let inner = renderInline(text);
    if (rest.length) {
      const minIndent = Math.min(...rest.map(indentOf));
      const dedented = children.map((line) => line.replace(/\t/g, '    ').slice(Math.min(minIndent, indentOf(line))));
      // 하위 목록이 아니면 같은 항목의 이어지는 문장으로 처리
      if (LIST_RE.test(dedented.find((line) => !isBlank(line)))) {
        inner += '\n' + parseMarkdown(dedented.join('\n'));
      } else {
        inner += ' ' + renderInline(rest.map((line) => line.trim()).join('\n'));
      }
    }
    return `<li>${inner}</li>`;
  }).join('\n');

  const tag = ordered ? 'ol' : 'ul';
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const start = ordered && startNum !== 1 ? ` start="${startNum}"` : '';
  return `<${tag}${start}>\n${itemsHtml}\n</${tag}>`;
}

export function parseMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i++;
      continue;
    }

    // 코드 블록
    const fence = line.match(FENCE_RE);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        code.push(lines[i]);
        i++;
      }
      i++; // 닫는 펜스 건너뛰기
      const lang = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : '';
      out.push(`<pre><code${lang}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // 수평선
    if (HR_RE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 인용문: '>'를 떼어낸 뒤 내부를 다시 마크다운으로 파싱
    if (QUOTE_RE.test(line)) {
      const quote = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quote.push(lines[i].match(QUOTE_RE)[1]);
        i++;
      }
      out.push(`<blockquote>\n${parseMarkdown(quote.join('\n'))}\n</blockquote>`);
      continue;
    }

    // 표
    if (isTableStart(lines, i)) {
      const rows = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) {
        rows.push(lines[i]);
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    // 목록: 목록 항목과 들여쓴 줄을 하나의 블록으로 모음
    if (LIST_RE.test(line)) {
      const block = [];
      while (i < lines.length) {
        const current = lines[i];
        if (LIST_RE.test(current) || (!isBlank(current) && indentOf(current) > 0)) {
          block.push(current);
          i++;
        } else if (isBlank(current) && i + 1 < lines.length &&
          (LIST_RE.test(lines[i + 1]) || indentOf(lines[i + 1]) > 0) && !isBlank(lines[i + 1])) {
          block.push(current);
          i++;
        } else {
          break;
        }
      }
      out.push(renderList(block));
      continue;
    }

    // 문단: 빈 줄이나 다른 블록이 나올 때까지
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && (para.length === 0 || !startsBlock(lines, i))) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(para.join('\n'))}</p>`);
  }

  return out.join('\n');
}
