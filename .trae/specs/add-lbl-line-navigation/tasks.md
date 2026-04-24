# Tasks

- [x] Task 1: 在 useLineByLineReview 中实现上下翻行导航回调
  - [x] SubTask 1.1: 新增 `onLineByLineNavigateUp` 回调 — 将 `lineByLineCurrentChildIndex` 减 1（边界检查 ≥ 0），更新 `lineByLineRevealedCount` 为 `max(revealedCount, currentIndex + 1)`
  - [x] SubTask 1.2: 新增 `onLineByLineNavigateDown` 回调 — 将 `lineByLineCurrentChildIndex` 加 1（边界检查 < childUidsList.length），更新 `lineByLineRevealedCount` 为 `max(revealedCount, currentIndex + 1)`
  - [x] SubTask 1.3: 在 `onLineByLineNavigateUp` 中处理 `lineByLineIsCardComplete` 为 true 时的回退（从 `childUidsList.length` 回退到 `childUidsList.length - 1`）
  - [x] SubTask 1.4: 更新 `UseLineByLineReviewOutput` 接口，新增 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown`

- [x] Task 2: 在 PracticeOverlay 中集成上下翻行导航并处理 showAnswers 重置
  - [x] SubTask 2.1: 从 `useLineByLineReview` 解构新增的 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown`
  - [x] SubTask 2.2: 在 `MainContext` 的 `MainContextProps` 接口中新增 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown`（仅在 LBL 模式下有值）
  - [x] SubTask 2.3: 在 `mainContextValue` 的 useMemo 中传入导航回调
  - [x] SubTask 2.4: 在导航回调中处理 `showAnswers` 重置逻辑 — 根据目标子 block 的算法和到期状态设置正确的 showAnswers 值（SM2 到期 → false，LblNext/已掌握 → true）
  - [x] SubTask 2.5: 导航回调中处理 `lineByLineIsCardComplete` 从 true 变为 false 的情况

- [x] Task 3: 在 Footer 中添加 ▲/▼ 按钮和 ↑/↓ 快捷键
  - [x] SubTask 3.1: 在 `GradingControlsWrapper` 中，LBL 模式下在 ◀/▶ 按钮旁新增 ▲/▼ 按钮，使用相同的 bp3-button bp3-minimal 样式
  - [x] SubTask 3.2: 在 `LblCompletedControls` 中新增 ▲ 按钮，允许从完成状态回退
  - [x] SubTask 3.3: 从 `MainContext` 获取 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown`
  - [x] SubTask 3.4: 新增 `up` 和 `down` 快捷键绑定，仅在 LBL 模式下生效（通过 `isLineByLine` context 判断 disabled 状态）
  - [x] SubTask 3.5: ▲ 按钮在第一个子 block 时 disabled，▼ 按钮在最后一个子 block 时 disabled

- [x] Task 4: 验证学习记录覆盖机制在 LBL 模式下的正确性
  - [x] SubTask 4.1: 审查 `savePracticeData` 的同日去重逻辑，确认对 LBL 子 block 的 session 写入正确触发同日覆盖（而非创建新 session block）
  - [x] SubTask 4.2: 审查 `onLineByLineGrade` 中的 `setChildSessionData` 更新逻辑，确认回溯重新评分后 childSessionData 即时更新
  - [x] SubTask 4.3: 审查 `updateParentNextDueDate` 在回溯重新评分后是否正确更新父 block 的 nextDueDate
  - [x] SubTask 4.4: 确认 `sessionOverrides` 在回溯重新评分后正确更新，确保乐观更新数据一致

- [x] Task 5: 端到端功能验证
  - [x] SubTask 5.1: 验证 SM2 算法下上下翻行和重新评分功能
  - [x] SubTask 5.2: 验证 Progressive 算法下上下翻行功能
  - [x] SubTask 5.3: 验证 FixedTime 算法下上下翻行功能
  - [x] SubTask 5.4: 验证混合算法子 block 间翻行时 Footer UI 正确切换
  - [x] SubTask 5.5: 验证 LBL 卡片完成后上下翻行功能
  - [x] SubTask 5.6: 验证上下翻行与左右翻页互不干扰
  - [x] SubTask 5.7: 验证多次回溯重新评分的学习记录准确性
  - [x] SubTask 5.8: 验证 ↑/↓ 快捷键在 LBL 和非 LBL 模式下的行为

# Task Dependencies

- [Task 2] depends on [Task 1] — PracticeOverlay 需要使用 useLineByLineReview 的新回调
- [Task 3] depends on [Task 2] — Footer 需要从 MainContext 获取导航回调
- [Task 4] depends on [Task 1] — 验证需要在导航回调实现后进行
- [Task 5] depends on [Task 3] and [Task 4] — 端到端验证需要所有功能实现完成
