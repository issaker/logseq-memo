# Tasks

- [x] Task 1: 修改 `useLineByLineReview` — 新增撤回逻辑和历史栈
  - [x] SubTask 1.1: 新增 `UndoSnapshot` 类型：包含 `childUid`、`previousChildSession`（评分前的 childSessionData[childUid]）、`previousLineByLineCurrentChildIndex`、`previousLineByLineRevealedCount`
  - [x] SubTask 1.2: 新增 `undoHistory` state：`React.useState<UndoSnapshot[]>([])`
  - [x] SubTask 1.3: 在 `onLineByLineGrade` 评分前，将当前快照推入 `undoHistory`
  - [x] SubTask 1.4: 新增 `onUndoLineByLineGrade` 回调：从 `undoHistory` 弹出最新快照，恢复 `childSessionData`、`lineByLineCurrentChildIndex`、`lineByLineRevealedCount`、`showAnswers`，调用 `savePracticeData` 和 `updateParentNextDueDate` 恢复数据页，恢复 `sessionOverrides`
  - [x] SubTask 1.5: 新增 `canUndoLineByLineGrade` 计算：`undoHistory.length > 0`
  - [x] SubTask 1.6: 在 hook 接口中新增 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade` 输出
  - [x] SubTask 1.7: 在卡片切换时（useEffect 中 `currentCardRefUid` 变化）清空 `undoHistory`
- [x] Task 2: 修改 `PracticeOverlay` — 传递撤回回调到 MainContext
  - [x] SubTask 2.1: 从 `useLineByLineReview` 解构 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade`
  - [x] SubTask 2.2: 在 `MainContextProps` 接口中新增 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade`
  - [x] SubTask 2.3: 在 `mainContextValue` 中新增这两个字段
- [x] Task 3: 修改 `Footer` — 新增撤回按钮
  - [x] SubTask 3.1: 从 `MainContext` 获取 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade`
  - [x] SubTask 3.2: 在 `GradingControlsWrapper` 中新增 "↩ Undo" 按钮（在 ◀ ▶ 和评分按钮之间），disabled 当 `!canUndoLineByLineGrade`
  - [x] SubTask 3.3: 在 `LblCompletedControls` 中新增 "↩ Undo" 按钮，disabled 当 `!canUndoLineByLineGrade`
- [x] Task 4: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 4.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 4.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] depends on [Task 1]（PracticeOverlay 需要 useLineByLineReview 的新接口）
- [Task 3] depends on [Task 2]（Footer 需要 MainContext 中的新字段）
- [Task 4] depends on [Task 3]（验证需要在所有修改完成后进行）
