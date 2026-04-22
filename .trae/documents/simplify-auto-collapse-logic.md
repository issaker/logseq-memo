# 从第一性原理重写自动折叠逻辑

## 核心需求（简化为一个逻辑）

**卡片切入 → Expand 聚焦的 block；卡片切出 → Collapse all 该卡片的所有 block**

- Normal 模式：切入时 expand 该 block，切出时 collapse 该 block
- LBL 模式：切入时 expand 当前聚焦的子 block，切出时 collapse 父 block + 所有子 block
- 关闭会话 = 切出当前卡片，collapse all

## 当前 Bug

`useAutoCollapseBlocks` 在卡片切换时只调用 `collapseBlockOnPage(prevUid)` 折叠父 block，没有折叠 LBL 模式下的子 block（尤其是当前正在聚焦的那一行）。`expandedBlockUidsRef` 只记录了父 block UID，没有记录子 block。

## 修复方案

### 重写 `useAutoCollapseBlocks`

核心思路：用一个 ref 追踪当前卡片的所有 block UID（父 + 子），当卡片切换或会话关闭时，一次性 collapse all。

```typescript
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

  // 卡片切换：collapse all 上一张卡片的所有 block
  React.useEffect(() => {
    if (!enabled) return;
    const prevUid = prevCardRefUidRef.current;

    if (prevUid && prevUid !== currentCardRefUid && prevCardBlocksRef.current.length > 0) {
      const blocksToCollapse = [...prevCardBlocksRef.current];
      setTimeout(() => {
        if (!isMountedRef.current) return;
        blocksToCollapse.forEach(uid => collapseBlockOnPage(uid));
      }, 300);
    }

    // 更新 ref 为当前卡片的 blocks
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

  // 会话关闭：collapse all 当前卡片的所有 block
  React.useEffect(() => {
    if (!enabled) return;
    if (!isOpen && prevCardBlocksRef.current.length > 0) {
      const blocksToCollapse = [...prevCardBlocksRef.current];
      prevCardBlocksRef.current = [];
      setTimeout(() => {
        if (!isMountedRef.current) return;
        blocksToCollapse.forEach(uid => collapseBlockOnPage(uid));
      }, 500);
    }
  }, [enabled, isOpen]);
}
```

### 更新 PracticeOverlay 传参

重新传入 `isLineByLineActive` 和 `childUidsList`，移除不再需要的 `lineByLineIsCardComplete`。

### 不需要修改的文件

- `CardBlock.tsx`：`autoExpand` prop 逻辑正确，不需要改
- `LineByLineView.tsx`：`autoExpand={isCurrentLine || !autoCollapseBlocks}` 逻辑正确，不需要改
- `dom.ts`：`collapseBlockOnPage` 逻辑正确，不需要改

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/hooks/useAutoCollapseBlocks.ts` | 重写：追踪当前卡片所有 block，切出时 collapse all |
| `src/components/overlay/PracticeOverlay.tsx` | 更新 hook 传参：加回 `isLineByLineActive` 和 `childUidsList`，移除 `lineByLineIsCardComplete` |
