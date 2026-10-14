// 글 목록과 본문을 불러오는 모듈

const POSTS_DIR = 'posts';
let postListCache = null;

// '---'로 감싼 front matter를 { meta, content }로 분리
export function parseFrontMatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, content: normalized };
  }

  const meta = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    meta[pair[1]] = parseValue(pair[2].trim());
  }
  return { meta, content: normalized.slice(match[0].length) };
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function parseValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map((item) => unquote(item.trim())).filter(Boolean);
  }
  return unquote(value);
}

export async function getPostList() {
  if (postListCache) return postListCache;

  const response = await fetch(`${POSTS_DIR}/index.json`);
  if (!response.ok) {
    throw new Error(`글 목록을 불러오지 못했습니다. (${response.status})`);
  }
  const posts = await response.json();
  postListCache = posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return postListCache;
}

export async function getPost(slug) {
  if (!/^[\w-]+$/.test(slug)) {
    throw new Error('잘못된 글 주소입니다.');
  }

  const response = await fetch(`${POSTS_DIR}/${slug}.md`);
  if (!response.ok) {
    throw new Error(response.status === 404 ? '글을 찾을 수 없습니다.' : `글을 불러오지 못했습니다. (${response.status})`);
  }
  return parseFrontMatter(await response.text());
}
