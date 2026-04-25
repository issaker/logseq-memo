# Tasks

- [x] Task 1: 修复 onLineByLineGrade — 引入 baseSessionData 同日覆盖语义
  - [x] SubTask 1.1: 在 `onLineByLineGrade` 的 LblNext 分支中，检测子 block 是否为同日重学（`isSameDay(childSession.dateCreated, now) && childSession.sm2_grade !== 0`），若是则使用 `existingChildSession.baseSessionData` 作为 `generatePracticeData` 的计算基数
  - [x] SubTask 1.2: 在 `onLineByLineGrade` 的 SM2 分支中，同样引入 baseSessionData 语义：同日重学且 grade !== 0 时使用 `baseSessionData` 作为基数
  - [x] SubTask 1.3: 确保 Forgot（grade = 0）不受同日覆盖保护，始终使用当日数据
  - [x] SubTask 1.4: 当 `baseSessionData` 不存在时（首次学习或跨日学习），回退到使用 `existingChildSession`

- [x] Task 2: 修复 effectiveBaseCardData — LBL 模式下使用 baseSessionData
  - [x] SubTask 2.1: 修改 `PracticeOverlay.tsx` 中的 `effectiveBaseCardData` useMemo：当子 block 存在 `baseSessionData` 且为同日重学场景时，使用 `baseSessionData` 作为基础
  - [x] SubTask 2.2: 确保非同日场景和首次学习场景不受影响

- [x] Task 3: 移除死代码 — sessionOverrides 对子 block UID 的写入
  - [x] SubTask 3.1: 在 `onLineByLineGrade` 的 LblNext 分支中，移除 `sessionOverrides[childUid]` 的写入，仅保留 `sessionOverrides[currentCardRefUid]`（父级）
  - [x] SubTask 3.2: 在 `onLineByLineGrade` 的 SM2 分支中，同样移除 `sessionOverrides[childUid]` 的写入

- [x] Task 4: 优化 getChildSessionData — 优先使用 practiceData
  - [x] SubTask 4.1: 修改 `PracticeOverlay.tsx` 中 `getChildSessionData` 的调用，传入 `practiceData` 作为 `existingPluginPageData`
  - [x] SubTask 4.2: 确保 `getChildSessionData` 在 `existingPluginPageData` 中找不到对应 UID 时仍做全量查询

- [x] Task 5: 更新注释 — 补充 LBL 子 block 同日覆盖语义说明
  - [x] SubTask 5.1: 在 `useLineByLineReview.ts` 文件头注释中补充同日覆盖语义的架构说明
  - [x] SubTask 5.2: 在 `onLineByLineGrade` 的 baseSessionData 逻辑处添加内联注释

- [x] Task 6: 验证 — 运行 lint 和 typecheck
  - [x] SubTask 6.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 6.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 1] 和 [Task 2] 可并行执行（不同逻辑但同文件）
- [Task 3] 可与 [Task 1] 合并执行（同一函数内的修改）
- [Task 4] 独立于 [Task 1]-[Task 3]
- [Task 5] 依赖 [Task 1], [Task 2], [Task 3]
- [Task 6] 依赖所有前置任务
