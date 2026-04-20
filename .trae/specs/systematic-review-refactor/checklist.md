# Phase 1: 文档精简与对齐

- [x] CHANGELOG.md 不包含 v1-v21 的详细提交历史
- [x] README.md 架构描述与当前代码一致（SchedulingAlgorithm × InteractionStyle、三种算法、两种交互）
- [x] README.md 数据模型描述与当前 Session 类型定义一致
- [x] README.md 功能列表与当前代码一致（含 DailyNote Deck、Swap Q/A）
- [x] THEME_SYSTEM.md 颜色定义与 theme.ts 一致
- [x] THEME_SYSTEM.md 代码示例使用当前变量名（modeSM2、modeProgressive、modeFixedTime）

# Phase 2: 代码注释语言统一

- [x] `src/models/session.ts` 无中文注释
- [x] `src/practice.ts` 无中文注释
- [x] `src/queries/data.ts` 无中文注释
- [x] `src/queries/save.ts` 无中文注释
- [x] `src/queries/today.ts` 无中文注释
- [x] `src/hooks/useLineByLineReview.ts` 无中文注释
- [x] `src/hooks/useCurrentCardData.tsx` 无中文注释
- [x] `src/components/overlay/PracticeOverlay.tsx` 无中文注释（UI 显示文本除外）
- [x] 其余源文件无中文注释（UI 显示文本除外）

# Phase 3: 代码逻辑优化

- [x] `getDueCardUids` 在 shuffleCards=true 时不执行排序，直接返回洗牌结果
- [x] `getDueCardUids` 在 shuffleCards=false 时排序逻辑不变（nextDueDate → eFactor → repetitions）

# Phase 4: 命名规范审查与代码精益化

- [x] Session 类型所有字段遵循 `{owner}_{purpose}` 规范（sm2_*、progressive_*、fixed_*）
- [x] 导出函数名清晰表达用途，无歧义缩写
- [x] `npm run typecheck` 无未使用导入警告
- [x] 全局搜索无被注释掉的代码块
- [x] 全局搜索无临时调试代码

# Phase 5: 数据迁移模块审查

- [x] Phase 6 SM2 子 block 迁移后包含 `algorithm`、`interaction`、`nextDueDate`、`sm2_grade`、`sm2_interval`、`sm2_repetitions`、`sm2_eFactor`
- [x] Phase 6 Progressive 子 block 迁移后包含 `progressive_interval`（从 `progressive_repetitions` 计算）
- [x] Phase 7 FixedTime 卡片迁移后包含 `algorithm:: FIXED_TIME`、`fixed_unit`、`fixed_multiplier`
- [x] MigrateLegacyDataPanel 迁移产出字段与 SESSION_SNAPSHOT_KEYS + Session 类型定义 100% 匹配

# Phase 6: 最终验证

- [x] `npm test -- --no-coverage` 全部 119 测试通过
- [x] `npm run typecheck` 无错误
- [x] 全局搜索无残留中文注释（UI 显示文本除外）
- [x] 全局搜索无残留死代码或未使用导入
