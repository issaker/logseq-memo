import ReactDOM from 'react-dom';
import App from './app';
import { FocusStyleManager } from '@blueprintjs/core';
import { injectZIndexFixStyles } from './utils/zIndexFix';

let container: HTMLElement | null = null;

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();
  injectZIndexFixStyles();

  logseq.App.registerUIItem('toolbar', {
    key: 'logseq-memo',
    title: 'Memo',
    icon: 'icon',
    template: '<div id="logseq-memo-wrapper"></div>',
  });

  container = document.getElementById('logseq-memo-wrapper');
  if (container) {
    ReactDOM.render(<App />, container);
  } else {
    console.error('Memo: Failed to find container element');
  }
}

logseq.ready(main);
