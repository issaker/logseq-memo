import * as React from 'react';
import { collapseBlockOnPage } from '~/utils/dom';

interface UseAutoCollapseBlocksInput {
  enabled: boolean;
  currentCardRefUid: string | undefined;
  isLineByLineActive: boolean;
  childUidsList: string[];
  isOpen: boolean;
}

export default function useAutoCollapseBlocks({
  enabled,
  currentCardRefUid,
  isLineByLineActive,
  childUidsList,
  isOpen,
}: UseAutoCollapseBlocksInput) {
  const prevCardBlocksRef = React.useRef<string[]>([]);
  const prevCardRefUidRef = React.useRef<string | undefined>();
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const prevUid = prevCardRefUidRef.current;

    if (prevUid && prevUid !== currentCardRefUid && prevCardBlocksRef.current.length > 0) {
      const blocksToCollapse = [...prevCardBlocksRef.current];
      setTimeout(() => {
        if (!isMountedRef.current) return;
        blocksToCollapse.forEach((uid) => collapseBlockOnPage(uid));
      }, 300);
    }

    prevCardRefUidRef.current = currentCardRefUid;
    if (currentCardRefUid) {
      const blocks = [currentCardRefUid];
      if (isLineByLineActive) {
        blocks.push(...childUidsList);
      }
      prevCardBlocksRef.current = blocks;
    } else {
      prevCardBlocksRef.current = [];
    }
  }, [enabled, currentCardRefUid, isLineByLineActive, childUidsList]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!isOpen && prevCardBlocksRef.current.length > 0) {
      const blocksToCollapse = [...prevCardBlocksRef.current];
      prevCardBlocksRef.current = [];
      setTimeout(() => {
        if (!isMountedRef.current) return;
        blocksToCollapse.forEach((uid) => collapseBlockOnPage(uid));
      }, 500);
    }
  }, [enabled, isOpen]);
}
