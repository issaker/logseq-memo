# 系统性文档与代码审查清理 Spec

## Why

项目经过多轮重构（ux-review-refactor、optimize-compat-lbl-docs），架构已升级到 `SchedulingAlgorithm × InteractionStyle` 两维正交设计，但文档、注释和数据迁移模块存在严重的与实际代码不同步的问题。THEME_SYSTEM.md 引用已删除的模式色名，practice.ts 头部注释声称"不透传其他算法字段"但代码实际做了透传，MigrateLegacyDataPanel 存在日期格式 BUG 和字段缺失等严重数据损坏风险。需要系统性审查并修正所有不一致。

## What Changes

- **README 优化**：审查并更新过时内容，确保文档准确反映当前架构
- **THEME_SYSTEM.md 重写**：从两种模式色更新为三种算法色（SM2/Progressive/FixedTime）
- **代码注释全面修正**：修正 practice.ts 透传注释、useCurrentCardData sessions 注释、data.ts 废弃字段注释等所有与代码实现不匹配的注释
- **MigrateLegacyDataPanel 严重 BUG 修复**：
  - 日期格式 BUG（`toLocaleDateString` 不产生序数后缀，导致迁移后日期无法被 Roam 解析）
  - Phase 6 缺少 `sm2_grade` 和 `progressive_interval` 字段
  - Phase 7 `createBlock` API 参数格式错误
  - FIXED_* 卡片缺少 `fixed_multiplier` 字段
- **数据流审查与修正**：审查三种算法模式 × LBL 模式的完整数据流，修正 `save.ts` 的 nextDueDate falsy 判断、`Footer.tsx` 的 intervalEstimates 依赖缺失等
- **冗余代码清理**：移除 `useLineByLineReview` 未使用的 `isLBLReview` 参数、`sessionOverrides` 中父 UID 条目的 `childSessionData` 冗余写入、`PracticeOverlay` 的 `baseCardData` 重复计算
- **命名规范对齐**：确认并统一所有数据字段遵循 `{owner}_{purpose}` 命名规范

## Impact

- Affected specs: ux-review-refactor, optimize-compat-lbl-docs
- Affected code:
  - `src/components/MigrateLegacyDataPanel.tsx` — 修复日期格式 BUG、补全缺失字段、修正 API 调用
  - `src/practice.ts` — 修正头部注释（字段透传说明）
  - `src/queries/data.ts` — 修正废弃字段注释
  - `src/queries/save.ts` — 修正 nextDueDate falsy 判断
  - `src/queries/today.ts` — 补充 LBL 完成判断注释
  - `src/hooks/useCurrentCardData.tsx` — 修正 sessions 参数注释
  - `src/hooks/useLineByLineReview.ts` — 移除未使用参数、清理冗余写入
  - `src/components/overlay/PracticeOverlay.tsx` — 提取 baseCardData 共享逻辑
  - `src/components/overlay/Footer.tsx` — 修正 intervalEstimates 依赖、修正注释
  - `src/contexts/PracticeSessionContext.tsx` — 移除冗余字段
  - `THEME_SYSTEM.md` — 重写为三种算法色
  - `README.md` — 审查并更新

---

## 审查分析报告

### 一、MigrateLegacyDataPanel 严重 BUG

#### BUG 1：日期格式损坏（P0 严重）

**位置**：Phase 5（L883-889）、Phase 6（L1036-1040, L1081-1085）

**问题**：使用 `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })` 生成日期字符串，输出格式为 `"January 1, 2024"`。Roam Research 期望的日期格式是 `"January 1st, 2024"`（含序数后缀）。附加的 `.replace(/(\d+)(st|nd|rd|th)/, '$1$2')` 正则永远不匹配，因为 `toLocaleDateString` 不产生序数后缀。

**影响**：迁移后的 `nextDueDate:: [[January 1, 2024]]` 无法被 `parseRoamDateString`（即 `window.roamAlphaAPI.util.pageTitleToDate`）正确解析，导致卡片永远显示为到期或永远不到期。

**修复**：使用 `window.roamAlphaAPI.util.dateToPageTitle(date)` 或项目内的 `dateToRoamDateString` 工具函数生成正确的 Roam 日期格式。

#### BUG 2：Phase 6 子 block 缺少 sm2_grade（P0 严重）

**位置**：Phase 6（L1075-1092）

**问题**：迁移子 block session 时，写入了 `sm2_interval`、`sm2_repetitions`、`sm2_eFactor`，但没有写入 `sm2_grade`。

**影响**：SM2 算法的子 block 迁移后没有 `sm2_grade` 字段，`getEmojiFromGrade` 在 `sm2_grade === undefined` 时返回白圈，导致 session 标题 Emoji 显示异常。

**修复**：Phase 6 迁移子 block 时，如果源数据包含 `grade` 字段，重命名并写入 `sm2_grade`。

#### BUG 3：Phase 6 子 block 缺少 progressive_interval（P1 中等）

**位置**：Phase 6（L1091）

**问题**：写入了 `progressive_repetitions` 但没有写入 `progressive_interval`。

**影响**：`mergeSessionSnapshot` 期望最新 session 是完整快照，缺少此字段可能导致数据不完整。

**修复**：Phase 6 迁移子 block 时，从 `progressive_repetitions` 计算 `progressive_interval` 并写入。

#### BUG 4：Phase 7 createBlock API 参数错误（P0 严重）

**位置**：Phase 7（L1208-1211）

**问题**：`window.roamAlphaAPI.createBlock` 使用了 `parentUid` 参数名，但 Roam API 的正确参数格式是 `location: { 'parent-uid': ..., order: ... }`。

**影响**：`fixed_unit` 字段创建失败，FixedTime 卡片迁移后缺少 `fixed_unit` 字段。

**修复**：改为 `location: { 'parent-uid': sessionBlock.uid, order: -1 }`。

#### BUG 5：FIXED_* 卡片缺少 fixed_multiplier（P1 中等）

**位置**：Phase 7

**问题**：旧 FIXED_DAYS/WEEKS/MONTHS/YEARS 卡片如果没有 `intervalMultiplier` 字段，迁移后只有 `fixed_unit` 而没有 `fixed_multiplier`。

**影响**：FixedTime 卡片迁移后缺少 `fixed_multiplier`，代码默认值为 3，但数据页上缺少此字段。

**修复**：Phase 7 为没有 `fixed_multiplier` 的 FIXED_* 卡片写入默认值 `fixed_multiplier:: 3`。

### 二、代码注释与代码实现不一致

#### 问题 1：practice.ts 字段透传注释与实际代码矛盾

**位置**：`src/practice.ts` 头部注释

**问题**：注释声称"每个算法只输出自己的字段，其他算法的字段不透传"，但代码实际做了透传（SM2 路径传递 `progressive_repetitions` 和 `progressive_interval`，Progressive 路径传递所有 SM2 字段）。

**影响**：误导开发者理解数据流，可能导致修改时遗漏字段。

**修复**：更新注释准确描述透传行为及其原因（防止 savePracticeData 重写时丢失字段）。

#### 问题 2：useCurrentCardData sessions 参数注释

**位置**：`src/hooks/useCurrentCardData.tsx` L7

**问题**：注释说"sessions prop — Complete session history from the initial data fetch"，但实际传入的是 `[effectiveSession]`（单元素数组）。

**修复**：更新注释为"Latest effective session (wrapped in single-element array for API compatibility)"。

#### 问题 3：data.ts 废弃字段注释

**位置**：`src/queries/data.ts` L141

**问题**：注释说"已移除的废弃字段：intervalMultiplierType（幽灵字段，无实际用途）"，但 MigrateLegacyDataPanel Phase 4 的 `FIELDS_TO_DELETE` 仍然包含此字段。

**修复**：更新注释说明此字段在迁移工具中仍需处理（删除旧数据中的残留），但在运行时已不再使用。

#### 问题 4：Footer.tsx LblNextControls 注释

**位置**：`src/components/overlay/Footer.tsx` L378

**问题**：注释说"LBL + Fixed algorithm mode (LBL + Progressive/Fixed)"，描述混用了 Fixed 和 Progressive/Fixed。

**修复**：统一为"LBL + Non-grading algorithm (Progressive / FixedTime)"。

#### 问题 5：today.ts LBL 完成判断缺少注释

**位置**：`src/queries/today.ts` L82-85

**问题**：LBL 卡片如果今天完成但 nextDueDate 仍 <= now，则不计入 completed。这个逻辑没有注释说明原因。

**修复**：添加注释说明此逻辑的目的（防止 LBL 卡片子 block 未全部完成时被误计为已完成）。

### 三、代码逻辑问题

#### 问题 1：save.ts nextDueDate falsy 判断（P1 中等）

**位置**：`src/queries/save.ts` L214

**问题**：`const nextDueDate = data.nextDueDate || dateUtils.addDays(referenceDate, data.sm2_interval);` — 当 `data.nextDueDate` 为 falsy 值（如 `new Date(0)` 即 1970-01-01）时，会错误地回退到 `sm2_interval` 计算。

**修复**：改为 `data.nextDueDate !== undefined ? data.nextDueDate : dateUtils.addDays(referenceDate, data.sm2_interval)`。

#### 问题 2：Footer.tsx intervalEstimates 依赖缺失（P1 中等）

**位置**：`src/components/overlay/Footer.tsx` L201

**问题**：`useMemo` 依赖数组缺少 `interactionFromSession`、`progressive_repetitions`、`progressive_interval`。当这些值变化时，estimates 不会更新。

**修复**：将缺失的依赖添加到 useMemo 依赖数组。

#### 问题 3：today.ts 排序与洗牌互斥问题（P2 低）

**位置**：`src/queries/today.ts` L185-212

**问题**：`getDueCardUids` 中，当 `shuffleCards=true` 时，排序结果会被 Fisher-Yates 洗牌完全打乱，排序逻辑变得无意义。

**修复**：先判断是否需要洗牌，如果需要洗牌则跳过排序直接洗牌。

### 四、冗余代码

#### 问题 1：useLineByLineReview 未使用参数

**位置**：`src/hooks/useLineByLineReview.ts` L102

**问题**：`isLBLReview: _isLBLReview` 参数以下划线前缀标记为未使用，实际逻辑使用 `isLBLReviewMode`（从 interaction 派生）。

**修复**：移除 `isLBLReview` 参数，更新所有调用方。

#### 问题 2：sessionOverrides 父 UID 条目的 childSessionData 冗余写入

**位置**：`src/hooks/useLineByLineReview.ts` L184-201, L269-286

**问题**：`setSessionOverrides` 同时更新子 UID 和父 UID 的条目，父 UID 条目中嵌套了 `childSessionData`，但这个嵌套数据从未被读取。

**修复**：移除父 UID 条目中的 `childSessionData` 嵌套写入。

#### 问题 3：PracticeOverlay baseCardData 重复计算

**位置**：`src/components/overlay/PracticeOverlay.tsx` L159-166, L337-339

**问题**：`baseCardData` 在组件顶层用 `useMemo` 计算一次，在 `onPracticeClick` 中又手动计算一次，逻辑完全相同。

**修复**：提取为共享逻辑，`onPracticeClick` 直接使用 `useMemo` 的结果。

#### 问题 4：PracticeSessionContext 冗余字段

**位置**：`src/contexts/PracticeSessionContext.tsx` L82-83

**问题**：`dailyLimit` 和 `historyCleanupKeepCount` 从 `settings` 中提取后单独提供，消费者也可以直接从 `settings` 中获取。

**修复**：移除冗余字段，消费者直接从 `settings` 获取。

### 五、文档问题

#### 问题 1：THEME_SYSTEM.md 严重过时（P0 严重）

**位置**：`THEME_SYSTEM.md` 全文

**问题**：文档引用 `modeSpaced` 和 `modeFixed` 两个模式色，但实际 `theme.ts` 中有三个：`modeSM2`、`modeProgressive`、`modeFixedTime`。代码示例使用旧变量名。FAQ 说"只有两种模式色"。

**修复**：重写 THEME_SYSTEM.md，更新为三种算法色体系，更新代码示例和 FAQ。

#### 问题 2：session.ts baseSessionData 字段未文档化

**位置**：`src/models/session.ts` L55

**问题**：`baseSessionData?: Session` 字段在头部注释的 Session block fields 列表中完全没有提及。

**修复**：在 Session 类型注释中补充 `baseSessionData` 的说明。

---

## ADDED Requirements

### Requirement: MigrateLegacyDataPanel 日期格式修复

系统 SHALL 在数据迁移工具中使用正确的 Roam 日期格式生成日期字符串，确保迁移后的日期页引用可被 Roam 正确解析。

#### Scenario: Phase 5 压缩快照日期格式
- **WHEN** 迁移工具在 Phase 5 压缩最新 session 快照时写入 `nextDueDate::` 字段
- **THEN** 日期格式为 Roam 标准格式（含序数后缀，如 "April 14th, 2026"）
- **AND** 该日期可被 `window.roamAlphaAPI.util.pageTitleToDate` 正确解析

#### Scenario: Phase 6 子 block session 日期格式
- **WHEN** 迁移工具在 Phase 6 创建子 block session 时写入日期相关字段
- **THEN** session 标题和 `nextDueDate::` 均使用 Roam 标准日期格式

### Requirement: MigrateLegacyDataPanel 字段完整性

系统 SHALL 确保迁移后的子 block session 数据包含当前代码期望的所有必要字段。

#### Scenario: SM2 子 block 包含 sm2_grade
- **WHEN** 迁移工具处理 SM2 算法的子 block
- **THEN** 迁移后的数据包含 `sm2_grade` 字段

#### Scenario: Progressive 子 block 包含 progressive_interval
- **WHEN** 迁移工具处理 Progressive 算法的子 block
- **THEN** 迁移后的数据包含 `progressive_interval` 字段（从 `progressive_repetitions` 计算）

#### Scenario: FixedTime 卡片包含 fixed_multiplier
- **WHEN** 迁移工具处理 FIXED_DAYS/WEEKS/MONTHS/YEARS 卡片
- **THEN** 迁移后的数据包含 `fixed_multiplier` 字段（默认值 3，如源数据无 `intervalMultiplier`）

#### Scenario: FixedTime 卡片包含 fixed_unit
- **WHEN** 迁移工具在 Phase 7 创建 `fixed_unit` 字段
- **THEN** 使用正确的 Roam API 调用格式 `location: { 'parent-uid': ..., order: ... }`

### Requirement: 代码注释与实现一致性

系统 SHALL 确保所有代码注释准确反映当前代码逻辑与设计意图。

#### Scenario: practice.ts 字段透传注释
- **WHEN** 查看 `src/practice.ts` 头部注释
- **THEN** 注释准确描述跨算法字段透传行为及其原因

#### Scenario: useCurrentCardData sessions 参数注释
- **WHEN** 查看 `src/hooks/useCurrentCardData.tsx` 的 sessions 参数注释
- **THEN** 注释说明传入的是最新有效 session（单元素数组），而非完整历史

#### Scenario: data.ts 废弃字段注释
- **WHEN** 查看 `src/queries/data.ts` 中的废弃字段说明
- **THEN** 注释区分"运行时已移除"和"迁移工具仍需处理"

#### Scenario: session.ts baseSessionData 文档化
- **WHEN** 查看 `src/models/session.ts` 的 Session 类型注释
- **THEN** 包含 `baseSessionData` 字段的用途说明

### Requirement: THEME_SYSTEM.md 更新

系统 SHALL 更新 THEME_SYSTEM.md 反映当前三种算法色体系。

#### Scenario: 算法色数量
- **WHEN** 查看 THEME_SYSTEM.md
- **THEN** 描述三种算法色：SM2（绿）、Progressive（橙）、FixedTime（蓝）
- **AND** 不引用已删除的 `modeSpaced` 或 `modeFixed` 变量名

#### Scenario: 代码示例
- **WHEN** 查看 THEME_SYSTEM.md 中的代码示例
- **THEN** 使用当前 `theme.ts` 中的实际变量名

### Requirement: 代码逻辑修正

系统 SHALL 修正已识别的代码逻辑问题。

#### Scenario: save.ts nextDueDate 判断
- **WHEN** `savePracticeData` 计算 nextDueDate
- **THEN** 使用 `data.nextDueDate !== undefined` 而非 `data.nextDueDate ||` 进行判断

#### Scenario: Footer.tsx intervalEstimates 依赖
- **WHEN** `intervalEstimates` 的 useMemo 依赖数组
- **THEN** 包含 `interactionFromSession`、`progressive_repetitions`、`progressive_interval`

### Requirement: 冗余代码清理

系统 SHALL 移除已识别的冗余代码。

#### Scenario: useLineByLineReview isLBLReview 参数移除
- **WHEN** 查看 `src/hooks/useLineByLineReview.ts`
- **THEN** 不存在 `isLBLReview` 参数

#### Scenario: sessionOverrides 父 UID 冗余写入移除
- **WHEN** 查看 `useLineByLineReview` 中的 `setSessionOverrides` 调用
- **THEN** 父 UID 条目中不包含 `childSessionData` 嵌套

#### Scenario: PracticeOverlay baseCardData 重复计算消除
- **WHEN** 查看 `PracticeOverlay.tsx`
- **THEN** `baseCardData` 只计算一次（useMemo），`onPracticeClick` 直接引用

#### Scenario: PracticeSessionContext 冗余字段移除
- **WHEN** 查看 `PracticeSessionContext.tsx`
- **THEN** 不单独提供 `dailyLimit` 和 `historyCleanupKeepCount`，消费者从 `settings` 获取

## MODIFIED Requirements

### Requirement: README 文档

README 已在 optimize-compat-lbl-docs 中更新，现需审查是否有过时内容需进一步修正，确保与最新代码一致。

### Requirement: 数据迁移工具

MigrateLegacyDataPanel 已在 optimize-compat-lbl-docs 中升级，现需修复已发现的严重 BUG，确保迁移产出与当前数据结构完全一致。

## REMOVED Requirements

### Requirement: intervalMultiplierType 运行时兼容
**Reason**: 已在 optimize-compat-lbl-docs 中移除运行时兼容代码，仅迁移工具保留删除逻辑
**Migration**: 迁移工具 Phase 4 的 FIELDS_TO_DELETE 仍包含此字段，用于清理旧数据残留
