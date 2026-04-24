# Tasks

- [x] Task 1: 重构 `useLineByLineReview` — 解耦浏览位置与到期计算 + 新增导航函数 + 完成状态可逆
  - [x] SubTask 1.1: 新增 `onLineByLinePrev` 回调：当 `lineByLineCurrentChildIndex > 0` 时将索引减 1，同时确保 `lineByLineRevealedCount` 覆盖目标位置
  - [x] SubTask 1.2: 新增 `onLineByLineNext` 回调：当 `lineByLineCurrentChildIndex < childUidsList.length - 1` 时将索引加 1，同时确保 `lineByLineRevealedCount` 覆盖目标位置
  - [x] SubTask 1.3: 修改 `lineByLineIsCardComplete` 逻辑：当用户通过导航回退时，若 `lineByLineCurrentChildIndex < childUidsList.length`，则 `lineByLineIsCardComplete` 为 false
  - [x] SubTask 1.4: 修改 `onLineByLineGrade` 中的完成状态处理：评分后若推进到末尾之后，设置 `lineByLineIsCardComplete` 为 true；若仍有到期子 block 则为 false
  - [x] SubTask 1.5: 在 hook 接口中新增 `onLineByLinePrev` 和 `onLineByLineNext` 输出
  - [x] SubTask 1.6: 审查 `onLineByLineGrade` 中回溯重评分场景：确认 `savePracticeData` 同日覆盖、`childSessionData` 更新、`sessionOverrides` 更新、`updateParentNextDueDate` 调用均正确工作
  - [x] SubTask 1.7: 审查回溯重评分与重插入机制的兼容性：确认 Forgot 重插入和 LblNext 重插入在回溯场景下行为正确

- [x] Task 2: 修改 `PracticeOverlay` — 传递导航回调 + 调整 showAnswers 逻辑
  - [x] SubTask 2.1: 从 `useLineByLineReview` 获取 `onLineByLinePrev` 和 `onLineByLineNext`
  - [x] SubTask 2.2: 将 `onLineByLinePrev` 和 `onLineByLineNext` 传入 `MainContext`，供 Footer 使用
  - [x] SubTask 2.3: 修改 `setShowAnswers` useEffect：翻行到已掌握子 block 时 showAnswers 为 true；翻行到未评分 SM2 子 block 时 showAnswers 为 false；翻行到 LblNext 子 block 时 showAnswers 为 true
  - [x] SubTask 2.4: 修改 `onPracticeClick` 中 LBL 完成状态的判断：当 `lineByLineIsCardComplete` 因回退变为 false 时，评分应走正常 LBL 评分流程而非完成流程

- [x] Task 3: 修改 `Footer` — 新增 ▲/▼ 按钮 + ↑/↓ 快捷键
  - [x] SubTask 3.1: 从 `MainContext` 获取 `onLineByLinePrev` 和 `onLineByLineNext`
  - [x] SubTask 3.2: 在 `GradingControlsWrapper` 中 LBL 模式下显示 ▲/▼ 按钮（与 ◀/▶ 并列，样式一致）
  - [x] SubTask 3.3: 在 `LblCompletedControls` 中显示 ▲/▼ 按钮（▲ 可点击，▼ 禁用或不可点击）
  - [x] SubTask 3.4: 新增 ↑ 快捷键：LBL 模式下触发 `onLineByLinePrev`
  - [x] SubTask 3.5: 新增 ↓ 快捷键：LBL 模式下触发 `onLineByLineNext`
  - [x] SubTask 3.6: 确保 ↑/↓ 快捷键仅在 LBL 模式下生效，Normal 模式下无特殊行为

- [x] Task 4: 修改 `LineByLineView` — 适配浏览位置变化
  - [x] SubTask 4.1: 确认 `lineByLineCurrentChildIndex` 变化时当前行高亮正确更新
  - [x] SubTask 4.2: 确认 LineByLineSeparator 行号指示器随浏览位置更新

- [x] Task 5: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 5.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 5.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] depends on [Task 1]（PracticeOverlay 需要 useLineByLineReview 的新接口）
- [Task 3] depends on [Task 2]（Footer 需要 MainContext 中的新字段）
- [Task 4] depends on [Task 1]（LineByLineView 需要 useLineByLineReview 的新行为）
- [Task 5] depends on [Task 3] and [Task 4]（验证需要在所有修改完成后进行）
