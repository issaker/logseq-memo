# Tasks

## Phase 1: 文档精简与对齐

- [x] Task 1: 精简 CHANGELOG.md — 删除 v1-v21 旧版本详细历史，仅保留简明版本信息或清空
- [x] Task 2: 审查 README.md — 确认架构描述、数据模型、功能列表与当前代码一致，修正任何过时描述
- [x] Task 3: 审查 THEME_SYSTEM.md — 确认颜色定义与 theme.ts 一致，代码示例使用当前变量名

## Phase 2: 代码注释语言统一

- [x] Task 4: 翻译 session.ts 中文注释为英文
- [x] Task 5: 翻译 practice.ts 中文注释为英文
- [x] Task 6: 翻译 data.ts 中文注释为英文
- [x] Task 7: 翻译 save.ts 中文注释为英文
- [x] Task 8: 翻译 today.ts 中文注释为英文
- [x] Task 9: 翻译 useLineByLineReview.ts 中文注释为英文
- [x] Task 10: 翻译 useCurrentCardData.tsx 中文注释为英文
- [x] Task 11: 翻译 PracticeOverlay.tsx 中文注释为英文（保留 UI 显示文本如"今日已学习"）
- [x] Task 12: 扫描其余源文件中的中文注释并翻译为英文

## Phase 3: 代码逻辑优化

- [x] Task 13: 优化 today.ts getDueCardUids — shuffleCards=true 时跳过排序直接洗牌
  - [x] 将 `shuffleCards` 参数传入 `getDueCardUids`，在函数内部根据 shuffleCards 决定是否调用排序
  - [x] 确保 shuffleCards=false 时排序逻辑不变

## Phase 4: 命名规范审查与代码精益化

- [x] Task 14: 审查 Session 类型字段命名 — 确认所有字段遵循 `{owner}_{purpose}` 规范
- [x] Task 15: 审查导出函数命名 — 确认函数名清晰表达用途，无歧义缩写
- [x] Task 16: 系统性清理死代码和未使用的导入
  - [x] 运行 typecheck 检查未使用导入
  - [x] 全局搜索被注释掉的代码块、临时调试代码
  - [x] 清理发现的死代码（移除 PracticeOverlay.tsx 中未使用的 ALGORITHM_META 导入）

## Phase 5: 数据迁移模块审查

- [x] Task 17: 审查 MigrateLegacyDataPanel Phase 6 — 确认 SM2 子 block 迁移后包含 `sm2_grade`（修复了旧字段名 fallback 和重复 block bug）
- [x] Task 18: 审查 MigrateLegacyDataPanel Phase 6 — 确认 Progressive 子 block 迁移后包含 `progressive_interval`（修复了从 `progressive_repetitions` 计算的逻辑）
- [x] Task 19: 审查 MigrateLegacyDataPanel Phase 7 — 确认 FixedTime 卡片迁移后包含 `fixed_multiplier` 和 `fixed_unit`
- [x] Task 20: 对比 MigrateLegacyDataPanel 迁移产出字段与 SESSION_SNAPSHOT_KEYS + Session 类型定义，确认 100% 匹配

## Phase 6: 最终验证

- [x] Task 21: 运行 `npm test -- --no-coverage` 确认全部 119 测试通过
- [x] Task 22: 运行 `npm run typecheck` 确认无类型错误
- [x] Task 23: 全局搜索确认无残留中文注释（UI 显示文本除外）
- [x] Task 24: 全局搜索确认无残留死代码或未使用导入

## Bonus: 修复预存 Bug

- [x] 修复 date.ts 类型错误（添加 Date 类型注解，使用 getTime() 替代 Date 减法）
- [x] 修复 PracticeOverlay.tsx daysBetween 传入 undefined 的运行时错误

# Task Dependencies

- Task 13 depends on Task 8 (today.ts 注释翻译应先完成)
- Task 16 depends on Task 4-12 (注释翻译完成后更容易发现死代码)
- Task 17-20 are independent of each other but should be done together
- Task 21-24 depend on all previous tasks
