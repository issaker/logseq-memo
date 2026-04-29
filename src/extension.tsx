import ReactDOM from 'react-dom';
import React from 'react';

const SIDEBAR_ID = 'logseq-memo-sidebar';
const BANNER_ID = 'logseq-memo-debug';

function banner(msg: string, color: string) {
  const el = document.getElementById(BANNER_ID);
  if (el) el.textContent = msg;
  console.log('[Memo]', msg);
}

function ensureDebugBanner() {
  let el = document.getElementById(BANNER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:99999;padding:6px 10px;border-radius:4px;font:12px monospace;color:#fff;background:#d32f2f;';
    document.body.appendChild(el);
  }
  el.textContent = 'Memo: loading...';
  el.style.display = 'block';
  return el;
}

// =========== STEP 0: Script loaded ===========
ensureDebugBanner();
banner('STEP0: extension.js executing', '#f57c00');

// =========== STEP 1: Check globals ===========
const logseqOk = typeof logseq !== 'undefined';
const reactOk = typeof React !== 'undefined';
const reactDomOk = typeof ReactDOM !== 'undefined';

banner(
  'STEP1: logseq=' + logseqOk +
  ' React=' + reactOk +
  ' ReactDOM=' + reactDomOk,
  logseqOk ? '#388e3c' : '#d32f2f'
);

// =========== STEP 2: Check logseq.ready ===========
if (!logseqOk) {
  banner('FATAL: no logseq global', '#d32f2f');
} else if (typeof logseq.ready !== 'function') {
  banner('FATAL: logseq.ready not a function, type=' + typeof logseq.ready, '#d32f2f');
} else {
  banner('STEP2: calling logseq.ready()', '#f57c00');

  logseq.ready(() => {
    banner('STEP3: logseq.ready callback FIRED!', '#388e3c');

    try {
      const sidebar =
        document.querySelector('.left-sidebar-inner') ||
        document.querySelector('#left-sidebar') ||
        document.querySelector('.cp__sidebar-left-layout') ||
        document.querySelector('.left-sidebar');

      if (!sidebar) {
        banner('STEP4: No sidebar DOM found', '#d32f2f');
        return;
      }

      banner('STEP4: sidebar found: ' + sidebar.className.substring(0, 40), '#388e3c');

      // Inject sidebar widget
      let c = document.getElementById(SIDEBAR_ID);
      if (!c) {
        c = document.createElement('div');
        c.id = SIDEBAR_ID;
        c.style.cssText = 'padding:0 12px;margin:4px 0;';
        sidebar.appendChild(c);
      }

      // Inject overlay container
      let overlay = document.getElementById('logseq-memo-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'logseq-memo-overlay';
        overlay.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:none;';
        document.body.appendChild(overlay);
      }

      // Render just the SidePanelWidget entry point — App will mount itself
      ReactDOM.render(
        React.createElement('div', {
          style: {
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--ls-primary-text-color, #d8e1e8)',
            padding: '6px 8px',
            borderRadius: '4px',
            background: 'var(--ls-secondary-background-color, #30404d)',
          },
          onClick: () => alert('[Memo] SidePanel clicked — App not loaded yet'),
          children: [
            React.createElement('span', { key: 'icon' }, '📝'),
            React.createElement('span', { key: 'text' }, 'Memo Review'),
          ],
        }),
        c
      );

      banner('STEP5: Widget injected SUCCESS', '#388e3c');

      // Hide banner after 5s
      setTimeout(() => {
        const el = document.getElementById(BANNER_ID);
        if (el) el.style.display = 'none';
      }, 5000);
    } catch (err: any) {
      banner('ERROR: ' + err.message, '#d32f2f');
      console.error('[Memo]', err);
    }
  });

  banner('STEP2b: logseq.ready() registered', '#f57c00');
}
