# LBL 算法切换 Bug 修复 + 重评分提示 + 文档注释 Spec

## Why

上一轮实现的 LBL 上下翻行导航功能存在两个 Bug：

1. **算法切换导致自动跳行**：当用户在 LBL 模式下切换算法（如 Progressive → SM2）时，`useLineByLineReview` 的 useEffect 因 `childSessionData` 变化而重新执行，将 `lineByLineCurrentChildIndex` 重置为第一个到期子 block，导致用户被跳到下一行而非停留在当前行。

2. **LBL 重评分无覆盖提示**：Normal 卡片在同日重复学习时会显示"今日已学习，此次学习将覆盖今日数据"提示，但 LBL 子 block 重评分时没有此提示，用户无法确认是覆盖数据还是首次学习。

此外，需要在 README 和代码注释中补充 LBL 二级队列架构的说明，帮助后续维护者理解核心设计思想。

## What Changes

- **修复算法切换跳行 Bug**：将 `useLineByLineReview` 中的定位 useEffect 改为仅在卡片切换时重置位置，算法切换导致的 `childSessionData` 变化不再触发位置重置
- **新增 LBL 重评分覆盖提示**：在 `onPracticeClick` 的 LBL 分支中添加同日重评分检测，触发 `showOverwriteReminder`
- **更新 README**：补充 LBL 二级队列架构说明和上下翻行导航功能文档
- **补充代码注释**：在关键文件中添加 LBL 二级队列架构的注释说明

## Impact

- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 修复定位 useEffect 的依赖逻辑
  - `src/components/overlay/PracticeOverlay.tsx` — 添加 LBL 重评分覆盖提示
  - `README.md` — 补充文档
  - `src/hooks/useLineByLineReview.ts` — 补充注释
  - `src/components/overlay/PracticeOverlay.tsx` — 补充注释
  - `src/components/overlay/Footer.tsx` — 补充注释

---

## ADDED Requirements

### Requirement: 算法切换不触发 LBL 位置重置

系统 SHALL 确保在 LBL 模式下切换算法时，`lineByLineCurrentChildIndex` 不被重置，用户停留在当前子 block。

#### Scenario: 切换算法时保持当前位置
- **WHEN** 用户在 LBL 模式下切换当前子 block 的算法（如 Progressive → SM2）
- **THEN** `lineByLineCurrentChildIndex` 保持不变
- **AND** 用户仍停留在当前子 block
- **AND** `currentChildAlgorithm` 和 `currentChildIsLblNext` 更新为新算法对应的状态
- **AND** `showAnswers` 根据新算法正确设置

#### Scenario: 切换卡片时正确重置位置
- **WHEN** 用户通过 ◀/▶ 翻页到另一张 LBL 卡片
- **THEN** `lineByLineCurrentChildIndex` 重置为第一个到期子 block
- **AND** 行为与之前一致

#### Scenario: 异步加载 session 数据后正确初始化位置
- **WHEN** 用户翻到一张 LBL 卡片，`childSessionData` 异步加载完成
- **THEN** `lineByLineCurrentChildIndex` 定位到第一个到期子 block
- **AND** 行为与之前一致

### Requirement: LBL 重评分覆盖提示

系统 SHALL 在 LBL 模式下对已学习的子 block 重新评分时，显示"今日已学习，此次学习将覆盖今日数据"提示。

#### Scenario: LBL 子 block 同日重评分显示提示
- **WHEN** 用户在 LBL 模式下对一个今日已学习的子 block 重新评分
- **THEN** 显示"今日已学习，此次学习将覆盖今日数据"提示
- **AND** 提示样式和持续时间与 Normal 卡片一致（2.5 秒后自动消失）

#### Scenario: LBL 子 block 首次学习不显示提示
- **WHEN** 用户在 LBL 模式下对一个未学习过的子 block 评分
- **THEN** 不显示覆盖提示

#### Scenario: LBL 子 block 非同日重评分不显示提示
- **WHEN** 用户在 LBL 模式下对一个非今日学习的子 block 重新评分
- **THEN** 不显示覆盖提示

### Requirement: README 补充 LBL 二级队列架构和上下翻行导航文档

系统 SHALL 在 README 中补充 LBL 二级队列架构的说明和上下翻行导航功能的使用文档。

#### Scenario: README 包含 LBL 二级队列架构说明
- **WHEN** 开发者阅读 README
- **THEN** 能找到 LBL 二级队列架构的说明（一级队列用 ◀/▶ 导航卡片，二级队列用 ▲/▼ 导航子 block）

#### Scenario: README 包含上下翻行导航快捷键
- **WHEN** 开发者阅读 README 的快捷键表格
- **THEN** 能找到 ↑/↓ 快捷键的说明

### Requirement: 代码注释补充 LBL 二级队列架构说明

系统 SHALL 在关键代码文件中补充 LBL 二级队列架构的注释说明。

#### Scenario: useLineByLineReview 文件头注释包含二级队列架构说明
- **WHEN** 开发者阅读 `useLineByLineReview.ts`
- **THEN** 文件头注释包含 LBL 二级队列架构的核心设计思想

#### Scenario: PracticeOverlay 注释包含二级队列架构说明
- **WHEN** 开发者阅读 `PracticeOverlay.tsx`
- **THEN** 关键位置有 LBL 二级队列架构的注释

#### Scenario: Footer 注释包含上下翻行导航说明
- **WHEN** 开发者阅读 `Footer.tsx`
- **THEN** 上下翻行按钮和快捷键有清晰的注释

## MODIFIED Requirements

### Requirement: useLineByLineReview 定位 useEffect

旧实现中 useEffect 依赖 `[isLBLReviewMode, currentCardRefUid, childUidsList, childSessionData]`，当 `childSessionData` 因算法切换而变化时会重置位置。现改为仅在卡片切换时重置位置，使用 ref 追踪卡片变化状态，异步数据加载后单独处理初始化定位。

## REMOVED Requirements

无移除的需求。
