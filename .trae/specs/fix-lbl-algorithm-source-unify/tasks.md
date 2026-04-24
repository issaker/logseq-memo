# Tasks

- [x] Task 1: Footer — 统一 LBL 模式下的算法源为 currentChildAlgorithm
  - [x] SubTask 1.1: 在 Footer 顶层计算 `effectiveAlgorithm`：`isLineByLine ? (currentChildAlgorithm || algorithmFromSession) : algorithmFromSession`
  - [x] SubTask 1.2: 修改 space 键 handler：使用 `isGradingAlgorithm(effectiveAlgorithm)` 替代 `isGradingAlgorithm(algorithmFromSession)`
  - [x] SubTask 1.3: 修改 F/H/G 快捷键 disabled 条件：使用 `!isGradingAlgorithm(effectiveAlgorithm)` 替代 `!isGradingAlgorithm(algorithmFromSession)`
  - [x] SubTask 1.4: 修改 E 快捷键 disabled 条件：使用 `!isFixedTimeAlgorithm(effectiveAlgorithm)` 替代 `!isFixedTimeAlgorithm(algorithmFromSession)`
  - [x] SubTask 1.5: 修改 GradingControlsWrapper 中的 `isAutoAdvanceMode`：使用 `effectiveAlgorithm` 替代 `algorithm`
  - [x] SubTask 1.6: 将 `effectiveAlgorithm` 加入 hotkeys useMemo 的依赖数组

- [x] Task 2: PracticeOverlay — 重构 showAnswers 状态机
  - [x] SubTask 2.1: 修改 showAnswers useEffect：在 LBL 分支中，当 `childSessionData` 为空时（尚未加载），保持 showAnswers 为 true（避免 Progressive 子 block 闪烁 Show Answer）
  - [x] SubTask 2.2: 修改 Footer 的 showAnswers prop：从 `isLineByLineActive ? (lineByLineIsCardComplete || lineByLineRevealedCount > lineByLineCurrentChildIndex) : showAnswers` 改为直接传递 `showAnswers`
  - [x] SubTask 2.3: 修改 Footer 的 setShowAnswers prop：从 `isLineByLineActive && !lineByLineIsCardComplete ? onLineByLineShowAnswer : setShowAnswers` 改为始终传递 `setShowAnswers`（因为 showAnswers 的决策已集中在 useEffect 中），同时在 showAnswerFn 中 LBL 模式下调用 onLineByLineShowAnswer

- [x] Task 3: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 3.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 3.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] depends on [Task 1]（showAnswers 重构需要确认算法源统一后的行为）
- [Task 3] depends on [Task 1] and [Task 2]
