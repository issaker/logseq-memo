# LBL 二级队列架构修复 — 算法源统一 + showAnswers 状态机重构 Spec

## Why

添加上下翻行功能后，LBL 模式出现了系统性 bug：Progressive 子 block 显示 "Show Answer"、Next 按钮行为不稳定、SM2 评分后翻行逻辑混乱。根因是 **算法源不统一** — Footer 使用父卡片的 `algorithmFromSession` 决定 UI 行为（space 键、快捷键、控件选择），而 LBL 模式下应使用当前子 block 的 `currentChildAlgorithm`。此外，`showAnswers` 的计算逻辑分散在 PracticeOverlay useEffect 和 Footer prop override 两处，在 `childSessionData` 异步加载期间产生竞态条件。

## What Changes

- **统一 LBL 模式下的算法源**：在 LBL 模式下，Footer 的所有 UI 决策（space 键行为、快捷键启用/禁用、控件选择）统一使用 `currentChildAlgorithm` 而非父卡片的 `algorithmFromSession`
- **重构 showAnswers 状态机**：将 LBL 模式下的 `showAnswers` 决策集中到 PracticeOverlay 的 useEffect 中，移除 Footer 的 prop override 逻辑，消除竞态条件
- **修复 space 键在 LBL 模式下的行为**：space 键应根据当前子 block 的算法决定是 `intervalPractice()` 还是 `gradeFn(5)`
- **修复快捷键启用/禁用逻辑**：F/H/G/E 键应根据当前子 block 的算法决定是否可用

## Impact

- Affected specs: lbl-updown-navigation（上下翻行功能引入的架构问题）
- Affected code:
  - `src/components/overlay/Footer.tsx` — 算法源统一 + 快捷键修复
  - `src/components/overlay/PracticeOverlay.tsx` — showAnswers 状态机重构

---

## 系统性逻辑分析

### 当前架构的根本问题：算法源双轨制

```
父卡片 algorithm (algorithmFromSession)
  └─ Footer: space 键行为、F/H/G/E 快捷键、isAutoAdvanceMode
  └─ PracticeSessionContext: 全局 algorithm 状态

子 block currentChildAlgorithm (MainContext)
  └─ useLineByLineReview: onLineByLineGrade 分支选择
  └─ MainContext: currentChildIsLblNext
  └─ PracticeOverlay: showAnswers useEffect
```

**问题**：当父卡片是 SM2 但子 block 是 Progressive 时：
- `algorithmFromSession = SM2` → Footer 认为"需要 Show Answer + 评分"
- `currentChildAlgorithm = PROGRESSIVE` → hook 认为"直接 Next"

两个算法源对同一张子 block 给出矛盾的 UI 决策，导致：
1. space 键调用 `gradeFn(5)` 而非 `intervalPractice()`（因为 `algorithmFromSession` 是 SM2）
2. F/H/G 键启用（因为父是 SM2），但当前子 block 是 Progressive 不需要评分
3. showAnswers 在 childSessionData 加载前为 false（因为 fallback 到父的 SM2），显示 "Show Answer"

### 正确架构：LBL 模式下算法源唯一

```
Normal 模式: effectiveAlgorithm = algorithm (父卡片)
LBL 模式:   effectiveAlgorithm = currentChildAlgorithm (当前子 block)
```

所有 UI 决策统一基于 `effectiveAlgorithm`：
- space 键：`isGradingAlgorithm(effectiveAlgorithm)` ? `gradeFn(5)` : `intervalPractice()`
- F/H/G 键：`disabled: !isGradingAlgorithm(effectiveAlgorithm)`
- E 键：`disabled: !isFixedTimeAlgorithm(effectiveAlgorithm)`
- 控件选择：基于 `effectiveAlgorithm` 和 `isLineByLine`

### showAnswers 状态机重构

当前 showAnswers 由两处控制：
1. PracticeOverlay useEffect 设置 `showAnswers` state
2. Footer prop override: `isLineByLineActive ? (lineByLineIsCardComplete || lineByLineRevealedCount > lineByLineCurrentChildIndex) : showAnswers`

问题：prop override 在 `childSessionData` 加载前使用 `lineByLineRevealedCount=0`，导致 Progressive 子 block 短暂显示 "Show Answer"。

修复：移除 Footer 的 prop override，让 PracticeOverlay 的 useEffect 成为 showAnswers 的唯一决策点。在 useEffect 中增加对 `childSessionData` 加载状态的判断 — 如果 `childSessionData` 为空（尚未加载），不设置 showAnswers（保持上一次的值或默认值）。

### LBL 二级队列出入口与行间关系

```
一级队列出入口:
  进入 LBL: 翻到 LBL 卡片 → 初始化二级队列（定位到第一个到期子 block）
  离开 LBL: 评分后 setCurrentIndex+1 → 进入一级队列下一张卡
  重入 LBL: 插队卡片回来 → 重新初始化二级队列（从下一个到期子 block 继续）

二级队列行间关系:
  评分推进: onLineByLineGrade → 自动推进到下一个到期子 block
  上下翻行: onLineByLinePrev/Next → 仅改变浏览位置，不触发评分
  完成状态: 所有子 block 评分完成 → lineByLineIsCardComplete=true → 显示 LblCompletedControls
  回退重评: ▲ 翻回 → lineByLineIsCardComplete=false → 恢复评分能力

算法与子卡片的关系:
  SM2 子 block: Show Answer → 评分(Forgot/Hard/Good/Perfect) → 推进
  Progressive 子 block: 直接显示 → Read+Next → 推进
  FixedTime 子 block: 直接显示 → Review+Next → 推进
  已掌握子 block: 直接显示（降低透明度+绿色边框）→ 跳过
```

---

## ADDED Requirements

### Requirement: LBL 模式下统一使用 currentChildAlgorithm 作为算法源

系统 SHALL 在 LBL 模式下，将所有 UI 决策的算法源从父卡片的 `algorithmFromSession` 切换为当前子 block 的 `currentChildAlgorithm`。

#### Scenario: LBL 模式下 space 键根据子 block 算法决定行为
- **WHEN** 用户在 LBL 模式下按 space 键
- **AND** 当前子 block 算法为 Progressive
- **THEN** 触发 `intervalPractice()`（Next 行为）
- **AND** 不触发 `gradeFn(5)`（Perfect 行为）

#### Scenario: LBL 模式下 space 键对 SM2 子 block 触发评分
- **WHEN** 用户在 LBL 模式下按 space 键
- **AND** 当前子 block 算法为 SM2
- **AND** showAnswers 为 true
- **THEN** 触发 `gradeFn(5)`（Perfect 行为）

#### Scenario: LBL 模式下 F/H/G 快捷键根据子 block 算法启用/禁用
- **WHEN** 当前子 block 算法为 Progressive
- **THEN** F/H/G 快捷键禁用
- **WHEN** 当前子 block 算法为 SM2
- **THEN** F/H/G 快捷键启用

#### Scenario: LBL 模式下 E 快捷键根据子 block 算法启用/禁用
- **WHEN** 当前子 block 算法为 FixedTime
- **THEN** E 快捷键启用
- **WHEN** 当前子 block 算法为 SM2
- **THEN** E 快捷键禁用

### Requirement: showAnswers 状态机集中化

系统 SHALL 将 LBL 模式下的 showAnswers 决策集中到 PracticeOverlay 的 useEffect 中，移除 Footer 的 prop override 逻辑。

#### Scenario: childSessionData 加载期间不闪烁 Show Answer
- **WHEN** LBL 卡片刚加载，childSessionData 尚未加载完成
- **AND** 当前子 block 算法为 Progressive
- **THEN** showAnswers 保持为 true（不短暂显示 Show Answer 按钮）

#### Scenario: SM2 子 block 正确显示 Show Answer
- **WHEN** 当前子 block 算法为 SM2
- **AND** 子 block 尚未显示答案
- **THEN** showAnswers 为 false，显示 Show Answer 按钮

#### Scenario: Progressive 子 block 直接显示答案
- **WHEN** 当前子 block 算法为 Progressive 或 FixedTime
- **THEN** showAnswers 为 true，直接显示 Read+Next 或 Review+Next 按钮

#### Scenario: 已掌握子 block 直接显示
- **WHEN** 用户翻行到一个已掌握的子 block
- **THEN** showAnswers 为 true，子 block 以已掌握样式显示

## MODIFIED Requirements

### Requirement: Footer 算法源切换

旧实现中 Footer 始终使用 `algorithmFromSession`（父卡片算法）决定 UI 行为，现改为在 LBL 模式下使用 `currentChildAlgorithm`（当前子 block 算法）。

### Requirement: PracticeOverlay showAnswers 传递给 Footer

旧实现中 PracticeOverlay 传递 `isLineByLineActive ? (computed) : showAnswers` 作为 Footer 的 showAnswers prop，现改为直接传递 `showAnswers` state，让 PracticeOverlay 的 useEffect 成为唯一决策点。

## REMOVED Requirements

无移除的需求。
