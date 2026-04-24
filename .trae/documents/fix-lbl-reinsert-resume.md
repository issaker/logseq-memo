# 修复 LBL 插队重入后从第一行重新开始的问题

## 问题描述

LBL 模式下，用户对第一行子 block 点击 Next（Progressive 模式），LBL 卡片被插队重入一级队列。当用户再次学习到该 LBL 卡片时，又从第一行子 block 开始，而不是从第二行继续。

## 根因分析

问题出在 `PracticeOverlay.tsx` 第 291-299 行的 `childSessionData` 加载 useEffect：

```typescript
React.useEffect(() => {
    if (!isLineByLineActive || !childUidsList.length || !dataPageTitle) {
      setChildSessionData({});   // ← 离开 LBL 卡片时清空
      return;
    }
    getChildSessionData({ childUids: childUidsList, dataPageTitle }).then((data) => {
      setChildSessionData(data as Record<string, Session>);
    });
  }, [isLineByLineActive, childUidsList, dataPageTitle, currentCardRefUid]);
```

**时序问题**：

1. 用户对第一行子 block 点击 Next → `onLineByLineGrade` 执行：
   - `savePracticeData` 将子 block 数据写入 Roam 数据库 ✅
   - `setChildSessionData` 更新本地 state ✅
   - `setCurrentIndex(prev => prev + 1)` 离开 LBL 卡片

2. 离开 LBL 卡片时，`isLineByLineActive` 变为 false → 加载 useEffect 执行 `setChildSessionData({})`，**清空了本地 state**

3. LBL 卡片通过插队机制回到队列，用户再次翻到该卡片：
   - `isLineByLineActive` 变为 true → 加载 useEffect 触发 `getChildSessionData`
   - **但 `getChildSessionData` 从 Roam 数据库重新读取数据，这是一个异步操作**
   - 在异步数据到达之前，`childSessionData` 是空的 `{}`
   - 初始化 useEffect（`useLineByLineReview.ts` 第 162-196 行）检测到 `childSessionData` 为空，将 `lineByLineCurrentChildIndex` 设为 0
   - 当异步数据到达后，`childSessionData` 更新，初始化 useEffect 重新执行
   - **但此时 `hasInitializedForCardRef.current` 已经是 `true`**（因为在 `childSessionData` 为空时已经执行过一次初始化逻辑，虽然提前 return 了，但...）

等等，让我重新检查。当 `childSessionData` 为空时：

```typescript
if (!Object.keys(childSessionData).length) {
  setLineByLineCurrentChildIndex(0);
  return;   // ← 提前 return，没有设置 hasInitializedForCardRef.current = true
}
```

所以 `hasInitializedForCardRef.current` 仍然是 `false`。当异步数据到达后，useEffect 会重新执行，`hasInitializedForCardRef.current` 仍为 false，所以会调用 `findNextDueChildIndex`。

**但问题是**：`getChildSessionData` 从 Roam 数据库读取的数据**可能不包含刚才写入的更新**！

`getChildSessionData` 调用 `getPluginPageData` 从 Roam 数据页读取数据。Roam 的数据写入是通过 `savePracticeData` 完成的，它使用 `window.roamAlphaAPI` 写入。但 Roam 的数据同步可能存在延迟，或者 `getPluginPageData` 可能使用了缓存。

更关键的是，即使数据库读取到了最新数据，`getChildSessionData` 返回的是原始 session 数据，**不包含 `sessionOverrides` 中的更新**。`sessionOverrides` 是 PracticeOverlay 的本地 state，用于在当前会话中覆盖从数据库读取的数据。但 `getChildSessionData` 直接从数据库读取，不合并 `sessionOverrides`。

**所以真正的问题是**：当 LBL 卡片通过插队重入时，`childSessionData` 被清空后重新从数据库加载，但数据库中的数据可能还没有反映刚才的评分更新（Roam 写入延迟），或者即使反映了，也没有合并 `sessionOverrides` 中的本地覆盖。

## 修复方案

**核心思路**：离开 LBL 卡片时不清空 `childSessionData`，保留本地 state 中的最新数据。只在卡片真正变更时（`currentCardRefUid` 变化到不同的 LBL 卡片）才重新加载。

### 具体修改

**文件：`src/components/overlay/PracticeOverlay.tsx`**

修改 `childSessionData` 加载 useEffect：

```typescript
// 旧代码：
React.useEffect(() => {
    if (!isLineByLineActive || !childUidsList.length || !dataPageTitle) {
      setChildSessionData({});
      return;
    }
    getChildSessionData({ childUids: childUidsList, dataPageTitle }).then((data) => {
      setChildSessionData(data as Record<string, Session>);
    });
  }, [isLineByLineActive, childUidsList, dataPageTitle, currentCardRefUid]);

// 新代码：
const prevCardRefUidForChildDataRef = React.useRef<string | undefined>();

React.useEffect(() => {
    if (!isLineByLineActive || !childUidsList.length || !dataPageTitle) {
      return;
    }

    const cardChanged = prevCardRefUidForChildDataRef.current !== currentCardRefUid;
    prevCardRefUidForChildDataRef.current = currentCardRefUid;

    if (!cardChanged) return;

    getChildSessionData({ childUids: childUidsList, dataPageTitle }).then((data) => {
      setChildSessionData((prev) => {
        const merged = { ...data };
        for (const uid of Object.keys(prev)) {
          if (childUidsList.includes(uid) && !merged[uid]) {
            merged[uid] = prev[uid];
          }
        }
        return merged;
      });
    });
  }, [isLineByLineActive, childUidsList, dataPageTitle, currentCardRefUid]);
```

关键变化：
1. **离开 LBL 卡片时不清空 `childSessionData`**：移除 `setChildSessionData({})` 调用
2. **只在卡片变更时重新加载**：使用 `prevCardRefUidForChildDataRef` 检测卡片变化，只在变化时触发数据加载
3. **合并本地 state 与数据库数据**：加载完成后，用 `setChildSessionData` 的函数形式，将数据库数据与本地已有的数据合并，优先使用数据库数据，但保留数据库中不存在的本地更新

### 为什么这样修复是正确的

- **插队重入场景**：`currentCardRefUid` 没有变化（是同一张 LBL 卡片），所以不会触发重新加载，`childSessionData` 保留了上次评分后的本地 state，`findNextDueChildIndex` 能正确找到下一个到期子 block
- **翻到不同 LBL 卡片场景**：`currentCardRefUid` 变化，触发重新加载，从数据库获取新卡片的子 block 数据
- **离开 LBL 卡片场景**：不清空 `childSessionData`，避免数据丢失。当翻到非 LBL 卡片时，`isLineByLineActive` 为 false，但 `childSessionData` 保留，不影响其他逻辑

### 边界情况

- **Normal 卡片**：`isLineByLineActive` 为 false，useEffect 不执行，`childSessionData` 保持不变（不影响 Normal 卡片逻辑）
- **同一 LBL 卡片插队重入**：`currentCardRefUid` 不变，不重新加载，本地 state 保留
- **不同 LBL 卡片**：`currentCardRefUid` 变化，重新加载
