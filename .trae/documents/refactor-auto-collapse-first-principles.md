# 从第一性原理重新实现自动折叠功能

## 根因分析

`updateBlock({open: false})` 对 `open` 属性无效（Roam API 的 `updateBlock` 只支持更新 `string`），导致整个折叠链路断裂：
- `useAutoCollapseBlocks` 调用 `collapseBlockOnPage` → 无效
- CardBlock `autoExpand=false` 路径调用 `updateBlock({open: false})` → 无效

## 第一性原理

用户需求只有一条逻辑：
- **卡片切入 → Expand 聚焦的 block**
- **卡片切出 → Collapse all 该卡片的所有 block**

实现方式：**用 DOM 模拟点击 caret**，这是项目中已验证可靠的方式（CardBlock 展开就是用 `simulateMouseClick`）。

## 实现方案

### Step 1: 重写 `collapseBlockOnPage` → 改为 `collapseAllBlockOnPage`

**文件: `src/utils/dom.ts`**

用 DOM 模拟点击实现 "Collapse all"：
1. 通过 `textarea[id="${uid}"]` 在 Roam 页面上找到 block（排除 overlay 内的）
2. 找到 block 容器内所有 `.rm-caret-open`（展开状态的 caret）
3. 从最深到最浅依次点击，实现递归折叠所有子 block
4. 最后点击父 block 自身的 caret

```typescript
export const collapseAllBlockOnPage = (uid: string) => {
  const textareas = Array.from(document.querySelectorAll(`textarea[id="${uid}"]`));
  for (const textarea of textareas) {
    if (textarea.closest('[role="dialog"]')) continue;
    const blockContainer = textarea.closest('.rm-block-container');
    if (!blockContainer) continue;
    const openCarets = Array.from(blockContainer.querySelectorAll('.rm-caret-open')).reverse();
    for (const caret of openCarets) {
      simulateMouseClick(caret);
    }
    break;
  }
};
```

### Step 2: 修复 CardBlock `autoExpand=false` 路径

**文件: `src/components/overlay/CardBlock.tsx`**

将 `updateBlock({open: false})` 替换为 DOM 模拟点击 caret：

```typescript
// 之前（无效）:
} else if (!autoExpandRef.current && !isCollapsed) {
  await window.roamAlphaAPI.updateBlock({
    block: { uid: currentRefUid, open: false },
  });
}

// 之后（可靠）:
} else if (!autoExpandRef.current && !isCollapsed) {
  const collapseControlBtn = ref.current.querySelector('.block-expand .rm-caret-open')
    || ref.current.querySelector('.rm-caret-open');
  if (collapseControlBtn) {
    domUtils.simulateMouseClick(collapseControlBtn);
  }
}
```

### Step 3: 简化 `useAutoCollapseBlocks`

**文件: `src/hooks/useAutoCollapseBlocks.ts`**

简化为只做两件事：
1. 卡片切换时：对前一张卡片调用 `collapseAllBlockOnPage`
2. Overlay 关闭时：对当前卡片调用 `collapseAllBlockOnPage`

移除所有不必要的逻辑（`expandedBlockUidsRef`、`lineByLineIsCardComplete` 等）：

```typescript
import * as React from 'react';
import { collapseAllBlockOnPage } from '~/utils/dom';

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
      setTimeout(() => collapseAllBlockOnPage(prevUid), 300);
    }
  }, [enabled, currentCardRefUid]);

  React.useEffect(() => {
    if (!enabled) return;
    if (prevIsOpenRef.current && !isOpen && currentCardRefUid) {
      setTimeout(() => collapseAllBlockOnPage(currentCardRefUid), 300);
    }
    prevIsOpenRef.current = isOpen;
  }, [enabled, isOpen, currentCardRefUid]);
}
```

### Step 4: 更新 PracticeOverlay 调用

**文件: `src/components/overlay/PracticeOverlay.tsx`**

简化 `useAutoCollapseBlocks` 调用，移除不再需要的参数：

```typescript
useAutoCollapseBlocks({
  enabled: autoCollapseBlocks,
  currentCardRefUid,
  isOpen,
});
```

---

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/utils/dom.ts` | `collapseBlockOnPage` → `collapseAllBlockOnPage`，用 DOM 模拟点击实现 |
| `src/components/overlay/CardBlock.tsx` | `autoExpand=false` 路径改用 `simulateMouseClick` |
| `src/hooks/useAutoCollapseBlocks.ts` | 大幅简化，只保留卡片切换和关闭两个 effect |
| `src/components/overlay/PracticeOverlay.tsx` | 简化 hook 调用参数 |
