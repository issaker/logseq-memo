# LBL 卡片完成后显示修复计划

## 问题分析

当 LBL 模式下所有子 block 回答完毕后（`lineByLineIsCardComplete = true`），翻页回到该卡片时：

1. **按钮变成 Continue Cramming / Close**：因为 `isDone={isDone || lineByLineIsCardComplete}` 传给 Footer，Footer 在 `isDone` 时显示 `FinishedControls`
2. **所有子 block 被隐藏**：因为渲染条件 `isLineByLineActive && !lineByLineIsCardComplete` 为 false，`LineByLineView` 不渲染，回退到普通 `CardBlock`（不显示子 block）

## 期望行为

- 回答完所有子 block 后，仍显示 `LineByLineView`，所有子 block 可见（mastered 样式）
- Footer 显示左右翻页按钮（◀ ▶），不显示 Continue Cramming
- 用户可翻到下一张卡片，也可翻回查看内容

## 修改方案

### 1. `PracticeOverlay.tsx` — 核心调度修改

**a) 渲染条件：移除 `!lineByLineIsCardComplete`**
```
旧: isLineByLineActive && !lineByLineIsCardComplete ? <LineByLineView /> : ...
新: isLineByLineActive ? <LineByLineView /> : ...
```
LBL 模式下始终渲染 `LineByLineView`，包括卡片完成时。

**b) Footer `isDone`：移除 `lineByLineIsCardComplete`**
```
旧: isDone={isDone || lineByLineIsCardComplete}
新: isDone={isDone}
```
LBL 卡片完成不等同于会话结束，不应触发 FinishedControls。

**c) `onPracticeClick`：LBL 完成时仅翻页**
在 `isLineByLineActive && !lineByLineIsCardComplete` 分支之后，添加：
```
if (isLineByLineActive && lineByLineIsCardComplete) {
  setCurrentIndex((prev) => prev + 1);
  return;
}
```
LBL 完成后点击 Next 仅翻到下一张卡片，不重复评分。

**d) `showAnswers` 逻辑：LBL 完成时为 true**
```
旧: isLineByLineActive ? lineByLineRevealedCount > lineByLineCurrentChildIndex : showAnswers
新: isLineByLineActive ? (lineByLineIsCardComplete || lineByLineRevealedCount > lineByLineCurrentChildIndex) : showAnswers
```
LBL 完成时 `showAnswers = true`，Footer 不显示 "Show Answer" 按钮。

**e) `setShowAnswers`：LBL 完成时不传递 `onLineByLineShowAnswer`**
```
旧: isLineByLineActive && !lineByLineIsCardComplete ? onLineByLineShowAnswer : setShowAnswers
新: isLineByLineActive && !lineByLineIsCardComplete ? onLineByLineShowAnswer : setShowAnswers
```
（此行无需修改，已正确处理：LBL 完成时使用普通 `setShowAnswers`）

**f) `MainContextProps`：新增 `lineByLineIsCardComplete`**
在接口和 `mainContextValue` 中添加 `lineByLineIsCardComplete: boolean`，供 Footer 使用。

### 2. `LineByLineView.tsx` — 完成状态 UI

**a) 分隔符文本：完成时显示 "Complete"**
```
旧: Line {lineByLineCurrentChildIndex + 1} / {childUidsList.length} ({dueCount} due)
新: lineByLineCurrentChildIndex >= childUidsList.length
    ? `Complete ✓ (${dueCount} due)`
    : `Line {lineByLineCurrentChildIndex + 1} / {childUidsList.length} ({dueCount} due)`
```

**b) 子 block 渲染：完成时全部展开**
当 `lineByLineCurrentChildIndex >= childUidsList.length` 时，`isCurrentLine` 永远为 false（无高亮），`autoExpand` 使用 `!autoCollapseBlocks`（全部展开或按设置折叠）。这已经是正确行为，无需额外修改。

### 3. `Footer.tsx` — LBL 完成状态按钮

**a) 从 `MainContext` 获取 `lineByLineIsCardComplete`**

**b) 新增 LBL 完成状态判断**
在 Footer 的三路条件中，在 `isDone` 判断之后、`!showAnswers` 之前，新增：
```
isLineByLineActive && lineByLineIsCardComplete
  ? <LblCompletedControls onPrevClick={onPrevClick} onNextClick={skipFn} />
  : ...
```

**c) 新增 `LblCompletedControls` 组件**
简单的左右翻页按钮，无评分按钮：
```tsx
const LblCompletedControls = ({ onPrevClick, onNextClick }) => (
  <>
    <button onClick={onPrevClick}>◀</button>
    <span>All lines reviewed</span>
    <button onClick={onNextClick}>▶</button>
  </>
);
```

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/overlay/PracticeOverlay.tsx` | 渲染条件、isDone、onPracticeClick、showAnswers、MainContext |
| `src/components/overlay/LineByLineView.tsx` | 完成状态分隔符文本 |
| `src/components/overlay/Footer.tsx` | LBL 完成状态按钮、LblCompletedControls 组件 |
