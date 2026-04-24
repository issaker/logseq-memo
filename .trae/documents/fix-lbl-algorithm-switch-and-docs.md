# Bug 修复 + 文档更新计划

## Bug 1: 切换算法时自动跳到下一行子 block

### 根因分析

[useLineByLineReview.ts:140-156](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/hooks/useLineByLineReview.ts#L140-L156) 的初始化 useEffect 将 `childSessionData` 放在依赖数组中：

```typescript
React.useEffect(() => {
  // ...
  const firstDueIndex = findNextDueChildIndex(childUidsList, childSessionData, 0);
  setLineByLineCurrentChildIndex(firstDueIndex);
  // ...
}, [isLBLReviewMode, currentCardRefUid, childUidsList, childSessionData]);
```

当用户切换算法时，`onSelectAlgorithm` 更新 `childSessionData`（设置当前子 block 的新算法），触发此 useEffect 重新执行。`findNextDueChildIndex` 从索引 0 重新搜索第一个到期子 block，导致 `lineByLineCurrentChildIndex` 被重置，跳到其他行。

### 修复方案

使用"卡片变更检测"模式：只在 `currentCardRefUid` 变化（翻到新卡片）或 `childSessionData` 首次加载完成时重新初始化索引。算法切换和评分导致 `childSessionData` 变化时，不重新初始化。

具体实现：
1. 新增 `prevCardRefUidRef` 追踪上一次的 `currentCardRefUid`
2. 新增 `hasInitializedRef` 标记当前卡片是否已初始化
3. 当 `currentCardRefUid` 变化时，重置 `hasInitializedRef` 为 false
4. 只有当 `hasInitializedRef` 为 false 且 `childSessionData` 非空时才执行初始化
5. 初始化完成后设置 `hasInitializedRef` 为 true

### 修改文件
- `src/hooks/useLineByLineReview.ts` — 修改初始化 useEffect

---

## Bug 2: LBL 子 block 重复学习无覆盖提示

### 根因分析

[PracticeOverlay.tsx:409-411](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L409-L411) 中，LBL 模式下 `onPracticeClick` 直接委托给 `onLineByLineGrade` 并 return，永远不会到达后面的覆盖提示检查逻辑：

```typescript
if (isLineByLineActive && !lineByLineIsCardComplete) {
  onLineByLineGrade(gradeData.sm2_grade);
  return;  // ← 提前返回，跳过了覆盖提示检查
}
// ... 下面的覆盖提示检查永远不会在 LBL 模式下执行
const isReScoring = !isNewCard && currentCardData?.dateCreated
    && dateUtils.isSameDay(currentCardData.dateCreated, new Date())
    && currentCardData.sm2_grade !== 0;
if (isReScoring) {
  setShowOverwriteReminder(true);
}
```

### 修复方案

在 LBL 分支中，调用 `onLineByLineGrade` 之前，检查当前子 block 是否今日已学习。如果是，触发覆盖提示。

检查逻辑：
- 当前子 block 有 session 数据（非新卡）
- 当前子 block 的 `dateCreated` 是今天
- 当前子 block 的 `sm2_grade` 不为 0（排除 Forgot 重评场景，与 normal 卡逻辑一致）

需要将 `childUidsList`、`lineByLineCurrentChildIndex`、`childSessionData` 加入 `onPracticeClick` 的依赖数组。

### 修改文件
- `src/components/overlay/PracticeOverlay.tsx` — 在 LBL 分支添加覆盖提示检查

---

## 文档更新

### README 更新
1. 在 Keyboard Shortcuts 表格中添加 ↑/↓ 快捷键
2. 在 Architecture 部分新增 "LBL Secondary Queue Architecture" 章节，描述双队列架构
3. 更新 Interaction Styles 部分的 LBL 描述，加入上下翻行导航说明

### 代码注释
1. `useLineByLineReview.ts` — 在文件顶部注释中补充二级队列架构说明
2. `PracticeOverlay.tsx` — 在 MainContext 接口注释中补充二级队列架构说明
3. `Footer.tsx` — 在上下翻行按钮区域补充二级队列架构说明

### 修改文件
- `README.md`
- `src/hooks/useLineByLineReview.ts`
- `src/components/overlay/PracticeOverlay.tsx`
- `src/components/overlay/Footer.tsx`
