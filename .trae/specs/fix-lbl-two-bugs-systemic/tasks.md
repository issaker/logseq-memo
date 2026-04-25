# Tasks

- [x] Task 1: 修复 Footer 的 showAnswers 信号源（Bug 1 核心修复）
  - [x] SubTask 1.1: 在 `PracticeOverlay.tsx` 中将 Footer 的 `showAnswers` prop 改为直接使用内部 `showAnswers` 状态（移除 `lineByLineRevealedCount > lineByLineCurrentChildIndex` 的判断）
  - [x] SubTask 1.2: 验证 `onLineByLineShowAnswer` 正确调用 `setShowAnswers(true)`，确保点击 ShowAnswer 后 Footer 能切换到评分按钮
  - [x] SubTask 1.3: 验证 `lineByLineIsCardComplete` 仍能正确触发 `LblCompletedControls`（Footer 内部已有独立判断 `isLineByLine && lineByLineIsCardComplete`）

- [x] Task 2: 修复 effectiveInteraction 防止子 block 数据污染（Bug 2 核心修复）
  - [x] SubTask 2.1: 在 `Footer.tsx` 的 `GradingControlsWrapper` 中，将 `effectiveInteraction` 的计算简化为直接使用 `interaction`（移除 `baseCardData?.interaction ||` 短路）
  - [x] SubTask 2.2: 验证 InteractionSelector 在 LBL 模式下仍正确显示父级 LBL 并可切换

- [x] Task 3: 防御性修复 FixedIntervalModeControls 的算法来源
  - [x] SubTask 3.1: 在 `GradingControlsWrapper` 中将 `effectiveAlgorithm` 通过 props 传递给 `FixedIntervalModeControls`
  - [x] SubTask 3.2: 在 `FixedIntervalModeControls` 中接收 `effectiveAlgorithm` prop，用其替代内部的 `usePracticeSession().algorithm` 做 `isProgressive` 判断
  - [x] SubTask 3.3: 确保 `LblNextControls` 和 `SpacedIntervalModeControls` 不受影响

- [x] Task 4: 更新代码注释，强化架构意图
  - [x] SubTask 4.1: 在 `PracticeOverlay.tsx` 的 Footer 调用处注释说明：LBL 的 showAnswers 直接使用内部状态，`lineByLineRevealedCount` 只控制行渲染
  - [x] SubTask 4.2: 在 `Footer.tsx` 的 `GradingControlsWrapper` 注释说明：`effectiveInteraction` 直接使用父级 interaction，子 block 不存 interaction
  - [x] SubTask 4.3: 在 `Footer.tsx` 的 `FixedIntervalModeControls` 注释说明：使用 `effectiveAlgorithm` 确保算法判断与渲染决策一致
  - [x] SubTask 4.4: 在 `useLineByLineReview.ts` 文件头注释中补充 showAnswers 信号统一的设计说明

- [x] Task 5: 更新 README 补充算法按钮栏边界说明
  - [x] SubTask 5.1: 在 README 的 LBL 章节中明确三种算法在 LBL 模式下的按钮栏差异（SM2→ShowAnswer+评分, Progressive→Read+Next, FixedTime→Read+Next）
  - [x] SubTask 5.2: 添加"算法按钮栏边界"表格，清晰展示 Normal/LBL 两层级下三种算法的按钮 UI

- [x] Task 6: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 6.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 6.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 1] 和 [Task 2] 可并行执行（修改不同文件的不同区域）
- [Task 3] 可与 [Task 2] 并行执行（同文件不同组件）
- [Task 4] 和 [Task 5] 依赖 [Task 1], [Task 2], [Task 3] 完成后才能准确更新注释和文档
- [Task 6] 依赖所有前置任务
