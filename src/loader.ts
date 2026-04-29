/**
 * loader.ts — Minimal Logseq plugin loader.
 *
 * This file MUST complete execution in <100ms to satisfy Logseq's
 * handshake timeout. All heavy logic (Blueprint, App, hooks) lives
 * in app-chunk.js, loaded asynchronously via <script> tag.
 */
import ReactDOM from 'react-dom';
import React from 'react';

declare var logseq: any;
declare var __webpack_public_path__: string;

var DIAG: string[] = [];

function diag(msg: string) {
  DIAG.push(new Date().toISOString().slice(11, 19) + ' ' + msg);
  console.log('[Memo]', msg);
}

function flushDiag() {
  var el = document.getElementById('logseq-memo-diag');
  if (!el) {
    el = document.createElement('pre');
    el.id = 'logseq-memo-diag';
    el.style.cssText =
      'position:fixed;bottom:4px;right:4px;z-index:99999;max-width:400px;' +
      'padding:6px 8px;border-radius:3px;font:10px/1.4 monospace;color:#fff;' +
      'background:rgba(0,0,0,0.85);pointer-events:none;overflow:hidden;';
    document.body.appendChild(el);
  }
  el.textContent = DIAG.join('\n');
}

diag('loader executing');

function injectContainers() {
  var sidebar = document.querySelector('.left-sidebar-inner')
    || document.querySelector('#left-sidebar')
    || document.body;

  var c = document.createElement('div');
  c.id = 'logseq-memo-sidebar';
  c.style.cssText = 'padding:0 12px;margin:4px 0;';
  sidebar.appendChild(c);
  diag('containers created');

  var overlay = document.createElement('div');
  overlay.id = 'logseq-memo-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  document.body.appendChild(overlay);

  return c;
}

function getPluginDir(): string {
  // Strategy 1: __webpack_public_path__ set by webpack
  if (typeof __webpack_public_path__ === 'string' && __webpack_public_path__) {
    diag('base=webpackPP=' + __webpack_public_path__.slice(-40));
    return __webpack_public_path__;
  }

  // Strategy 2: document.currentScript (if loaded via <script src>)
  try {
    var cs = (document as any).currentScript as HTMLScriptElement | null;
    if (cs && cs.src) {
      var b = cs.src.replace(/[^/]*$/, '');
      diag('base=currentScript=' + b.slice(-40));
      return b;
    }
  } catch (e) { /* ignore */ }

  // Strategy 3: Fallback — try relative path
  diag('base=fallback=""');
  return '';
}

function loadAppChunk(sidebarContainer: HTMLElement) {
  var base = getPluginDir();
  var chunkUrl = base + 'app-chunk.js';
  diag('loading ' + chunkUrl.slice(-50));

  var script = document.createElement('script');
  script.src = chunkUrl;
  script.onload = function () {
    diag('chunk loaded');
    var App = (window as any).__logseqMemoApp;
    if (!App) {
      diag('App NOT found on window');
      flushDiag();
      return;
    }
    try {
      ReactDOM.render(React.createElement(App), sidebarContainer);
      diag('render OK');
    } catch (e: any) {
      diag('render ERR: ' + e.message);
    }
    flushDiag();
  };
  script.onerror = function () {
    diag('chunk load FAILED ' + chunkUrl.slice(-50));
    flushDiag();
  };
  document.head.appendChild(script);
}

logseq.ready(function () {
  diag('ready callback');
  var c = injectContainers();

  // Small delay to let Logseq settle, then load App
  setTimeout(function () {
    diag('loading app now');
    flushDiag();
    loadAppChunk(c);
  }, 300);
});
