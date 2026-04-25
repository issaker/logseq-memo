# Tasks

- [ ] Task 1: 修正 `useLineByLineReview` 中 revealedCount 语义和 ShowAnswer 作用域
  - [ ] SubTask 1.1: 修改初始定位 useEffect：将 `setLineByLineRevealedCount(firstDueIndex)` 改为 `setLineByLineRevealedCount(firstDueIndex + 1)`，删除 LblNext/SM2 的区分逻辑
  - [ ] SubTask 1.2: 修改 `onLineByLineShowAnswer`：将 `setLineByLineRevealedCount((prev) => prev + 1)` 改为 `setLineByLineRevealedCount((prev) => Math.max(prev, lineByLineCurrentChildIndex + 1))`，添加 `lineByLineCurrentChildIndex` 到依赖数组
  - [ ] SubTask 1.3: 修改 `onLineByLineGrade` 中评分后的 revealedCount 设置：所有 `setLineByLineRevealedCount(nextDueIndex)` 改为 `setLineByLineRevealedCount(nextDueIndex + 1)`，`setLineByLineRevealedCount(nextDueIndex + 1)` 保持不变（已经是 +1）

- [ ] Task 2: 隐藏 LBL 子 block 的 InteractionSelector
  - [ ] SubTask 2.1: 在 `Footer.tsx` 的 `GradingControlsWrapper` 中，当 `isLineByLine` 为 true 时不渲染 `InteractionSelector`

- [ ] Task 3: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [ ] SubTask 3.1: 运行 `npm run lint` 确保无 lint 错误
  - [ ] SubTask 3.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] 可与 [Task 1] 并行执行
- [Task 3] depends on [Task 1] and [Task 2]
