# LBL 模式撤回按钮 Spec

## Why

LBL 模式下，用户对子 block 评分后无法撤回。Normal 模式的卡片可以通过翻页重新评分，但 LBL 模式的子 block 一旦评分就自动推进到下一个到期子 block，无法回退。用户需要撤回功能来纠正误操作或重新学习某个子 block。

## What Changes

- **新增 `onUndoLineByLineGrade` 回调**：在 `useLineByLineReview` 中实现撤回逻辑，恢复上一个子 block 的评分前状态
- **新增 `canUndoLineByLineGrade` 标志**：判断是否可以撤回（有历史记录且当前未在卡片首行）
- **新增撤回历史栈**：在 `useLineByLineReview` 中维护每次评分前的快照（childSessionData、lineByLineCurrentChildIndex、lineByLineRevealedCount）
- **Footer 新增撤回按钮**：在 LBL 模式的 `GradingControlsWrapper` 和 `LblCompletedControls` 中显示撤回按钮
- **撤回时恢复数据页**：调用 `savePracticeData` 将子 block 恢复为评分前的数据，调用 `updateParentNextDueDate` 更新父级 nextDueDate

## Impact

- Affected specs: fix-lbl-algorithm-scope（撤回需恢复子 block 的 algorithm）
- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 新增撤回逻辑和历史栈
  - `src/components/overlay/Footer.tsx` — 新增撤回按钮
  - `src/components/overlay/PracticeOverlay.tsx` — 传递撤回回调到 MainContext

## ADDED Requirements

### Requirement: LBL 模式撤回功能

系统 SHALL 在 LBL 模式下提供撤回按钮，允许用户撤回上一个子 block 的评分/Next 操作。

#### Scenario: 撤回 SM2 评分
- **WHEN** 用户在 LBL 模式下对子 block A 评分（如 Good），系统推进到子 block B
- **AND** 用户点击撤回按钮
- **THEN** 子 block A 的评分数据恢复为评分前的状态（nextDueDate、sm2_* 等字段回退）
- **AND** `lineByLineCurrentChildIndex` 回到子 block A 的位置
- **AND** `lineByLineRevealedCount` 恢复为评分前的值
- **AND** `showAnswers` 设为 false（需要重新 Show Answer）

#### Scenario: 撤回 Progressive Next
- **WHEN** 用户在 LBL 模式下对子 block A 点击 Next（Progressive 算法），系统推进到子 block B
- **AND** 用户点击撤回按钮
- **THEN** 子 block A 的 progressive 数据恢复为 Next 前的状态
- **AND** `lineByLineCurrentChildIndex` 回到子 block A 的位置

#### Scenario: 撤回 SM2 Forgot（卡片被移出队列）
- **WHEN** 用户在 LBL 模式下对子 block A 评分 Forgot，卡片被移出当前视图（setCurrentIndex + 1）
- **AND** 用户翻页回到该 LBL 卡片后点击撤回按钮
- **THEN** 子 block A 的评分数据恢复，Forgot 的重新插入被取消
- **AND** `lineByLineCurrentChildIndex` 回到子 block A 的位置

#### Scenario: 连续撤回
- **WHEN** 用户连续评分子 block A、B、C 后
- **AND** 用户点击撤回按钮一次
- **THEN** 仅撤回子 block C 的评分，回到子 block C 的位置
- **AND** 用户可以再次点击撤回按钮撤回子 block B

#### Scenario: 无法撤回（无历史记录）
- **WHEN** 用户刚进入 LBL 卡片，尚未对任何子 block 评分
- **THEN** 撤回按钮不可用（disabled 或不显示）

#### Scenario: 卡片完成后撤回
- **WHEN** 所有子 block 已评分完毕（`lineByLineIsCardComplete = true`），显示 "All lines reviewed"
- **AND** 用户点击撤回按钮
- **THEN** 最后一个评分的子 block 被撤回，`lineByLineIsCardComplete` 变为 false
- **AND** Footer 从 `LblCompletedControls` 切换为评分按钮

### Requirement: 撤回时数据页恢复

系统 SHALL 在撤回时将子 block 的数据页恢复为评分前的状态。

#### Scenario: 撤回时覆盖数据页
- **WHEN** 用户撤回子 block A 的评分
- **THEN** 调用 `savePracticeData` 将子 block A 的评分前数据写回数据页
- **AND** 调用 `updateParentNextDueDate` 更新父级的 nextDueDate

#### Scenario: 撤回时恢复 childSessionData
- **WHEN** 用户撤回子 block A 的评分
- **THEN** `childSessionData[childUid]` 恢复为评分前的数据
- **AND** `sessionOverrides[childUid]` 恢复为评分前的数据

### Requirement: 撤回按钮 UI

系统 SHALL 在 LBL 模式的 Footer 中显示撤回按钮。

#### Scenario: LBL 模式评分按钮区域显示撤回
- **WHEN** LBL 模式下有可撤回的历史记录
- **THEN** 在 ◀ ▶ 翻页按钮和评分/Next 按钮之间显示 "↩ Undo" 按钮

#### Scenario: LBL 完成状态显示撤回
- **WHEN** LBL 卡片完成（`lineByLineIsCardComplete = true`）且有可撤回的历史记录
- **THEN** 在 `LblCompletedControls` 中显示 "↩ Undo" 按钮

#### Scenario: 无可撤回记录时按钮 disabled
- **WHEN** LBL 模式下无可撤回的历史记录
- **THEN** 撤回按钮显示为 disabled 状态

## MODIFIED Requirements

### Requirement: useLineByLineReview Hook 输出

新增 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade` 输出。

### Requirement: MainContext 新增字段

新增 `onUndoLineByLineGrade` 和 `canUndoLineByLineGrade` 字段，供 Footer 使用。

## REMOVED Requirements

无移除的需求。
