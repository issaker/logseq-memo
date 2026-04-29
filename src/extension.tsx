/**
 * logseq-memo entry — keep handshake fast.
 * Strategy: register immediately inside logseq.ready(), load App asynchronously.
 */
import ReactDOM from 'react-dom';
import React from 'react';
import App from './app';

const SIDEBAR_ID = 'logseq-memo-sidebar';
const OVERLAY_ID = 'logseq-memo-overlay';
const BANNER_ID = 'logseq-memo-debug';

let _bannerEl: HTMLElement | null = null;
function ensureBanner(): HTMLElement {
  if (_bannerEl) return _bannerEl;
  const el = document.createElement('div');
  el.id = BANNER_ID;
  el.style.cssText =
    'position:fixed;bottom:10px;right:10px;z-index:99999;padding:6px 10px;' +
    'border-radius:4px;font:12px monospace;color:#fff;display:none;';
  document.body.appendChild(el);
  _bannerEl = el;
  return el;
}
function dbg(msg: string, color: string) {
  console.log('[Memo]', msg);
  const el = ensureBanner();
  el.style.background = color;
  el.style.display = 'block';
  el.textContent = 'Memo: ' + msg;
}

// ============================================================
// logseq.ready — called synchronously, must be FAST
// ============================================================
logseq.ready(() => {
  dbg(
    'OK | React=' + (typeof React !== 'undefined') + ' R=' + (typeof ReactDOM !== 'undefined'),
    '#388e3c'
  );

  // Inject overlay container (inert until App renders into it)
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);
  }

  // Inject sidebar container
  let c = document.getElementById(SIDEBAR_ID);
  if (!c) {
    const sidebar =
      document.querySelector('.left-sidebar-inner') ||
      document.querySelector('#left-sidebar') ||
      document.querySelector('.cp__sidebar-left-layout') ||
      document.body;
    c = document.createElement('div');
    c.id = SIDEBAR_ID;
    c.style.cssText = 'padding:0 12px;margin:4px 0;';
    sidebar.appendChild(c);
  }

  // Render App — this reads settings/queries which may be slow,
  // but ReactDOM.render() returns immediately (non-blocking)
  try {
    ReactDOM.render(React.createElement(App), c);
    dbg('App rendered', '#388e3c');
  } catch (e: any) {
    dbg('Render ERR: ' + e.message, '#d32f2f');
  }

  // Hide banner after 4s
  setTimeout(() => {
    if (_bannerEl) _bannerEl.style.display = 'none';
  }, 4000);
});
