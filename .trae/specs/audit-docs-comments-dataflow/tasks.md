# Tasks

## Phase 1: MigrateLegacyDataPanel 严重 BUG 修复（P0，最高优先级）

- [x] Task 1: 修复日期格式 BUG
  - [x] 1.1: 在 Phase 5（压缩最新 session 快照）中，将 `toLocaleDateString` + 无效正则替换为 `window.roamAlphaAPI.util.dateToPageTitle(date)` 或项目内的 `dateToRoamDateString` 工具函数
  - [x] 1.2: 在 Phase 6（子 block session 迁移）中，同样替换日期生成逻辑
  - [x] 1.3: 验证迁移后 `nextDueDate:: [[April 14th, 2026]]` 格式可被 `parseRoamDateString` 正确解析

- [x] Task 2: 修复 Phase 6 子 block 字段缺失
  - [x] 2.1: Phase 6 迁移 SM2 子 block 时，如果源数据包含 `grade` 字段，重命名并写入 `sm2_grade`
  - [x] 2.2: Phase 6 迁移 Progressive 子 block 时，从 `progressive_repetitions` 计算 `progressive_interval` 并写入
  - [x] 2.3: 验证迁移后子 block session 数据包含 `SESSION_SNAPSHOT_KEYS` 中的所有必要字段

- [x] Task 3: 修复 Phase 7 createBlock API 调用
  - [x] 3.1: 将 `window.roamAlphaAPI.createBlock` 的 `parentUid` 参数改为 `location: { 'parent-uid': sessionBlock.uid, order: -1 }` 格式
  - [x] 3.2: 为没有 `intervalMultiplier` 的 FIXED_* 卡片写入默认 `fixed_multiplier:: 3`
  - [x] 3.3: 验证迁移后 FixedTime 卡片同时包含 `fixed_multiplier` 和 `fixed_unit` 字段

- [x] Task 4: 迁移工具验证
  - [x] 4.1: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证
  - [x] 4.2: 审查迁移工具所有 Phase，确认迁移后数据与当前 `Session` 类型定义完全一致

## Phase 2: 代码注释全面修正（P1）

- [x] Task 5: 修正 practice.ts 注释
  - [x] 5.1: 更新头部注释，准确描述跨算法字段透传行为（SM2 透传 Progressive 字段、Progressive 透传 SM2 字段、FixedTime 透传两者），说明原因（防止 savePracticeData 重写时丢失字段）
  - [x] 5.2: 在 `supermemo` 函数处添加注释说明 SM2 变体（`interval × eFactor × (grade/5)` 是自定义变体，非标准 SM2）

- [x] Task 6: 修正 useCurrentCardData 注释
  - [x] 6.1: 将 sessions 参数注释从"Complete session history from the initial data fetch"更新为"Latest effective session (wrapped in single-element array for API compatibility)"

- [x] Task 7: 修正 data.ts 注释
  - [x] 7.1: 更新 `intervalMultiplierType` 废弃字段注释，区分"运行时已移除"和"迁移工具仍需处理"

- [x] Task 8: 修正 session.ts 注释
  - [x] 8.1: 在 Session 类型注释中补充 `baseSessionData` 字段的用途说明（同日 Forgot 重评场景，存储前一天的 session 快照）

- [x] Task 9: 修正 Footer.tsx 注释
  - [x] 9.1: 将 LblNextControls 注释从"LBL + Fixed algorithm mode (LBL + Progressive/Fixed)"更新为"LBL + Non-grading algorithm (Progressive / FixedTime)"

- [x] Task 10: 补充 today.ts 注释
  - [x] 10.1: 在 LBL 完成判断逻辑处添加注释，说明 LBL 卡片今天完成但 nextDueDate 仍 <= now 时不计入 completed 的原因

- [x] Task 11: 修正 save.ts 注释
  - [x] 11.1: 在 algorithm/interaction 末尾写入逻辑处添加注释说明设计意图

## Phase 3: 代码逻辑修正（P1）

- [x] Task 12: 修正 save.ts nextDueDate falsy 判断
  - [x] 12.1: 将 `data.nextDueDate || dateUtils.addDays(...)` 改为 `data.nextDueDate !== undefined ? data.nextDueDate : dateUtils.addDays(...)`
  - [x] 12.2: 运行 `npx jest --no-coverage` 验证

- [x] Task 13: 修正 Footer.tsx intervalEstimates 依赖
  - [x] 13.1: 将 `interactionFromSession`、`progressive_repetitions`、`progressive_interval` 添加到 intervalEstimates 的 useMemo 依赖数组
  - [x] 13.2: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证

## Phase 4: 冗余代码清理（P2）

- [x] Task 14: 移除 useLineByLineReview 未使用参数
  - [x] 14.1: 从 `useLineByLineReview` Hook 接口中移除 `isLBLReview` 参数
  - [x] 14.2: 更新 PracticeOverlay.tsx 中的调用，移除 `isLBLReview` 传递
  - [x] 14.3: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证

- [x] Task 15: 移除 sessionOverrides 父 UID 冗余写入
  - [x] 15.1: 在 `useLineByLineReview` 的 `setSessionOverrides` 调用中，移除父 UID 条目中的 `childSessionData` 嵌套
  - [x] 15.2: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证

- [x] Task 16: 消除 PracticeOverlay baseCardData 重复计算
  - [x] 16.1: 将 `onPracticeClick` 中的 `baseCardData` 手动计算替换为直接引用 `useMemo` 的结果
  - [x] 16.2: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证

- [x] Task 17: 移除 PracticeSessionContext 冗余字段
  - [x] 17.1: 从 Context 中移除 `dailyLimit` 和 `historyCleanupKeepCount` 单独提供
  - [x] 17.2: 更新所有消费方，改为从 `settings` 中获取
  - [x] 17.3: 运行 `npx jest --no-coverage` 和 `npm run typecheck` 验证

## Phase 5: 文档更新（P1）

- [x] Task 18: 重写 THEME_SYSTEM.md
  - [x] 18.1: 更新算法色描述为三种：SM2（绿）、Progressive（橙）、FixedTime（蓝）
  - [x] 18.2: 更新所有代码示例中的变量名为 `modeSM2`、`modeProgressive`、`modeFixedTime`
  - [x] 18.3: 更新 FAQ 中的模式色数量描述
  - [x] 18.4: 移除对已删除 `modeSpaced`/`modeFixed` 的所有引用

- [x] Task 19: 审查并更新 README.md
  - [x] 19.1: 审查 README 中所有技术描述是否与当前代码一致
  - [x] 19.2: 确认数据模型描述与当前 Session 类型定义一致
  - [x] 19.3: 确认数据迁移说明与当前 MigrateLegacyDataPanel 功能一致
  - [x] 19.4: 确认架构描述与当前代码结构一致

## Phase 6: 全量验证

- [x] Task 20: 全量验证
  - [x] 20.1: 运行 `npx jest --no-coverage` 全部通过
  - [x] 20.2: 运行 `npm run typecheck` 无错误
  - [x] 20.3: 全局搜索确认无残留的过时注释或冗余代码
  - [x] 20.4: 验证 MigrateLegacyDataPanel 迁移后数据与当前 Session 类型完全一致

# Task Dependencies

- Task 2 depends on Task 1（字段缺失修复可与日期格式修复并行，但同在 Phase 1 内）
- Task 3 depends on nothing（Phase 7 修复独立）
- Task 4 depends on Task 1, 2, 3（验证需在所有修复完成后）
- Task 5-11（注释修正）— 可并行，互不依赖
- Task 12-13（逻辑修正）— 可并行，互不依赖
- Task 14-17（冗余清理）— 可并行，互不依赖
- Task 18-19（文档更新）— 可并行，互不依赖
- Task 20 depends on Task 1-19（全量验证需在所有修改完成后）
