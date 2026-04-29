import ReactDOM from 'react-dom';
import App from './app';
import { FocusStyleManager } from '@blueprintjs/core';
import { injectZIndexFixStyles } from './utils/zIndexFix';

const SIDEBAR_ID = 'logseq-memo-sidebar';
const OVERLAY_ID = 'logseq-memo-overlay';
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 500;

function waitForElement(selectors: string[], maxRetries: number, interval: number): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return resolve(el as HTMLElement);
      }
      retries++;
      if (retries >= maxRetries) return reject(new Error('Element not found: ' + selectors.join(', ')));
      setTimeout(check, interval);
    };
    check();
  });
}

function injectSidebarContainer(): HTMLElement {
  let c = document.getElementById(SIDEBAR_ID);
  if (c) return c;

  c = document.createElement('div');
  c.id = SIDEBAR_ID;
  c.style.cssText = 'padding:0 12px;margin:4px 0;';

  const sidebar = document.querySelector('.left-sidebar-inner')
    || document.querySelector('#left-sidebar')
    || document.querySelector('.cp__sidebar-left-layout')
    || document.querySelector('.left-sidebar')
    || document.body;

  sidebar.appendChild(c);
  return c;
}

function createOverlayContainer(): HTMLElement {
  let c = document.getElementById(OVERLAY_ID);
  if (c) return c;

  c = document.createElement('div');
  c.id = OVERLAY_ID;
  c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:none;';
  document.body.appendChild(c);
  return c;
}

async function main() {
  FocusStyleManager.onlyShowFocusOnTabs();
  injectZIndexFixStyles();

  try {
    await waitForElement(
      ['.left-sidebar-inner', '#left-sidebar', '.cp__sidebar-left-layout'],
      MAX_RETRIES,
      RETRY_INTERVAL
    );
  } catch {
    console.warn('[Memo] Sidebar not found, falling back to body');
  }

  const sidebarContainer = injectSidebarContainer();
  createOverlayContainer();

  ReactDOM.render(<App />, sidebarContainer);
  console.log('[Memo] Plugin loaded');
}

if (typeof logseq !== 'undefined' && logseq.ready) {
  logseq.ready(main);
} else {
  const retryCount = 0;
  const tryLogseq = () => {
    if (typeof logseq !== 'undefined' && logseq.ready) {
      logseq.ready(main);
    } else if (retryCount < 20) {
      setTimeout(tryLogseq, 500);
    } else {
      console.warn('[Memo] logseq not found, starting standalone');
      main();
    }
  };
  setTimeout(tryLogseq, 300);
}
