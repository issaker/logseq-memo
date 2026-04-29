/**
 * useCommandPaletteAction Hook
 *
 * Registers "Memo: Start Review Session" in Roam's command palette (Cmd+P).
 * Automatically cleans up the command on unmount.
 */
import React from 'react';
interface CommandPaletteAction {
  onShowPracticeOverlay: () => void;
}

const useCommandPaletteAction = ({ onShowPracticeOverlay }: CommandPaletteAction) => {
  React.useEffect(() => {
    const startLabel = 'Memo: Start Review Session';
    logseq.App.registerCommand('logseq-memo', {
      key: 'start-review-session',
      label: startLabel,
    }, () => onShowPracticeOverlay());

    return () => {
      logseq.App.registerCommand('logseq-memo', {
        key: 'start-review-session',
        label: startLabel,
      }, () => {});
    };
  }, [onShowPracticeOverlay]);
};

export default useCommandPaletteAction;
