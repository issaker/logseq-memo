import * as React from 'react';
import { collapseBlockOnPage } from '~/utils/dom';

interface UseAutoCollapseBlocksInput {
  enabled: boolean;
  currentCardRefUid: string | undefined;
  isLineByLineActive: boolean;
  childUidsList: string[];
}

export default function useAutoCollapseBlocks({
  enabled,
  currentCardRefUid,
  isLineByLineActive,
  childUidsList,
}: UseAutoCollapseBlocksInput) {
  const currentCardBlocksRef = React.useRef<string[]>([]);
  const prevCardRefUidRef = React.useRef<string | undefined>();

  React.useEffect(() => {
    if (!enabled) return;

    const prevUid = prevCardRefUidRef.current;
    if (prevUid && prevUid !== currentCardRefUid && currentCardBlocksRef.current.length > 0) {
      const blocksToCollapse = [...currentCardBlocksRef.current];
      setTimeout(() => {
        blocksToCollapse.forEach((uid) => collapseBlockOnPage(uid));
      }, 300);
    }

    prevCardRefUidRef.current = currentCardRefUid;
    if (currentCardRefUid) {
      const blocks = [currentCardRefUid];
      if (isLineByLineActive) {
        blocks.push(...childUidsList);
      }
      currentCardBlocksRef.current = blocks;
    } else {
      currentCardBlocksRef.current = [];
    }
  }, [enabled, currentCardRefUid, isLineByLineActive, childUidsList]);

  React.useEffect(() => {
    if (!enabled) return;
    return () => {
      currentCardBlocksRef.current.forEach((uid) => collapseBlockOnPage(uid));
    };
  }, [enabled]);
}
