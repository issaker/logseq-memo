# LBL 架构整改：交互模式边界 + revealedCount 语义 + ShowAnswer 作用域 Spec

## Why

当前 LBL 模式存在三个架构层面的问题，单独修复任何一个都会引发其他问题：

1. **交互模式边界错误**：`InteractionSelector`（Normal/LBL 切换）在 LBL 子 block 视图中仍然显示，但交互模式是父级属性，子 block 永远是 `interaction: NORMAL`，不应允许切换交互模式。
2. **`lineByLineRevealedCount` 语义错误**：SM2 子 block 初始化时 `lineByLineRevealedCount = firstDueIndex = 0`，导致 LineByLineView 不渲染任何子 block（因为渲染范围是 0 到 revealedCount-1）。用户切换到 LBL 模式后第一行不可见，但按 ▼ 又直接跳到第二行。
3. **ShowAnswer 作用域错误**：`onLineByLineShowAnswer` 将 `lineByLineRevealedCount` 加 1，这会揭示"下一个未渲染的子 block"而非"确保当前子 block 可见"。当用户在算法切换后点击 Show Answer，影响的是下一行而非当前行。

根本原因：`lineByLineRevealedCount` 被用于两个不同目的——控制渲染范围和控制答案显示。这两个关注点应该分离：渲染范围应始终包含当前行（`revealedCount >= currentChildIndex + 1`），答案显示由 `showAnswers` 状态独立控制。

## What Changes

- **隐藏 LBL 子 block 的 InteractionSelector**：在 `GradingControlsWrapper` 中，当 `isLineByLine` 为 true 时隐藏 `InteractionSelector`，因为交互模式是父级属性
- **修正 `lineByLineRevealedCount` 语义**：确保 `lineByLineRevealedCount` 始终 >= `lineByLineCurrentChildIndex + 1`，当前行始终被渲染
- **修正 `onLineByLineShowAnswer` 作用域**：改为确保当前行可见（`Math.max(prev, currentChildIndex + 1)`）而非简单加 1
- **修正初始定位的 revealedCount 设置**：统一为 `firstDueIndex + 1`，不再区分 LblNext/SM2

## Impact

- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 修正 revealedCount 语义和 onLineByLineShowAnswer
  - `src/components/overlay/Footer.tsx` — 隐藏 LBL 子 block 的 InteractionSelector

---

## 架构原则

### 交互模式是父级属性

```
父 block (LBL 卡片):
  - algorithm: 可切换 (SM2/Progressive/FixedTime)
  - interaction: 可切换 (Normal/LBL) ← 仅在父级可切换

子 block (LBL 子行):
  - algorithm: 可切换 (SM2/Progressive/FixedTime) ← 每行独立
  - interaction: 固定为 NORMAL ← 不可切换
```

子 block 是独立的问答卡，交互模式永远是 NORMAL。LBL 是父级对子 block 集合的组织方式，不是子 block 自身的属性。

### revealedCount 语义

`lineByLineRevealedCount` 的唯一职责是控制 LineByLineView 的渲染范围（0 到 revealedCount-1）。它必须满足不变量：

```
lineByLineRevealedCount >= lineByLineCurrentChildIndex + 1
```

这确保当前行始终被渲染。答案是否显示由 `showAnswers` 状态独立控制，与 `revealedCount` 无关。

### ShowAnswer 语义

`onLineByLineShowAnswer` 的职责是：
1. 确保当前行被渲染（`revealedCount >= currentChildIndex + 1`）
2. 设置 `showAnswers = true`

它不应该揭示"下一行"，只应确保"当前行可见并显示答案"。

---

## ADDED Requirements

### Requirement: LBL 子 block 隐藏 InteractionSelector

系统 SHALL 在 LBL 模式下隐藏 InteractionSelector，因为交互模式是父级属性，子 block 不应切换交互模式。

#### Scenario: LBL 模式下只显示 AlgorithmSelector
- **WHEN** 当前卡片为 LBL 模式且未完成
- **THEN** Footer 中只显示 AlgorithmSelector，不显示 InteractionSelector
- **AND** 用户只能切换当前子 block 的算法

#### Scenario: Normal 模式下显示两个 Selector
- **WHEN** 当前卡片为 Normal 模式
- **THEN** Footer 中同时显示 AlgorithmSelector 和 InteractionSelector
- **AND** 行为与之前一致

#### Scenario: LBL 完成状态下不显示 Selector
- **WHEN** LBL 卡片所有子 block 已完成
- **THEN** LblCompletedControls 中不显示任何 Selector

### Requirement: lineByLineRevealedCount 始终包含当前行

系统 SHALL 确保 `lineByLineRevealedCount` 始终 >= `lineByLineCurrentChildIndex + 1`，当前行始终被渲染。

#### Scenario: 初始定位时 revealedCount 包含当前行
- **WHEN** 用户翻到一张 LBL 卡片，定位到第一个到期子 block
- **THEN** `lineByLineRevealedCount = firstDueIndex + 1`
- **AND** 无论算法是 SM2 还是 Progressive/FixedTime，当前行都被渲染

#### Scenario: 上下翻行后 revealedCount 包含当前行
- **WHEN** 用户通过 ▲/▼ 翻行到某子 block
- **THEN** `lineByLineRevealedCount >= lineByLineCurrentChildIndex + 1`
- **AND** 当前行被渲染

#### Scenario: 评分后 revealedCount 包含新的当前行
- **WHEN** 用户评分后自动推进到下一个到期子 block
- **THEN** `lineByLineRevealedCount >= 新的 lineByLineCurrentChildIndex + 1`
- **AND** 新的当前行被渲染

### Requirement: onLineByLineShowAnswer 确保当前行可见

系统 SHALL 确保 `onLineByLineShowAnswer` 使当前行可见并显示答案，而非揭示下一行。

#### Scenario: ShowAnswer 确保当前行可见
- **WHEN** 用户点击 Show Answer
- **THEN** `lineByLineRevealedCount = Math.max(prev, lineByLineCurrentChildIndex + 1)`
- **AND** `showAnswers = true`
- **AND** 当前行显示答案

#### Scenario: 算法切换后 ShowAnswer 作用于当前行
- **WHEN** 用户将子 block 算法从 Progressive 切换到 SM2
- **AND** showAnswers 变为 false（SM2 需要先 Show Answer）
- **AND** 用户点击 Show Answer
- **THEN** 当前行显示答案
- **AND** 不影响下一行的渲染状态

## MODIFIED Requirements

### Requirement: useLineByLineReview 初始定位 revealedCount

旧实现中 SM2 子 block 初始化时 `lineByLineRevealedCount = firstDueIndex`（不包含当前行），现改为 `lineByLineRevealedCount = firstDueIndex + 1`（始终包含当前行），不再区分 LblNext/SM2。

### Requirement: onLineByLineShowAnswer 行为

旧实现中 `onLineByLineShowAnswer` 将 `lineByLineRevealedCount` 加 1，可能揭示下一行而非当前行。现改为确保当前行可见（`Math.max(prev, currentChildIndex + 1)`）。

### Requirement: GradingControlsWrapper 选择器显示

旧实现中 `GradingControlsWrapper` 始终显示 AlgorithmSelector 和 InteractionSelector。现改为 LBL 模式下隐藏 InteractionSelector。

## REMOVED Requirements

无移除的需求。
