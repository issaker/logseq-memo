# 系统性项目审查、重构与优化 Spec

## Why

项目经过 5 轮重构（ux-review-refactor、refactor-reviewmode-resolution、optimize-compat-lbl-docs、audit-docs-comments-dataflow、add-dailynote-deck-revise-settings-save），核心架构已升级到 `SchedulingAlgorithm × InteractionStyle` 两维正交设计，数据模型统一为 session-block 架构，向后兼容代码已清除。但系统仍存在以下问题需要系统性清理：

1. **文档冗余**：CHANGELOG.md 包含 314 行旧版本历史（v1-v21），对理解当前架构无帮助；README.md 和 THEME_SYSTEM.md 基本准确但可进一步精简
2. **代码注释语言混用**：核心文件中中英文注释混用（session.ts、practice.ts、useLineByLineReview.ts 等），降低可扫描性
3. **命名规范未完全对齐**：用户要求 `前缀所属部门_后缀明确用途` 格式（如 `memo_title`、`ui_button_confirm`），当前代码中变量命名风格不统一
4. **代码精益化不足**：PracticeOverlay.tsx 仍有 835 行、MigrateLegacyDataPanel.tsx 有 1407 行、today.ts 排序与洗牌互斥问题仍存在
5. **数据迁移模块审查**：需确认迁移后数据结构与当前代码定义 100% 匹配

## 架构诊断结论

**情况 A（优良架构）**：经过多轮重构，当前架构清晰、模块解耦良好：

- ✅ `SchedulingAlgorithm × InteractionStyle` 两维正交设计，消除 _LBL 后缀耦合
- ✅ 统一 session-block 数据架构，最新 session 为 single source of truth
- ✅ PracticeSessionContext 替代 Props Drilling
- ✅ 无运行时向后兼容，数据迁移为唯一升级路径
- ✅ SettingsForm 统一设置 UI
- ✅ THEME_SYSTEM.md 与 theme.ts 一致

**但需执行安全优化**（非架构重构）：
- 代码精益化（清理冗余、统一注释语言、精简文档）
- 修复已知小问题（排序/洗牌互斥、命名对齐）
- 数据迁移模块专项审查

**严禁为了重构而重构**——现有架构已足够清晰。

## What Changes

- **CHANGELOG.md 精简**：删除 v1-v21 旧版本历史，仅保留最近版本或直接清空
- **代码注释统一为英文**：将所有中文注释翻译为英文，保持项目风格一致
- **today.ts 排序/洗牌优化**：当 shuffleCards=true 时跳过排序直接洗牌
- **命名规范审查与对齐**：检查所有变量与函数，确保符合 `模块前缀_具体用途` 规范
- **代码精益化**：系统性清理死代码、未使用的导入、冗余逻辑
- **数据迁移模块审查**：确认 MigrateLegacyDataPanel 迁移后数据结构与当前 Session 类型定义完全匹配
- **README.md / THEME_SYSTEM.md 最终审查**：确保文档与代码完全一致

## Impact

- Affected specs: audit-docs-comments-dataflow, optimize-compat-lbl-docs
- Affected code:
  - `CHANGELOG.md` — 删除旧版本历史
  - `src/models/session.ts` — 中文注释翻译为英文
  - `src/practice.ts` — 中文注释翻译为英文
  - `src/queries/data.ts` — 中文注释翻译为英文
  - `src/queries/save.ts` — 中文注释翻译为英文
  - `src/queries/today.ts` — 排序/洗牌优化 + 中文注释翻译
  - `src/hooks/useLineByLineReview.ts` — 中文注释翻译为英文
  - `src/hooks/useCurrentCardData.tsx` — 中文注释翻译为英文
  - `src/components/overlay/PracticeOverlay.tsx` — 中文注释翻译为英文
  - `src/components/MigrateLegacyDataPanel.tsx` — 迁移数据完整性审查
  - `README.md` — 最终审查与微调
  - `THEME_SYSTEM.md` — 最终审查与微调

---

## ADDED Requirements

### Requirement: CHANGELOG.md 精简

系统 SHALL 精简 CHANGELOG.md，删除对理解当前架构无帮助的旧版本历史。

#### Scenario: CHANGELOG.md 内容
- **WHEN** 查看 CHANGELOG.md
- **THEN** 不包含 v1-v21 的详细提交历史
- **AND** 仅保留对理解当前版本有用的简明信息或为空

### Requirement: 代码注释语言统一

系统 SHALL 将所有代码中的中文注释翻译为英文，保持项目风格一致。

#### Scenario: session.ts 注释
- **WHEN** 查看 `src/models/session.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: practice.ts 注释
- **WHEN** 查看 `src/practice.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: data.ts 注释
- **WHEN** 查看 `src/queries/data.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: save.ts 注释
- **WHEN** 查看 `src/queries/save.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: today.ts 注释
- **WHEN** 查看 `src/queries/today.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: useLineByLineReview.ts 注释
- **WHEN** 查看 `src/hooks/useLineByLineReview.ts`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: useCurrentCardData.tsx 注释
- **WHEN** 查看 `src/hooks/useCurrentCardData.tsx`
- **THEN** 所有注释为英文，无中文注释

#### Scenario: PracticeOverlay.tsx 注释
- **WHEN** 查看 `src/components/overlay/PracticeOverlay.tsx`
- **THEN** 所有注释为英文，无中文注释（UI 显示文本除外，如"今日已学习"提示）

### Requirement: today.ts 排序/洗牌优化

系统 SHALL 在 `getDueCardUids` 中，当启用洗牌时跳过排序直接洗牌，避免无意义的排序开销。

#### Scenario: shuffleCards=true 时跳过排序
- **WHEN** `getDueCardUids` 被调用且 `shuffleCards=true`
- **THEN** 不执行排序逻辑，直接返回洗牌后的结果

#### Scenario: shuffleCards=false 时正常排序
- **WHEN** `getDueCardUids` 被调用且 `shuffleCards=false`
- **THEN** 按现有三级优先级排序（nextDueDate → eFactor → repetitions）

### Requirement: 命名规范对齐

系统 SHALL 审查所有变量与函数命名，确保符合 `模块前缀_具体用途` 规范。当前代码已基本遵循 `{owner}_{purpose}` 规范（如 `sm2_grade`、`progressive_interval`、`fixed_multiplier`），需确认无遗漏。

#### Scenario: 数据字段命名
- **WHEN** 查看 Session 类型定义和 SESSION_SNAPSHOT_KEYS
- **THEN** 所有字段遵循 `{owner}_{purpose}` 规范

#### Scenario: 函数命名
- **WHEN** 查看导出的函数名
- **THEN** 函数名清晰表达用途，无歧义缩写

### Requirement: 代码精益化

系统 SHALL 系统性清理死代码、未使用的导入、冗余逻辑。

#### Scenario: 无未使用的导入
- **WHEN** 运行 `npm run typecheck`
- **THEN** 无未使用导入的警告

#### Scenario: 无死代码
- **WHEN** 全局搜索项目源码
- **THEN** 不存在被注释掉的代码块、临时调试代码、或未使用的导出

### Requirement: 数据迁移模块审查

系统 SHALL 审查 MigrateLegacyDataPanel，确认迁移后数据结构与当前 Session 类型定义 100% 匹配。

#### Scenario: Phase 6 迁移后子 block 包含所有必要字段
- **WHEN** Phase 6 迁移 SM2 算法的子 block
- **THEN** 迁移后数据包含 `algorithm`、`interaction`、`nextDueDate`、`sm2_grade`、`sm2_interval`、`sm2_repetitions`、`sm2_eFactor`

#### Scenario: Phase 6 迁移后 Progressive 子 block 包含 progressive_interval
- **WHEN** Phase 6 迁移 Progressive 算法的子 block
- **THEN** 迁移后数据包含 `progressive_interval`（从 `progressive_repetitions` 计算）

#### Scenario: Phase 7 迁移后 FixedTime 卡片包含完整字段
- **WHEN** Phase 7 迁移 FIXED_DAYS/WEEKS/MONTHS/YEARS 卡片
- **THEN** 迁移后数据包含 `algorithm:: FIXED_TIME`、`fixed_unit`、`fixed_multiplier`

### Requirement: 文档最终审查

系统 SHALL 确保 README.md 和 THEME_SYSTEM.md 与当前代码完全一致。

#### Scenario: README.md 准确性
- **WHEN** 查看 README.md
- **THEN** 架构描述、数据模型、功能列表与当前代码一致
- **AND** 无过时或错误的描述

#### Scenario: THEME_SYSTEM.md 准确性
- **WHEN** 查看 THEME_SYSTEM.md
- **THEN** 颜色定义与 `theme.ts` 一致
- **AND** 代码示例使用当前变量名

## MODIFIED Requirements

### Requirement: 代码注释风格

旧实现中核心文件存在中英文注释混用，现统一为英文注释（UI 显示文本除外）。

## REMOVED Requirements

### Requirement: CHANGELOG 历史版本详情
**Reason**: v1-v21 的详细提交历史对理解当前架构无帮助，属于历史噪音
**Migration**: 如需查看历史，可通过 git log 获取
