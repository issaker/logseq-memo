# 修复：Normal 模式下修改子块后切换 LBL 模式导致第一行子块丢失

## 问题描述

当卡片处于 Normal 模式时，用户调换或删除了第一行子 block，然后切换到 Line by Line 模式，会出现第一行子 block 卡片丢失的情况。需要前后翻页刷新才能让卡片正确识别被修改的子 block。

## 根因分析

### 核心问题：`useBlockInfo` 的数据过期

[useBlockInfo.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/hooks/useBlockInfo.tsx) 的 `useEffect` 仅依赖 `refUid`：

```typescript
React.useEffect(() => {
  if (!refUid) return;
  const fetch = async () => {
    const blockInfo = await fetchBlockInfo(refUid);
    setBlockInfo({ ...blockInfo, refUid });
  };
  fetch();
}, [refUid]);  // ← 仅在 refUid 变化时重新获取
```

### 数据流追踪

1. 用户在 Normal 模式下查看卡片 → `useBlockInfo` 获取 `blockInfo`（包含 `childrenUids`）
2. 用户在 Roam 中调换/删除第一行子 block → Roam 数据库已更新，但 React 状态中的 `blockInfo.childrenUids` 仍然是旧的
3. 用户切换到 LBL 模式 → `onSelectInteraction` 更新 `interaction` 为 `LBL`
4. `isLBLReview = isLBLReviewMode(interaction) && hasBlockChildrenUids` 变为 `true`
5. `childUidsList = blockInfo.childrenUids` 仍然是**旧的/过期的** UID 列表
6. `LineByLineView` 使用过期的 `childUidsList` 渲染子块 → 第一个 UID 可能指向已删除/移走的 block → 卡片丢失
7. 翻页后 `currentCardRefUid` 变化 → `useBlockInfo` 重新获取 → 数据正确

### 为什么翻页能修复

翻页改变了 `currentCardRefUid`，触发了 `useBlockInfo` 的 `useEffect` 重新执行，从而获取了最新的 `blockInfo`（包含正确的 `childrenUids`）。

## 修复方案

### 方案：为 `useBlockInfo` 添加 `refreshKey` 参数

在 `useBlockInfo` 中添加可选的 `refreshKey` 参数，当 `refreshKey` 变化时触发重新获取。在 `PracticeOverlay` 中将 `interaction` 作为 `refreshKey` 传入，这样切换到 LBL 模式时会自动刷新 block 信息。

### 修改步骤

#### 步骤 1：修改 `useBlockInfo` Hook

文件：[useBlockInfo.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/hooks/useBlockInfo.tsx)

- 添加可选的 `refreshKey` 参数
- 将 `refreshKey` 加入 `useEffect` 的依赖数组

修改后的代码：

```typescript
const useBlockInfo = ({ refUid, refreshKey }) => {
  const [blockInfo, setBlockInfo] = React.useState<BlockInfo>({} as BlockInfo);

  React.useEffect(() => {
    if (!refUid) return;

    const fetch = async () => {
      const blockInfo = await fetchBlockInfo(refUid);
      setBlockInfo({ ...blockInfo, refUid });
    };

    fetch();
  }, [refUid, refreshKey]);

  return { blockInfo };
};
```

#### 步骤 2：在 `PracticeOverlay` 中传入 `interaction` 作为 `refreshKey`

文件：[PracticeOverlay.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx)

将第 238 行：

```typescript
const { blockInfo } = useBlockInfo({ refUid: currentCardRefUid });
```

改为：

```typescript
const { blockInfo } = useBlockInfo({ refUid: currentCardRefUid, refreshKey: interaction });
```

这样当 `interaction` 从 `NORMAL` 变为 `LBL`（或反之）时，`useBlockInfo` 会重新获取最新的 block 信息，确保 `childrenUids` 是最新的。

### 不需要修改的文件

- [LineByLineView.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/LineByLineView.tsx)：该组件的 `useBlockInfo` 仅用于获取 breadcrumbs，且组件在切换到 LBL 模式时是新挂载的（会自动获取最新数据），`childUidsList` 作为 prop 从 `PracticeOverlay` 传入，不需要额外处理。

### 数据流修复后

1. 用户在 Normal 模式下查看卡片 → `useBlockInfo` 获取 `blockInfo`
2. 用户在 Roam 中调换/删除第一行子 block
3. 用户切换到 LBL 模式 → `interaction` 变化 → `refreshKey` 变化 → `useBlockInfo` 重新获取 `blockInfo`
4. `childUidsList` 使用最新的 `childrenUids` → `LineByLineView` 正确渲染子块

### 边界情况

- **LBL → Normal 切换**：也会触发重新获取，虽然不必要但无害
- **同一卡片已在 LBL 模式**：`interaction` 不变，不会额外触发重新获取
- **翻页导航**：`refUid` 变化仍会触发重新获取（与现有行为一致）

## 影响范围

- 修改 2 个文件
- 不影响现有功能
- 不需要修改测试（行为变更很小，且该 Hook 目前没有单元测试）
