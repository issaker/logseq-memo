import * as React from 'react';
import { collapseBlockOnPage } from '~/utils/dom';

interface UseAutoCollapseBlocksInput {
  enabled: boolean;
  currentCardRefUid: string | undefined;
  isOpen: boolean;
}

export default function useAutoCollapseBlocks({
  enabled,
  currentCardRefUid,
  isOpen,
}: UseAutoCollapseBlocksInput) {
  const prevCardRefUidRef = React.useRef<string | undefined>();
  const prevIsOpenRef = React.useRef(true);

  React.useEffect(() => {
    if (!enabled) return;
    const prevUid = prevCardRefUidRef.current;
    prevCardRefUidRef.current = currentCardRefUid;
    if (prevUid && prevUid !== currentCardRefUid) {
      setTimeout(() => collapseBlockOnPage(prevUid), 300);
    }
  }, [enabled, currentCardRefUid]);

  React.useEffect(() => {
    if (!enabled) return;
    if (prevIsOpenRef.current && !isOpen && currentCardRefUid) {
      setTimeout(() => collapseBlockOnPage(currentCardRefUid), 300);
    }
    prevIsOpenRef.current = isOpen;
  }, [enabled, isOpen, currentCardRefUid]);
}
