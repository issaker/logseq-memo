# Tasks

- [x] Task 1: 移除 `onLineByLineSwitchToGradingAlgorithm` 及其所有引用
  - [x] SubTask 1.1: 在 `useLineByLineReview.ts` 中删除 `onLineByLineSwitchToGradingAlgorithm` 回调实现、接口声明和返回值
  - [x] SubTask 1.2: 在 `PracticeOverlay.tsx` 中移除 `onLineByLineSwitchToGradingAlgorithm` 的解构、MainContext 传递和 `onSelectAlgorithm` 中的调用
  - [x] SubTask 1.3: 在 `Footer.tsx` 中移除 `onLineByLineSwitchToGradingAlgorithm` 的引用（如有）

- [x] Task 2: 修正 `onLineByLineShowAnswer` — 简化为设置 showAnswers=true
  - [x] SubTask 2.1: 将 `onLineByLineShowAnswer` 改为：`setLineByLineRevealedCount((prev) => Math.max(prev, lineByLineCurrentChildIndex + 1)); setShowAnswers(true);`，移除"推进到隐藏 SM2 行"的特殊逻辑

- [x] Task 3: 修正 `setShowAnswers` useEffect — 统一 LBL 与 Normal 的 ShowAnswer 逻辑
  - [x] SubTask 3.1: 在 `PracticeOverlay.tsx` 中，为 LBL 子 block 检测 `hasBlockChildren` 和 `hasCloze`：需要新增 `childHasBlockChildren` 和 `childHasCloze` 状态，由 LineByLineView 通过回调设置
  - [x] SubTask 3.2: 修改 `setShowAnswers` useEffect 的 LBL 分支：SM2 子 block 有子内容/挖空时 `showAnswers=false`，否则 `showAnswers=true`；Progressive/FixedTime 子 block 始终 `showAnswers=true`；已掌握子 block 始终 `showAnswers=true`
  - [x] SubTask 3.3: 移除 `isNextHiddenGrading` 检测逻辑

- [x] Task 4: 修正 `LineByLineView` — 传递 showAnswers 到子 block CardBlock
  - [x] SubTask 4.1: 在 `LineByLineView` 的 props 中新增 `showAnswers` 和 `currentChildAlgorithm`
  - [x] SubTask 4.2: 当前行是 SM2 且需要 ShowAnswer 时，传递 `showAnswers` 值到 CardBlock；其他情况始终 `showAnswers={true}`
  - [x] SubTask 4.3: 新增 `setChildHasBlockChildren` 和 `setChildHasCloze` 回调，由当前行的 CardBlock 调用来设置子 block 的子内容/挖空状态

- [x] Task 5: 修正 `onSelectAlgorithm` — 移除 SM2 切换回退逻辑
  - [x] SubTask 5.1: 在 `PracticeOverlay.tsx` 的 `onSelectAlgorithm` 中，移除 `if (isGradingAlgorithm(newAlgorithm)) { onLineByLineSwitchToGradingAlgorithm(); }` 调用

- [x] Task 6: 更新文档和注释
  - [x] SubTask 6.1: 更新 `useLineByLineReview.ts` 文件头注释：移除 SM2 回退+隐藏的说明，改为"SM2 ShowAnswer 由子内容/挖空决定"
  - [x] SubTask 6.2: 更新 `PracticeOverlay.tsx` MainContext 注释：移除 `onLineByLineSwitchToGradingAlgorithm` 说明
  - [x] SubTask 6.3: 更新 README：移除 SM2 回退+隐藏的说明，改为"SM2 ShowAnswer 与 Normal 卡片一致"的说明

- [x] Task 7: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 7.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 7.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] depends on [Task 1]（简化 onLineByLineShowAnswer 需要先移除 SM2 回退机制）
- [Task 3] depends on [Task 4]（setShowAnswers useEffect 需要子 block 的 hasBlockChildren/hasCloze 状态）
- [Task 5] depends on [Task 1]（移除 onSelectAlgorithm 中的调用需要先移除回调）
- [Task 6] depends on [Task 1], [Task 2], [Task 3], [Task 4], [Task 5]
- [Task 7] depends on all previous tasks
