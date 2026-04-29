import ReactDOM from 'react-dom';
import App from './app';
import { FocusStyleManager } from '@blueprintjs/core';
import { injectZIndexFixStyles } from './utils/zIndexFix';

const MEMO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();
  injectZIndexFixStyles();

  // Create a fixed overlay container for the entire App (overlay needs full viewport)
  const root = document.createElement('div');
  root.id = 'logseq-memo-root';
  root.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  document.body.appendChild(root);

  ReactDOM.render(<App />, root);

  // Register toolbar button — template with inline onclick calls window bridge
  logseq.App.registerUIItem('toolbar', {
    key: 'logseq-memo',
    title: 'Memo Review',
    icon: MEMO_ICON,
    template: `<button onclick="window.__logseqMemoToggle && window.__logseqMemoToggle()" class="ui__toolbar-item" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:4px;border:none;background:transparent;cursor:pointer;border-radius:4px;color:var(--ls-primary-text-color,inherit);" title="Memo Review (spaced repetition)">${MEMO_ICON}</button>`,
  });
}

logseq.ready(main);
