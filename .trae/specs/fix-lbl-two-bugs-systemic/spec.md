# LBL Two Bugs Systemic Fix Spec

## Why

LBL 模式下存在两个 bug，根源是架构层面的信号流断裂和标识符污染，需要系统性修复而非打补丁：

1. **SM2 子 block 有三级/四级内容时，ShowAnswer 按钮不出现**：Footer 的 `showAnswers` 在 LBL 模式下由 `lineByLineRevealedCount > lineByLineCurrentChildIndex` 决定，而该不变量在初始定位后恒为 `true`，导致 Footer 永远不会渲染 `AnswerHiddenControls`。内部 `showAnswers` 状态（useEffect 已正确判断 `childHasBlockChildren || childHasCloze`）被 LBL 分支完全忽略。

2. **Progressive 算法下出现 "Change Interval" 按钮，点开是 FixedTime 内容**：`effectiveInteraction` 用 `baseCardData?.interaction || interaction` 计算，若子 block 存有 `interaction: NORMAL`，`||` 会选中 truthy 的 NORMAL 而非父级的 LBL，导致 `isLblNextActive = false`。此时 Progressive 回退到 `FixedIntervalModeControls` 渲染路径，而该组件内部用 `usePracticeSession().algorithm`（父级算法，可能是 SM2）判断 `isProgressive`，最终错误渲染 FixedTime 的 Change Interval 按钮。

## 核心设计决策

### 决策：统一 LBL Footer 的 showAnswers 信号源

当前 Footer 有两套 `showAnswers` 信号：
- CardBlock 渲染用：内部 `showAnswers` 状态（由 useEffect 根据算法/子内容/挖空判断）
- Footer 按钮用：`lineByLineRevealedCount > lineByLineCurrentChildIndex`（行可见性）

这两个应该统一为同一信号源：内部 `showAnswers` 状态。`lineByLineRevealedCount` 的职责仅限于控制行渲染范围，不介入 Footer 按钮逻辑。

### 决策：effectiveInteraction 直接用父级 interaction

`effectiveInteraction` 的语义是"当前 LBL 会话所在的一级队列卡片的交互模式"，它只应该来自父级。`baseCardData?.interaction || interaction` 中的 `baseCardData` 在 LBL 模式下实际上是子 block session 的克隆，可能包含 interaction 字段。应改为直接使用 `interaction`（父级属性），消除子 block 数据污染的可能。

### 决策：FixedIntervalModeControls 使用 effectiveAlgorithm 而非父级 algorithm

`FixedIntervalModeControls` 在 LBL 模式下是 fallback 路径（`isLblNextActive` 为 false 时），应使用 `effectiveAlgorithm`（= `currentChildAlgorithm`）而非 `usePracticeSession().algorithm`，确保算法判断与上下文一致。

## What Changes

- **修复 Bug 1**：Footer 的 `showAnswers` prop 在 LBL 模式下直接使用内部 `showAnswers` 状态，不再用 `lineByLineRevealedCount > lineByLineCurrentChildIndex`
- **修复 Bug 2**：`effectiveInteraction` 在 LBL 模式下直接使用父级 `interaction`，不经过 `baseCardData?.interaction ||` 短路
- **防御性修复**：`FixedIntervalModeControls` 的 `isProgressive` 判断改用 `effectiveAlgorithm`（从 MainContext 传入），消除算法不一致隐患
- **注释强化**：在关键位置补充注释，说明为什么 LBL 的 showAnswers 和 effectiveInteraction 是这样设计的
- **README 更新**：补充 LBL 模式下三种算法按钮栏的明确边界说明

## Impact

- Affected code:
  - `src/components/overlay/PracticeOverlay.tsx` — Footer 的 `showAnswers` prop 改为直接用内部 `showAnswers`
  - `src/components/overlay/Footer.tsx` — `effectiveInteraction` 修复、`FixedIntervalModeControls` 算法来源修复、`GradingControlsWrapper` 传入 `effectiveAlgorithm`
  - `README.md` — 补充算法按钮栏边界说明

---

## 状态流转图（修复后）

```
LBL 子 block Footer 按钮渲染逻辑（修复后）：

┌──────────────────────────────────────────────────────────────────┐
│  isLblNextActive?                                                │
│  = isLBLReviewMode(interaction) && !isGradingAlgorithm(          │
│      currentChildAlgorithm)                                      │
│                                                                  │
│  ┌─ YES ──────────────────────────────────────────────────────┐ │
│  │  LblNextControls: [Read + interval] [Next ▶]               │ │
│  │  适用于 Progressive / FixedTime 子 block                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ NO, isAutoAdvanceMode? ───────────────────────────────────┐ │
│  │  FixedIntervalModeControls (使用 effectiveAlgorithm):       │ │
│  │  - Progressive: [Review + interval] [Next ▶]               │ │
│  │  - FixedTime: [Change Interval ▼] [Next ▶]                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ NO (SM2 评分) ────────────────────────────────────────────┐ │
│  │  ┌─ showAnswers=false? ──────────────────────────────────┐ │ │
│  │  │  AnswerHiddenControls: [Show Answer]                  │ │ │
│  │  └─ showAnswers=true? ───────────────────────────────────┘ │ │
│  │  │  SpacedIntervalModeControls:                           │ │ │
│  │  │  [Forgot] [Hard] [Good] [Perfect]                      │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 算法按钮栏边界（三种算法三种 UI，互不混淆）

| 层级 | SM2 | Progressive | FixedTime |
|------|-----|-------------|-----------|
| Normal 一级队列 | Forgot/Hard/Good/Perfect | Review + Next | Change Interval + Next |
| LBL 二级队列 | ShowAnswer → Forgot/Hard/Good/Perfect | Read + Next | Read + Next |

---

## ADDED Requirements

### Requirement: LBL Footer 的 showAnswers 统一为内部状态

系统 SHALL 在 LBL 模式下将 Footer 的 `showAnswers` prop 直接绑定到 PracticeOverlay 的内部 `showAnswers` 状态，不再使用 `lineByLineRevealedCount > lineByLineCurrentChildIndex` 作为判断依据。

#### Scenario: SM2 子 block 有子内容时显示 ShowAnswer
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 该子 block 有三级或更深层级内容（`childHasBlockChildren === true`）
- **THEN** Footer 显示 ShowAnswer 按钮（`AnswerHiddenControls`）
- **AND** CardBlock 隐藏子内容（`showAnswers = false`）

#### Scenario: SM2 子 block 有挖空时显示 ShowAnswer
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 该子 block 包含 `{}` 格式的挖空内容（`childHasCloze === true`）
- **THEN** Footer 显示 ShowAnswer 按钮

#### Scenario: SM2 子 block 无子内容且无挖空时直接显示评分按钮
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 无子内容且无挖空
- **THEN** Footer 直接显示评分按钮（`SpacedIntervalModeControls`）

#### Scenario: Progressive/FixedTime 子 block 直接显示对应按钮
- **WHEN** 当前 LBL 子 block 使用 Progressive 或 FixedTime 算法
- **THEN** Footer 显示 `LblNextControls`（Read + Next）

#### Scenario: 用户点击 ShowAnswer 后 Footer 切换到评分按钮
- **WHEN** 用户在 SM2 LBL 子 block 点击 ShowAnswer
- **THEN** `onLineByLineShowAnswer` 调用 `setShowAnswers(true)`
- **AND** Footer 从 `AnswerHiddenControls` 切换到 `GradingControlsWrapper` 中的 `SpacedIntervalModeControls`

### Requirement: effectiveInteraction 在 LBL 模式下直接使用父级 interaction

系统 SHALL 在 LBL 模式下将 `effectiveInteraction` 直接设为父级 `interaction`，不经过 `baseCardData?.interaction ||` 短路运算，防止子 block 数据污染。

#### Scenario: LBL 模式下 effectiveInteraction 正确为 LBL
- **WHEN** 父级卡片的 `interaction` 为 LBL
- **AND** 子 block session 可能存有 `interaction: NORMAL`（或无此字段）
- **THEN** `effectiveInteraction` 为 LBL
- **AND** `isLblNextActive` 正确为 `true`（当子 block 为非评分算法时）
- **AND** InteractionSelector 显示 LBL

#### Scenario: LBL 模式下 InteractionSelector 显示父级属性
- **WHEN** 用户在 LBL 模式下查看子 block
- **THEN** InteractionSelector 显示父级卡片的交互模式（LBL）
- **AND** 切换交互模式作用于父级卡片

### Requirement: FixedIntervalModeControls 使用 effectiveAlgorithm

系统 SHALL 在 `FixedIntervalModeControls` 中使用与渲染决策一致的 `effectiveAlgorithm`（`isLineByLine ? currentChildAlgorithm : algorithm`），而非直接使用 `usePracticeSession().algorithm`。

#### Scenario: LBL Progressive 子 block 意外回退到 FixedIntervalModeControls 时不显示 Change Interval
- **WHEN** LBL 子 block 使用 Progressive 算法
- **AND** 因某种原因 `isLblNextActive` 为 false（如 `effectiveInteraction` 计算错误）
- **THEN** `FixedIntervalModeControls` 使用 `effectiveAlgorithm`（= Progressive）
- **AND** 渲染 Progressive 的 "Review" 样式（无 Change Interval popover）

#### Scenario: 非 LBL Progressive 卡片正常显示
- **WHEN** 非 LBL 模式，卡片使用 Progressive 算法
- **THEN** `FixedIntervalModeControls` 正常显示 Progressive 的 Review + Next 按钮
- **AND** 行为与修复前一致

### Requirement: lineByLineRevealedCount 职责仅限于行渲染控制

系统 SHALL 确保 `lineByLineRevealedCount` 仅用于控制 `LineByLineView` 中哪些行被渲染（`childUidsList.slice(0, lineByLineRevealedCount)`），不参与 Footer 按钮逻辑。

#### Scenario: lineByLineRevealedCount 不影响 Footer showAnswers
- **WHEN** LBL 模式下 `lineByLineRevealedCount` 变化（如上下翻行）
- **THEN** Footer 的 `showAnswers` 不受 `lineByLineRevealedCount` 影响
- **AND** Footer 的 `showAnswers` 仅由内部 `showAnswers` 状态决定

## MODIFIED Requirements

### Requirement: Footer showAnswers prop 在 LBL 模式下

旧实现：`isLineByLineActive ? (lineByLineIsCardComplete || lineByLineRevealedCount > lineByLineCurrentChildIndex) : showAnswers`

新实现：直接使用 `showAnswers`（内部状态），仅在 LBL 未激活时使用。`lineByLineIsCardComplete` 的情况由 `setShowAnswers` useEffect 覆盖。

具体地，当卡片所有行完成时，Footer 显示 `LblCompletedControls`（由 `isLineByLine && lineByLineIsCardComplete` 在 Footer 内部直接判断），不经过 showAnswers 路径。

### Requirement: effectiveInteraction 计算逻辑

旧实现：`isLineByLine ? (baseCardData?.interaction || interaction) : interaction`
新实现：`isLineByLine ? interaction : interaction`（LBL 和非 LBL 统一为 `interaction`）

简化后 `effectiveInteraction` 恒等于 `interaction`，不再需要三元运算。InteractionSelector 始终反映父级卡片的 interaction。

### Requirement: FixedIntervalModeControls algorithm 来源

旧实现：内部从 `usePracticeSession().algorithm` 获取算法，在 LBL 回退场景下可能与上下文不一致。
新实现：从 MainContext 接收 `effectiveAlgorithm` prop，与渲染该组件的决策链使用同一算法值。

## REMOVED Requirements

无移除的需求。
