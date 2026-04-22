# 修复自动折叠功能的三个 Bug

## 问题分析

### Bug 1: `hideChildren` 是"隐藏"而非"折叠"
[LineByLineView.tsx:80](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/LineByLineView.tsx#L80) 的 `hideChildren={!isCurrentLine}` 使用 CSS `display: none` 完全隐藏了子 block 的 children，用户无法点击 caret 展开回顾上下文。

正确做法：用 `updateBlock({open: false})` 折叠 block，这样 block 文本可见、children 收起、caret 可点击展开。

### Bug 2: `hideChildren` 不受 `autoCollapseBlocks` 设置控制
`hideChildren={!isCurrentLine}` 是硬编码的，无论 `autoCollapseBlocks` 开关是否开启都生效。关闭开关后之前的子 block 仍然被隐藏。

### Bug 3: `collapseBlockOnPage` 的 try/catch 回退机制冗余
回退机制掩盖了 `updateBlock({open: false})` 是否真正有效，无法测试。应直接使用 `updateBlock({open: false})`。

---

## 修复方案

### Step 1: 移除 `hideChildren={!isCurrentLine}`

**文件: [LineByLineView.tsx](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/LineByLineView.tsx#L80)**

删除子 block CardBlock 上的 `hideChildren={!isCurrentLine}`。之前的子 block 不再用 CSS 隐藏 children，而是由 `useAutoCollapseBlocks` 通过 `updateBlock({open: false})` 折叠，这样 caret 仍然可见可点击。

### Step 2: 给 CardBlock 添加 `autoExpand` prop

**文件: [CardBlock.tsx](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/CardBlock.tsx)**

当前 CardBlock 在 `renderBlock` 中总是自动展开折叠的 block（第 76-84 行）。需要添加 `autoExpand` prop 来控制此行为：

- `autoExpand=true`（默认）：当前行为，渲染后自动展开折叠的 block
- `autoExpand=false`：渲染后不展开，如果 block 是展开状态则调用 `updateBlock({open: false})` 折叠它

具体修改：
1. 添加 `autoExpand` prop（默认 `true`）
2. 创建 `autoExpandRef` 并在 prop 变化时更新
3. 修改 `renderBlock` 函数：
   - `autoExpandRef.current === true` 且 block 折叠 → 展开（当前行为）
   - `autoExpandRef.current === false` 且 block 展开 → 调用 `updateBlock({open: false})` 折叠
4. 将 `autoExpand` 加入触发 re-render 的 effect 依赖数组（第 139-143 行），当 `autoExpand` 从 true 变为 false 时触发重新渲染

### Step 3: LineByLineView 传递 `autoExpand` 和 `autoCollapseBlocks`

**文件: [LineByLineView.tsx](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/LineByLineView.tsx)**

1. 添加 `autoCollapseBlocks` prop 到 `LineByLineViewProps`
2. 子 block CardBlock 传递 `autoExpand={isCurrentLine || !autoCollapseBlocks}`
   - 当 `autoCollapseBlocks=true`：只有当前行 autoExpand，之前的行不 autoExpand（会被折叠）
   - 当 `autoCollapseBlocks=false`：所有行都 autoExpand（全部展开显示）

### Step 4: PracticeOverlay 传递 `autoCollapseBlocks` 给 LineByLineView

**文件: [PracticeOverlay.tsx](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L685-693)**

在 `<LineByLineView>` 调用处添加 `autoCollapseBlocks={autoCollapseBlocks}` prop。

### Step 5: 移除 `collapseBlockOnPage` 的 try/catch 回退

**文件: [dom.ts](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/utils/dom.ts#L26-41)**

简化为直接调用 `updateBlock({open: false})`，不捕获异常：

```typescript
export const collapseBlockOnPage = (uid: string) => {
  return window.roamAlphaAPI.updateBlock({
    block: { uid, open: false },
  });
};
```

### Step 6: 从 `useAutoCollapseBlocks` 移除 LBL 子 block 折叠逻辑

**文件: [useAutoCollapseBlocks.ts](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/hooks/useAutoCollapseBlocks.ts)**

LBL 子 block 的折叠现在由 CardBlock 的 `autoExpand` prop 控制（Step 2），不需要 `useAutoCollapseBlocks` 再重复处理。移除 hook 中 LBL 子 block 折叠相关的 effect（第 52-72 行），避免重复调用 `updateBlock`。

保留 hook 中的：
- 卡片切换时折叠前一个卡片
- LBL 卡片完成时折叠父 block
- Overlay 关闭时折叠所有已展开的 block

---

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/overlay/LineByLineView.tsx` | 删除 `hideChildren={!isCurrentLine}`，添加 `autoCollapseBlocks` prop，传递 `autoExpand` |
| `src/components/overlay/CardBlock.tsx` | 添加 `autoExpand` prop，控制展开/折叠行为 |
| `src/components/overlay/PracticeOverlay.tsx` | 传递 `autoCollapseBlocks` 给 LineByLineView |
| `src/utils/dom.ts` | 移除 try/catch 回退，直接用 `updateBlock` |
| `src/hooks/useAutoCollapseBlocks.ts` | 移除 LBL 子 block 折叠逻辑（由 CardBlock `autoExpand` 接管） |
