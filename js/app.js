// 앱 초기화, 해시 라우팅, 화면 렌더링

import { parseMarkdown, escapeHtml } from './markdown.js';
import { getPostList, getPost } from './posts.js';

const SITE_TITLE = '바람이 지나간 자리';
const app = document.getElementById('app');

// 빠르게 페이지를 이동했을 때 이전 요청 결과가 화면을 덮어쓰지 않도록 하는 번호
let renderId = 0;

function formatDate(date) {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return escapeHtml(date || '');
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

function tagHref(tag) {
  return `#/tag/${encodeURIComponent(tag)}`;
}

function renderTags(tags = []) {
  if (!tags.length) return '';
  const items = tags.map((tag) => `<li><a class="tag" href="${tagHref(tag)}">#${escapeHtml(tag)}</a></li>`).join('');
  return `<ul class="tag-list" aria-label="태그">${items}</ul>`;
}

function renderPostCard(post) {
  return `
    <article class="post-card">
      <div class="post-card-emoji" aria-hidden="true">${escapeHtml(post.emoji || '🍃')}</div>
      <h2 class="post-card-title">
        <a href="#/post/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
      </h2>
      <time class="post-date" datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
      <p class="post-card-summary">${escapeHtml(post.summary || '')}</p>
      ${renderTags(post.tags)}
    </article>`;
}

function setView(html, title) {
  app.innerHTML = html;
  document.title = title ? `${title} | ${SITE_TITLE}` : SITE_TITLE;
}

function showLoading() {
  app.innerHTML = '<p class="status" role="status">불러오는 중…</p>';
}

function showError(message) {
  setView(`
    <section class="status status-error" role="alert">
      <div class="status-emoji" aria-hidden="true">🌧️</div>
      <p>${escapeHtml(message)}</p>
      <a class="button" href="#/">목록으로 돌아가기</a>
    </section>`, '오류');
}

async function showList(tag) {
  const id = ++renderId;
  showLoading();
  const posts = await getPostList();
  if (id !== renderId) return;

  const filtered = tag ? posts.filter((post) => (post.tags || []).includes(tag)) : posts;
  const heading = tag
    ? `<div class="list-heading"><h1>#${escapeHtml(tag)}</h1><a class="button button-ghost" href="#/">전체 글 보기</a></div>`
    : '<h1 class="visually-hidden">전체 글</h1>';
  const cards = filtered.length
    ? `<div class="post-grid">${filtered.map(renderPostCard).join('')}</div>`
    : '<p class="status">이 태그의 글이 아직 없습니다.</p>';

  setView(heading + cards, tag ? `#${tag}` : '');
}

async function showPost(slug) {
  const id = ++renderId;
  showLoading();
  const [{ meta, content }, posts] = await Promise.all([getPost(slug), getPostList()]);
  if (id !== renderId) return;

  const index = posts.findIndex((post) => post.slug === slug);
  const info = { ...(posts[index] || {}), ...meta };
  // 목록은 최신순이므로 index - 1이 다음(더 최근) 글
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const navLink = (post, label, cls) => post
    ? `<a class="post-nav-link ${cls}" href="#/post/${encodeURIComponent(post.slug)}"><span>${label}</span>${escapeHtml(post.title)}</a>`
    : '<span></span>';

  setView(`
    <article class="post">
      <header class="post-header">
        <div class="post-emoji" aria-hidden="true">${escapeHtml(info.emoji || '🍃')}</div>
        <h1 class="post-title">${escapeHtml(info.title || slug)}</h1>
        <time class="post-date" datetime="${escapeHtml(info.date || '')}">${formatDate(info.date)}</time>
        ${renderTags(info.tags)}
      </header>
      <div class="post-content">${parseMarkdown(content)}</div>
    </article>
    <nav class="post-nav" aria-label="다른 글">
      ${navLink(older, '← 이전 글', 'prev')}
      ${navLink(newer, '다음 글 →', 'next')}
    </nav>
    <p class="back-link"><a class="button button-ghost" href="#/">목록으로</a></p>`, info.title);
}

async function router() {
  const path = location.hash.replace(/^#/, '') || '/';
  const [, section, param] = path.split('/');

  try {
    if (section === 'post' && param) {
      await showPost(decodeURIComponent(param));
    } else if (section === 'tag' && param) {
      await showList(decodeURIComponent(param));
    } else if (!section) {
      await showList();
    } else {
      throw new Error('페이지를 찾을 수 없습니다.');
    }
  } catch (error) {
    showError(error.message);
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
router();
