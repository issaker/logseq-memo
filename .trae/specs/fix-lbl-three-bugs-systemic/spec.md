# LBL Three Bugs Systemic Fix Spec

## Why

LBL 模式下存在三个 bug，都需要从架构层面修复：

1. **Progressive/FixedTime 首次初始化不显示第一行**：新卡片进入 LBL 模式时，`childSessionData` 异步加载返回空对象 `{}`（子 block 无历史 session），定位 useEffect 的 `!Object.keys(childSessionData).length` 守卫阻止了 `lineByLineRevealedCount` 的初始化（保持为 0），导致 LineByLineView 不渲染任何子 block。用户看到的是只有父级 block 的空页面。

2. **FixedTime 算法错误变成 Progressive 的 Read+Next**：`isLblNextActive` 将 LBL 下的所有非评分算法（Progressive & FixedTime）路由到同一个 `LblNextControls`（"Read + Next"），违反了核心设计原则——**LBL 子 block 就是一张张 Normal 卡片，三种算法的按钮栏应与 Normal 模式完全一致**。

3. **插队后重学第一行误报"覆盖数据"提示**：当用户跳过第一行直接学完第二行，卡片插队后重新回到第一行并评分时，`onPracticeClick` 中的 `isChildReScoring` 检查使用的 `childSessionData` 可能携带过期的 DB 数据（插队回来时 `getChildSessionData` 重新异步加载，但在加载完成前旧数据仍在状态中），导致错误地判断第一行已学习并显示覆盖提示。

## 核心设计决策

### 决策一：LBL button bar = Normal button bar（逐行卡片原则）

LBL 的本质是二级队列——每一个子 block 就是一张独立的 Normal 卡片，只是按行排列而非按队列排列。三种算法的按钮栏在 Normal 和 LBL 模式下应完全一致：

| Algorithm | Normal | LBL |
|-----------|--------|-----|
| SM2 | ShowAnswer → Forgot/Hard/Good/Perfect | ShowAnswer → Forgot/Hard/Good/Perfect |
| Progressive | Review + Next | Review + Next |
| FixedTime | Change Interval + Next | Change Interval + Next |

**实现**：删除 `isLblNextActive` 分支，让 `isAutoAdvanceMode` 直接路由到 `FixedIntervalModeControls`（已通过 `effectiveAlgorithm` 正确区分 Progressive/FixedTime）。

### 决策二：允许 empty childSessionData 时的 fallback 定位

`childSessionData` 为空（新子 block 无历史）时应 fallback 到 index 0，`revealedCount = 1`。这保证第一行始终可见。移除 `!Object.keys(childSessionData).length` 守卫，改为在空数据时使用 fallback。

### 决策三：插队返回后强制重新加载 childSessionData

LBL 卡片插队后重新进入时，必须强制触发 `childSessionData` 的重新加载和 `needsPositioningRef` 的重置。需要追踪"卡片是否因插队返回"状态，确保定位和覆盖检查都基于最新数据。

## What Changes

- **修复 Bug 1**：修改 `useLineByLineReview` 定位 useEffect，当 `childSessionData` 为空时使用 fallback（index 0, revealedCount = 1）
- **修复 Bug 2**：删除 `Footer.tsx` 中 `GradingControlsWrapper` 的 `isLblNextActive` 分支，让 LBL 非评分算法走正常 `FixedIntervalModeControls` 路径；删除 `LblNextControls` 组件
- **修复 Bug 3**：在 `PracticeOverlay.tsx` 中，检测 LBL 卡片插队返回场景，强制重新加载 `childSessionData`；在 `onPracticeClick` 中确保 `childSessionData` 为最新 DB 数据
- **更新 README**：明确 LBL button bar = Normal button bar 原则，更新算法按钮栏表格

## Impact

- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 定位 useEffect fallback
  - `src/components/overlay/Footer.tsx` — 删除 `isLblNextActive` 和 `LblNextControls`
  - `src/components/overlay/PracticeOverlay.tsx` — 插队返回后 `childSessionData` 重载、移除 `currentChildIsLblNext` 传递
  - `README.md` — 更新算法按钮栏文档

---

## 状态流转图（修复后）

```
LBL 子 block Footer（修复后 — 三种算法按钮栏与 Normal 一致）：

  GradingControlsWrapper:
  ┌─ isAutoAdvanceMode? (effectiveAlgorithm ≠ SM2)
  │  ┌─ FixedIntervalModeControls(effectiveAlgorithm)
  │  │ Progressive: [Review X days] [Next ▶]
  │  │ FixedTime:   [Change Interval ▼] [Next ▶]
  │  └────────────────────────────────────────
  │
  └─ else (SM2): SpacedIntervalModeControls
     ┌─ [Forgot] [Hard] [Good] [Perfect]
     └────────────────────────────────────

Normal vs LBL 唯一差异：
- Normal: 评分/Next 后翻页到下一张卡（setCurrentIndex + 1）
- LBL:    评分/Next 后推进到下一行子 block（findNextDueChildIndex + 1）
```

---

## ADDED Requirements

### Requirement: LBL 子 block 初始化时第一行始终可见

系统 SHALL 在 LBL 模式下，无论 `childSessionData` 是否加载完成或是否为空，都确保第一个到期子 block 被渲染。

#### Scenario: 新子 block（无历史 session）时从第一行开始
- **WHEN** LBL 卡片的所有子 block 都没有历史 session 数据（首次学习）
- **THEN** `lineByLineCurrentChildIndex = 0`（第一个子 block）
- **AND** `lineByLineRevealedCount = 1`（第一行可见）
- **AND** LineByLineView 渲染第一个子 block

#### Scenario: childSessionData 异步加载后正确定位
- **WHEN** LBL 卡片进入，`getChildSessionData` 异步返回数据
- **THEN** `lineByLineCurrentChildIndex` 定位到第一个到期子 block
- **AND** `lineByLineRevealedCount >= lineByLineCurrentChildIndex + 1`
- **AND** 行为与之前一致

#### Scenario: 切换卡片时第一行正确显示
- **WHEN** 用户翻到新的 LBL 卡片
- **THEN** 第一个到期子 block 始终可见
- **AND** 不会出现"只有父级 block，没有子 block 显示"的情况

### Requirement: LBL 按钮栏与 Normal 模式完全一致

系统 SHALL 在 LBL 模式下使用与 Normal 模式完全相同的按钮栏渲染逻辑，三种算法三种按钮栏，边界清晰不混淆。

#### Scenario: LBL + Progressive 显示 Review + Next
- **WHEN** 当前 LBL 子 block 使用 Progressive 算法
- **THEN** Footer 显示 `FixedIntervalModeControls` 的 Progressive 变体
- **AND** 左侧显示非交互式 "Review X days" 按钮
- **AND** 右侧显示 "Next" 按钮
- **AND** 与 Normal Progressive 卡片按钮栏完全一致

#### Scenario: LBL + FixedTime 显示 Change Interval + Next
- **WHEN** 当前 LBL 子 block 使用 FixedTime 算法
- **THEN** Footer 显示 `FixedIntervalModeControls` 的 FixedTime 变体
- **AND** 左侧显示可点击的 "Change Interval" popover 按钮
- **AND** 右侧显示 "Next" 按钮
- **AND** 与 Normal FixedTime 卡片按钮栏完全一致

#### Scenario: LBL + SM2 显示评分按钮
- **WHEN** 当前 LBL 子 block 使用 SM2 算法
- **THEN** Footer 显示 SM2 评分按钮（Forgot/Hard/Good/Perfect）
- **AND** 子内容/挖空时先显示 ShowAnswer
- **AND** 行为与 Normal SM2 卡片按钮栏完全一致

#### Scenario: LblNextControls 组件已移除
- **WHEN** 开发者搜索代码
- **THEN** `LblNextControls` 组件不存在
- **AND** `isLblNextActive` 变量不存在

### Requirement: 插队返回后覆盖提示基于最新 DB 数据

系统 SHALL 在 LBL 子 block 评分时，确保"覆盖数据"提示基于最新数据库数据而非可能的过期状态来判断是否同日重评分。

#### Scenario: 插队后重学第一行不误报覆盖提示
- **WHEN** 用户跳过第一行直接学完第二行（Progressive/FixedTime）
- **AND** LBL 卡片被插队到一级队列后方
- **AND** 插队返回后用户学习第一行
- **THEN** 不显示"今日已学习，此次学习将覆盖今日数据"提示
- **AND** 第一行的数据正常保存

#### Scenario: 插队后重学第二行正确显示覆盖提示
- **WHEN** 用户学完第一行、第二行后 LBL 卡片被插队
- **AND** 插队返回后重新学习第二行
- **THEN** 显示"今日已学习，此次学习将覆盖今日数据"提示

#### Scenario: 正常同日重学显示覆盖提示（不受影响）
- **WHEN** 用户对同一个子 block 在同一天重复评分
- **THEN** 正常显示覆盖提示

## MODIFIED Requirements

### Requirement: useLineByLineReview 定位 useEffect

旧实现：守卫 `if (!Object.keys(childSessionData).length) return;` 在 childSessionData 为空时阻止定位。

新实现：当 `childSessionData` 为空（新子 block 无历史）时，使用 fallback：`lineByLineCurrentChildIndex = 0`, `lineByLineRevealedCount = 1`。当 `childSessionData` 有数据后，按原有逻辑定位到第一个到期子 block。

### Requirement: Footer GradingControlsWrapper 路由逻辑

旧实现：
```
isLblNextActive ? LblNextControls (Read + Next)
: isAutoAdvanceMode ? FixedIntervalModeControls
: SpacedIntervalModeControls
```

新实现：
```
isAutoAdvanceMode ? FixedIntervalModeControls (effectiveAlgorithm)
: SpacedIntervalModeControls
```

移除了 LBL 的 `LblNextControls` 特殊路径和 `isLblNextActive` 的前端路由依赖。

### Requirement: onPracticeClick LBL overwrite check

旧实现：直接使用闭包中的 `childSessionData` 判断 `isChildReScoring`。

新实现：判断 `isChildReScoring` 时，确保使用的是最新从 DB 加载的 `childSessionData`。在插队返回场景下，强制等待 `childSessionData` 重新加载完成后再允许评分操作，或者在评分前通过 `ref` 获取最新数据。

## REMOVED Requirements

### Requirement: LblNextControls 组件

**Reason**: 将 Progressive 和 FixedTime 统一路由到 Read+Next 违反了"逐行卡片"原则。LBL 子 block 就是 Normal 卡片，按钮栏应完全一致。
**Migration**: 删除 `LblNextControls` 组件定义和 `GradingControlsWrapper` 中的 `isLblNextActive` 分支。

### Requirement: currentChildIsLblNext 传递到 MainContext

**Reason**: `currentChildIsLblNext = !isGradingAlgorithm(currentChildAlgorithm)` 仅用于 `isLblNextActive` 路由，该路径移除后不再需要传递给 Footer。
**Migration**: 从 `MainContextProps` 和 `PracticeOverlay` 的 mainContextValue 中移除 `currentChildIsLblNext`。`useLineByLineReview` 内部仍保留该变量用于 grading 逻辑判断。
