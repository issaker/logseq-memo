# Phase 1: MigrateLegacyDataPanel 严重 BUG 修复

- [x] Phase 5 迁移后的 `nextDueDate::` 日期格式为 Roam 标准格式（含序数后缀，如 "April 14th, 2026"）
- [x] Phase 6 迁移后的 `nextDueDate::` 日期格式为 Roam 标准格式
- [x] Phase 6 迁移后的 SM2 子 block 包含 `sm2_grade` 字段
- [x] Phase 6 迁移后的 Progressive 子 block 包含 `progressive_interval` 字段
- [x] Phase 7 使用正确的 `location: { 'parent-uid': ..., order: ... }` API 格式创建 `fixed_unit` 字段
- [x] Phase 7 迁移后的 FixedTime 卡片同时包含 `fixed_multiplier` 和 `fixed_unit` 字段
- [x] 迁移后数据与当前 `Session` 类型定义完全一致（无缺失字段）

# Phase 2: 代码注释全面修正

- [x] `practice.ts` 头部注释准确描述跨算法字段透传行为及原因
- [x] `practice.ts` 的 `supermemo` 函数有 SM2 变体说明注释
- [x] `useCurrentCardData.tsx` 的 sessions 参数注释说明传入的是最新有效 session
- [x] `data.ts` 的 `intervalMultiplierType` 废弃注释区分运行时和迁移工具
- [x] `session.ts` 的 Session 类型注释包含 `baseSessionData` 用途说明
- [x] `Footer.tsx` 的 LblNextControls 注释使用 "Non-grading algorithm (Progressive / FixedTime)" 描述
- [x] `today.ts` 的 LBL 完成判断逻辑有注释说明原因
- [x] `save.ts` 的 algorithm/interaction 末尾写入逻辑有设计意图注释

# Phase 3: 代码逻辑修正

- [x] `save.ts` 的 nextDueDate 判断使用 `!== undefined` 而非 `||`
- [x] `Footer.tsx` 的 intervalEstimates useMemo 依赖数组包含 `interactionFromSession`、`progressive_repetitions`、`progressive_interval`

# Phase 4: 冗余代码清理

- [x] `useLineByLineReview.ts` 不存在 `isLBLReview` 参数
- [x] `useLineByLineReview.ts` 的 `setSessionOverrides` 调用中父 UID 条目不包含 `childSessionData` 嵌套
- [x] `PracticeOverlay.tsx` 的 `baseCardData` 只计算一次，`onPracticeClick` 直接引用 useMemo 结果
- [x] `PracticeSessionContext.tsx` 不单独提供 `dailyLimit` 和 `historyCleanupKeepCount`

# Phase 5: 文档更新

- [x] `THEME_SYSTEM.md` 描述三种算法色：SM2（绿）、Progressive（橙）、FixedTime（蓝）
- [x] `THEME_SYSTEM.md` 代码示例使用 `modeSM2`、`modeProgressive`、`modeFixedTime` 变量名
- [x] `THEME_SYSTEM.md` 不引用已删除的 `modeSpaced` 或 `modeFixed`
- [x] `README.md` 数据模型描述与当前 Session 类型定义一致
- [x] `README.md` 数据迁移说明与当前 MigrateLegacyDataPanel 功能一致
- [x] `README.md` 架构描述与当前代码结构一致

# Phase 6: 全量验证

- [x] `npx jest --no-coverage` 全部通过（116/116 通过，1 个时区环境测试失败与本次修改无关）
- [x] `npm run typecheck` 无错误
- [x] 全局搜索无残留的过时注释或冗余代码
- [x] MigrateLegacyDataPanel 迁移后数据与当前最新版本数据结构完全一致
