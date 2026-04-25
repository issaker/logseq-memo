# LBL 架构全面梳理与重构 Spec

## Why

经过多轮迭代修复，LBL 模式仍存在架构层面的问题：SM2 子 block 的 ShowAnswer/挖空逻辑与 Normal 卡片不一致、三种算法的按钮栏逻辑边界不清晰、`onLineByLineSwitchToGradingAlgorithm` 的"回退+隐藏"交互模式违反直觉。需要从架构层面重新梳理 LBL 的核心逻辑，使其与 Normal 模式在基础交互上保持统一，同时清晰界定三种算法的按钮栏边界。

## 核心设计决策

### 决策一：Normal 与 LBL 统一调度，不分成独立操作系统

理由：Normal 和 LBL 共享同一套算法引擎（SM2/Progressive/FixedTime），数据模型完全一致（Session 结构），差异仅在于"单卡学习"vs"逐行学习"的导航方式。分离会带来大量代码重复和状态同步问题。统一调度的关键是在 Footer 层面根据 `isLineByLine` 做条件分支，而非创建独立的组件树。

### 决策二：移除 `onLineByLineSwitchToGradingAlgorithm` 的"回退+隐藏"机制

理由：该机制违反直觉——用户切换算法后期望停留在当前行，而非被强制回退。正确做法是：切换到 SM2 后，如果当前行有子内容或挖空，显示 ShowAnswer 按钮；否则直接显示评分按钮。这与 Normal 卡片的 SM2 行为完全一致。

### 决策三：三种算法按钮栏完全分离

理由：SM2（评分按钮）、Progressive（Read+Next）、FixedTime（自定义间隔+Next）的交互模式完全不同，在 LBL 模式下应各自独立渲染，不混用。

## What Changes

- **移除 `onLineByLineSwitchToGradingAlgorithm`**：删除此回调及其在 PracticeOverlay/Footer 中的所有引用
- **修正 SM2 子 block 的 ShowAnswer 逻辑**：当子 block 有子内容（`hasBlockChildren`）或挖空（`hasCloze`）时显示 ShowAnswer 按钮，与 Normal 卡片一致
- **修正 LineByLineView 的 `showAnswers` 传递**：当前行是 SM2 且需要 ShowAnswer 时，`CardBlock` 的 `showAnswers` 应由全局 `showAnswers` 状态控制
- **统一评分后自动翻行**：所有算法评分完成后统一自动推进到下一个到期子 block（SM2 评分后、Progressive Next 后、FixedTime Next 后）
- **修正插队机制**：SM2 Forgot 和 Progressive Next 的插队后翻页行为与 Normal 模式一致
- **清晰化算法按钮栏边界**：在 Footer 中根据 `currentChildAlgorithm` 独立渲染三种按钮栏

## Impact

- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 移除 `onLineByLineSwitchToGradingAlgorithm`，修正 `onLineByLineShowAnswer`
  - `src/components/overlay/PracticeOverlay.tsx` — 移除 SM2 切换回退逻辑，修正 setShowAnswers useEffect
  - `src/components/overlay/Footer.tsx` — 移除 `onLineByLineSwitchToGradingAlgorithm` 引用
  - `src/components/overlay/LineByLineView.tsx` — 传递 `showAnswers` 到子 block CardBlock
  - `README.md` — 更新文档

---

## 状态流转图

```
LBL 子 block 学习流程（统一流程，适用于所有算法）：

┌──────────────────────────────────────────────────────────────┐
│                    进入 LBL 子 block                          │
│                                                              │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │ SM2 算法         │    │ Progressive / FixedTime 算法    │  │
│  │                 │    │                                │  │
│  │ 有子内容/挖空?   │    │ 直接显示内容                    │  │
│  │  ├─ 是: ShowAnswer│    │ 显示 Read+Next / 间隔+Next     │  │
│  │  └─ 否: 直接评分  │    │                                │  │
│  │                 │    │                                │  │
│  │ ShowAnswer →    │    │ 用户点击 Next →                 │  │
│  │ 显示内容+评分按钮│    │                                │  │
│  └────────┬────────┘    └──────────────┬─────────────────┘  │
│           │                            │                    │
│           │  用户评分/点击 Next          │                    │
│           ▼                            ▼                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              评分完成 → 自动推进到下一行                  │  │
│  │                                                        │  │
│  │  ┌─ SM2 Forgot? → 插队 + 翻页（与 Normal 一致）        │  │
│  │  ├─ Progressive Next + 非最后一行? → 插队 + 翻页       │  │
│  │  └─ 其他 → 推进到下一个到期子 block                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  所有子 block 完成 → 显示 "All lines reviewed" + ▲/▶ 按钮    │
└──────────────────────────────────────────────────────────────┘
```

## 交互流程图

```
Normal 卡片 vs LBL 子 block 对比：

Normal 卡片:
  显示内容 → [SM2: ShowAnswer? → 评分] / [Progressive: Read+Next] / [Fixed: 间隔+Next]
  → 评分完成 → 翻页到下一张卡

LBL 子 block:
  显示内容 → [SM2: ShowAnswer? → 评分] / [Progressive: Read+Next] / [Fixed: 间隔+Next]
  → 评分完成 → 自动推进到下一行子 block（等效于 Normal 的翻页）
  → 所有行完成 → LBL 卡片完成 → 翻页到下一张卡

关键统一点：
- SM2 的 ShowAnswer 触发条件：有子内容(hasBlockChildren) 或 挖空(hasCloze)
- 评分/Next 后的翻行：等效于 Normal 的翻页
- 插队机制：Forgot/Next 插队后翻页，与 Normal 一致
```

---

## ADDED Requirements

### Requirement: SM2 子 block ShowAnswer 与 Normal 卡片一致

系统 SHALL 在 LBL 模式下，当 SM2 子 block 包含子内容或挖空时显示 ShowAnswer 按钮，行为与 Normal 卡片完全一致。

#### Scenario: SM2 子 block 有子内容时显示 ShowAnswer
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 该子 block 包含三级或更深层级内容（`hasBlockChildren === true`）
- **THEN** 显示 ShowAnswer 按钮
- **AND** 子内容被隐藏
- **AND** 用户点击 ShowAnswer 后显示子内容并展示评分按钮

#### Scenario: SM2 子 block 有挖空时显示 ShowAnswer
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 该子 block 包含 `{}` 格式的挖空内容（`hasCloze === true`）
- **THEN** 显示 ShowAnswer 按钮
- **AND** 挖空内容被遮挡
- **AND** 用户点击 ShowAnswer 后显示遮挡内容并展示评分按钮

#### Scenario: SM2 子 block 无子内容且无挖空时直接显示评分按钮
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 该子 block 不包含子内容也不包含挖空
- **THEN** 直接显示评分按钮（不显示 ShowAnswer）

#### Scenario: SM2 评分完成后自动推进到下一行
- **WHEN** 用户对 SM2 子 block 完成评分
- **THEN** 系统自动推进到下一个到期子 block
- **AND** 行为与 Normal 卡片评分后翻页一致

### Requirement: 移除 onLineByLineSwitchToGradingAlgorithm 机制

系统 SHALL 移除 `onLineByLineSwitchToGradingAlgorithm` 回调及其"回退+隐藏"机制，切换到 SM2 时用户停留在当前行。

#### Scenario: 切换到 SM2 时保持当前位置
- **WHEN** 用户在 LBL 模式下将子 block 算法切换到 SM2
- **THEN** `lineByLineCurrentChildIndex` 保持不变
- **AND** 用户停留在当前子 block
- **AND** 如果当前子 block 有子内容或挖空，显示 ShowAnswer 按钮
- **AND** 如果当前子 block 无子内容且无挖空，直接显示评分按钮

#### Scenario: 切换到 SM2 时 revealedCount 不变
- **WHEN** 用户在 LBL 模式下将子 block 算法切换到 SM2
- **THEN** `lineByLineRevealedCount` 保持不变
- **AND** 所有已揭示的行仍然可见

### Requirement: LineByLineView 传递 showAnswers 到子 block CardBlock

系统 SHALL 在 LineByLineView 中将全局 `showAnswers` 状态传递到当前行的 CardBlock，使 SM2 子 block 的子内容/挖空能正确隐藏/显示。

#### Scenario: SM2 子 block 未 ShowAnswer 时子内容隐藏
- **WHEN** 当前 LBL 子 block 使用 SM2 算法且有子内容
- **AND** `showAnswers === false`
- **THEN** CardBlock 隐藏子内容
- **AND** 显示 ShowAnswer 按钮

#### Scenario: SM2 子 block ShowAnswer 后子内容显示
- **WHEN** 当前 LBL 子 block 使用 SM2 算法且有子内容
- **AND** `showAnswers === true`
- **THEN** CardBlock 显示子内容
- **AND** 显示评分按钮

#### Scenario: Progressive/FixedTime 子 block 始终显示内容
- **WHEN** 当前 LBL 子 block 使用 Progressive 或 FixedTime 算法
- **THEN** CardBlock 始终显示全部内容（`showAnswers = true`）

#### Scenario: 已掌握的子 block 始终显示内容
- **WHEN** 当前 LBL 子 block 已掌握（`nextDueDate > now`）
- **THEN** CardBlock 始终显示全部内容（`showAnswers = true`）

### Requirement: 三种算法按钮栏完全分离

系统 SHALL 在 LBL 模式下根据当前子 block 的算法独立渲染三种按钮栏，逻辑边界清晰。

#### Scenario: SM2 子 block 显示评分按钮
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **THEN** Footer 显示 SM2 评分按钮（Forgot/Hard/Good/Perfect）
- **AND** 不显示 Read+Next 或 间隔+Next 按钮

#### Scenario: Progressive 子 block 显示 Read+Next
- **WHEN** 当前 LBL 子 block 使用 Progressive 算法
- **THEN** Footer 显示 Read+Next 按钮（LblNextControls）
- **AND** 不显示 SM2 评分按钮

#### Scenario: FixedTime 子 block 显示间隔+Next
- **WHEN** 当前 LBL 子 block 使用 FixedTime 算法
- **THEN** Footer 显示自定义间隔+Next 按钮（FixedIntervalModeControls）
- **AND** 不显示 SM2 评分按钮

### Requirement: 插队机制与 Normal 模式一致

系统 SHALL 确保 LBL 模式下的插队机制（SM2 Forgot、Progressive Next）与 Normal 模式行为一致。

#### Scenario: SM2 Forgot 插队后翻页
- **WHEN** 用户在 LBL 模式下对 SM2 子 block 评分为 Forgot（grade=0）
- **AND** `forgotReinsertOffset > 0`
- **THEN** LBL 卡片按 forgotReinsertOffset 插入一级队列
- **AND** 翻页到下一张卡（`setCurrentIndex(prev + 1)`）
- **AND** 行为与 Normal 卡片 Forgot 一致

#### Scenario: Progressive Next 插队后翻页
- **WHEN** 用户在 LBL 模式下点击 Progressive 的 Next 按钮
- **AND** `lblNextReinsertOffset > 0` 且当前不是最后一行
- **THEN** LBL 卡片按 lblNextReinsertOffset 插入一级队列
- **AND** 翻页到下一张卡（`setCurrentIndex(prev + 1)`）
- **AND** 行为与 Normal 模式一致

### Requirement: 评分后统一自动推进到下一行

系统 SHALL 在所有算法评分完成后统一自动推进到下一个到期子 block，等效于 Normal 模式的翻页。

#### Scenario: SM2 评分后自动推进
- **WHEN** 用户对 SM2 子 block 评分（非 Forgot）
- **THEN** 自动推进到下一个到期子 block
- **AND** 如果没有更多到期子 block，标记 LBL 卡片为完成

#### Scenario: Progressive Next 后自动推进
- **WHEN** 用户点击 Progressive 的 Next 按钮
- **THEN** 自动推进到下一个到期子 block
- **AND** 如果没有更多到期子 block，标记 LBL 卡片为完成

#### Scenario: FixedTime Next 后自动推进
- **WHEN** 用户点击 FixedTime 的 Next 按钮
- **THEN** 自动推进到下一个到期子 block
- **AND** 如果没有更多到期子 block，标记 LBL 卡片为完成

### Requirement: setShowAnswers useEffect 统一逻辑

系统 SHALL 将 `setShowAnswers` useEffect 的 LBL 分支与 Normal 分支统一，基于 `hasBlockChildren` 和 `hasCloze` 判断是否需要 ShowAnswer。

#### Scenario: LBL SM2 子 block 有子内容/挖空时 showAnswers=false
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 有子内容或挖空
- **THEN** `showAnswers = false`

#### Scenario: LBL SM2 子 block 无子内容/挖空时 showAnswers=true
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **AND** 无子内容且无挖空
- **THEN** `showAnswers = true`

#### Scenario: LBL Progressive/FixedTime 子 block showAnswers=true
- **WHEN** 当前 LBL 子 block 使用 Progressive 或 FixedTime 算法
- **THEN** `showAnswers = true`

#### Scenario: LBL 已掌握子 block showAnswers=true
- **WHEN** 当前 LBL 子 block 已掌握
- **THEN** `showAnswers = true`

## MODIFIED Requirements

### Requirement: onLineByLineShowAnswer 行为

旧实现检测下一行是否为隐藏的 SM2 行并推进。现改为简单设置 `showAnswers = true`，确保当前行可见，不再有"推进到隐藏行"的特殊逻辑。

### Requirement: setShowAnswers useEffect LBL 分支

旧实现使用 `isNextHiddenGrading` 检测。现改为基于 `hasBlockChildren` 和 `hasCloze` 判断，与 Normal 分支逻辑统一。需要将 `hasBlockChildren` 和 `hasCloze` 的检测范围扩展到当前子 block。

### Requirement: LineByLineView CardBlock showAnswers

旧实现始终传递 `showAnswers={true}` 给子 block 的 CardBlock。现改为根据当前行是否为 SM2 且需要 ShowAnswer 来传递 `showAnswers` 值。

### Requirement: onSelectAlgorithm SM2 切换处理

旧实现在 LBL 模式下切换到 SM2 时调用 `onLineByLineSwitchToGradingAlgorithm()`。现改为不再调用此回调，切换后用户停留在当前行。

## REMOVED Requirements

### Requirement: onLineByLineSwitchToGradingAlgorithm

**Reason**: "回退+隐藏"机制违反直觉，与 Normal 卡片的 SM2 行为不一致。切换算法后应停留在当前行，ShowAnswer 由子内容/挖空决定。
**Migration**: 移除此回调及其所有引用，SM2 的 ShowAnswer 逻辑改为基于 `hasBlockChildren`/`hasCloze` 判断。
