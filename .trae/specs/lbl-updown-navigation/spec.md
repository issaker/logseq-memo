# LBL 模式上下翻行导航 + 二级队列重构 Spec

## Why

LBL 模式本质上是一个"队列中的队列"——一级队列（cardQueue）管理卡片间的左右翻页，二级队列（childUidsList）管理子 block 间的逐行学习。当前系统只有一级队列的导航能力（◀/▶），二级队列只能单向推进（评分后自动跳到下一个到期子 block），用户无法回退到上一行重新学习，也无法跳过当前行直接进入下一行。这导致 LBL 模式的学习体验缺乏灵活性，尤其在需要重新审视之前子 block 内容时非常不便。

同时，当前 `useLineByLineReview` 中 `lineByLineCurrentChildIndex` 的计算与 `findNextDueChildIndex` 耦合过紧——索引只能指向"下一个到期子 block"，无法指向已完成的子 block，这从架构上限制了上下翻行导航的实现。需要将"当前浏览位置"与"下一个到期位置"解耦，让 LBL 二级队列拥有与一级队列类似的独立导航能力。

## What Changes

- **解耦 LBL 当前浏览位置与到期计算**：`lineByLineCurrentChildIndex` 从"自动跳转到下一个到期子 block"改为"用户可控的浏览位置"，新增 `nextDueChildIndex` 用于追踪下一个到期位置
- **新增上下翻行导航函数**：`onLineByLinePrev`（回退到上一行子 block）和 `onLineByLineNext`（前进到下一行子 block），与左右翻页独立并行
- **新增上下翻行 UI 按钮**：在 Footer 中 LBL 模式下显示 ▲/▼ 按钮，与 ◀/▶ 按钮并列，风格一致
- **新增上下方向键快捷键**：↑ 键触发 `onLineByLinePrev`，↓ 键触发 `onLineByLineNext`
- **LBL 完成状态可逆**：当用户从完成状态回退到某一行时，`lineByLineIsCardComplete` 应变为 false，恢复评分能力
- **回溯重评分机制审查**：确认现有 `savePracticeData` 的同日覆盖机制在 LBL 回溯重评分场景下正确工作

## Impact

- Affected specs: fix-lbl-algorithm-scope（子 block 算法独立性）、optimize-compat-lbl-docs（LBL forgot 重插入）
- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 核心重构：解耦浏览位置与到期计算、新增导航函数、完成状态可逆
  - `src/components/overlay/Footer.tsx` — 新增 ▲/▼ 按钮、↑/↓ 快捷键
  - `src/components/overlay/PracticeOverlay.tsx` — 传递导航回调、调整 showAnswers 逻辑
  - `src/components/overlay/LineByLineView.tsx` — 适配新的浏览位置逻辑

---

## 系统性逻辑理解

### 双队列架构

```
一级队列 (cardQueue): [Card1, Card2, LBL-Card, Card3, ...]
                                        │
                                        ▼
二级队列 (childUidsList): [Child0, Child1, Child2, Child3]
                            ▲                    ▲
                            │                    │
                     lineByLineCurrentChildIndex  nextDueChildIndex
                     (用户浏览位置)              (下一个到期位置)
```

- **一级队列**：`cardQueue` + `currentIndex`，通过 ◀/▶ 导航
- **二级队列**：`childUidsList` + `lineByLineCurrentChildIndex`，通过 ▲/▼ 导航

### 导航独立性原则

| 维度 | 一级队列（左右翻页） | 二级队列（上下翻行） |
|------|---------------------|---------------------|
| 导航方向 | 卡片间 | 子 block 间 |
| 快捷键 | ← / → | ↑ / ↓ |
| 按钮 | ◀ / ▶ | ▲ / ▼ |
| 作用域 | 整个 cardQueue | 当前 LBL 卡片的 childUidsList |
| 评分影响 | 翻页不触发评分 | 翻行不触发评分，仅改变浏览位置 |

### LBL 与 Normal 的边界

- **LBL 卡片**：`interaction === LBL` 且有子 block → 激活二级队列
- **Normal 卡片**：`interaction === NORMAL` → 无二级队列，仅一级队列
- **父 block**：决定是否开启 LBL 模式（interaction 字段），其 algorithm 作为新子 block 的默认算法
- **子 block**：每张都是独立的问答卡，拥有自己的 algorithm 和 session 数据
- **三套算法**：SM2 / Progressive / FixedTime，每套算法对每张卡片（或子 block）独立运作

### 上下翻行的核心语义

- **▲（上一行）**：将 `lineByLineCurrentChildIndex` 减 1，回到上一个子 block 进行浏览/重评分
- **▼（下一行）**：将 `lineByLineCurrentChildIndex` 加 1，跳到下一个子 block（无论是否到期）
- 上下翻行**不触发评分**，仅改变浏览位置
- 回到已完成的子 block 时，用户可以重新评分（覆盖机制）
- 从完成状态回退时，`lineByLineIsCardComplete` 变为 false

---

## ADDED Requirements

### Requirement: LBL 二级队列浏览位置与到期位置解耦

系统 SHALL 将 `lineByLineCurrentChildIndex` 从"自动跳转到下一个到期子 block"改为"用户可控的浏览位置"，独立于到期计算逻辑。

#### Scenario: 初始进入 LBL 卡片时定位到第一个到期子 block
- **WHEN** 用户翻到一张 LBL 卡片
- **THEN** `lineByLineCurrentChildIndex` 定位到第一个到期子 block
- **AND** 行为与当前一致

#### Scenario: 评分后自动推进到下一个到期子 block
- **WHEN** 用户对当前子 block 评分完成
- **THEN** `lineByLineCurrentChildIndex` 自动推进到下一个到期子 block
- **AND** 行为与当前一致

#### Scenario: 上下翻行改变浏览位置但不影响到期计算
- **WHEN** 用户通过 ▲/▼ 翻行到任意子 block
- **THEN** `lineByLineCurrentChildIndex` 更新为目标位置
- **AND** 内部的 `nextDueChildIndex` 不受影响
- **AND** 评分后仍能正确推进到下一个到期子 block

### Requirement: LBL 模式上下翻行导航

系统 SHALL 在 LBL 模式下提供上下翻行导航功能，允许用户在子 block 间自由移动。

#### Scenario: 向上翻行到上一行子 block
- **WHEN** 用户在 LBL 模式下点击 ▲ 按钮或按 ↑ 键
- **AND** `lineByLineCurrentChildIndex > 0`
- **THEN** `lineByLineCurrentChildIndex` 减 1
- **AND** 显示上一个子 block 的内容
- **AND** `lineByLineRevealedCount` 确保目标子 block 可见

#### Scenario: 向上翻行在第一行时无操作
- **WHEN** 用户在 LBL 模式下点击 ▲ 按钮或按 ↑ 键
- **AND** `lineByLineCurrentChildIndex === 0`
- **THEN** 无操作，浏览位置不变

#### Scenario: 向下翻行到下一行子 block
- **WHEN** 用户在 LBL 模式下点击 ▼ 按钮或按 ↓ 键
- **AND** `lineByLineCurrentChildIndex < childUidsList.length - 1`
- **THEN** `lineByLineCurrentChildIndex` 加 1
- **AND** 显示下一个子 block 的内容
- **AND** `lineByLineRevealedCount` 确保目标子 block 可见

#### Scenario: 向下翻行在最后一行时无操作
- **WHEN** 用户在 LBL 模式下点击 ▼ 按钮或按 ↓ 键
- **AND** `lineByLineCurrentChildIndex === childUidsList.length - 1`
- **THEN** 无操作，浏览位置不变

#### Scenario: 上下翻行不触发评分
- **WHEN** 用户通过 ▲/▼ 翻行到另一个子 block
- **THEN** 不触发任何评分或数据保存操作
- **AND** 仅改变浏览位置

### Requirement: LBL 完成状态可逆

系统 SHALL 允许用户从 LBL 完成状态回退到未完成状态，恢复评分能力。

#### Scenario: 从完成状态回退恢复评分
- **WHEN** LBL 卡片所有子 block 已学习完成（`lineByLineIsCardComplete === true`）
- **AND** 用户点击 ▲ 按钮回退到某一行
- **THEN** `lineByLineIsCardComplete` 变为 false
- **AND** Footer 显示评分按钮（而非 LblCompletedControls）
- **AND** 用户可以对该子 block 重新评分

#### Scenario: 从完成状态回退后重新评分
- **WHEN** 用户从完成状态回退到某子 block 并重新评分
- **THEN** 新评分覆盖该子 block 的旧评分数据
- **AND** 评分后自动推进到下一个到期子 block
- **AND** 如果仍有到期子 block，继续学习；否则重新标记为完成

#### Scenario: 从完成状态向下翻行越过最后一行
- **WHEN** LBL 卡片已完成，用户按 ▼
- **THEN** 无操作（已在最后一行之后，没有更多行可翻）

### Requirement: LBL 模式上下翻行 UI 按钮

系统 SHALL 在 Footer 中 LBL 模式下显示 ▲/▼ 按钮，与 ◀/▶ 按钮并列，风格一致。

#### Scenario: LBL 模式活跃时显示上下翻行按钮
- **WHEN** 当前卡片为 LBL 模式且未完成
- **THEN** Footer 中在 ◀/▶ 按钮旁显示 ▲/▼ 按钮
- **AND** ▲/▼ 按钮样式与 ◀/▶ 按钮一致（bp3-button bp3-minimal，44px 最小尺寸）

#### Scenario: LBL 完成状态时显示上下翻行按钮
- **WHEN** LBL 卡片所有子 block 已完成
- **THEN** LblCompletedControls 中也显示 ▲/▼ 按钮
- **AND** ▲ 按钮可点击（回退到上一行），▼ 按钮禁用（已在最后）

#### Scenario: 非 LBL 模式不显示上下翻行按钮
- **WHEN** 当前卡片为 Normal 模式
- **THEN** 不显示 ▲/▼ 按钮

#### Scenario: 上下翻行按钮在各屏幕尺寸下正常显示
- **WHEN** 在移动端或小屏幕上
- **THEN** ▲/▼ 按钮与 ◀/▶ 按钮同样可见和可操作

### Requirement: LBL 模式上下方向键快捷键

系统 SHALL 支持 ↑/↓ 方向键作为 LBL 模式上下翻行的快捷键。

#### Scenario: ↑ 键触发向上翻行
- **WHEN** 用户在 LBL 模式下按 ↑ 键
- **AND** `lineByLineCurrentChildIndex > 0`
- **THEN** 触发 `onLineByLinePrev`，回退到上一行

#### Scenario: ↓ 键触发向下翻行
- **WHEN** 用户在 LBL 模式下按 ↓ 键
- **AND** `lineByLineCurrentChildIndex < childUidsList.length - 1`
- **THEN** 触发 `onLineByLineNext`，前进到下一行

#### Scenario: 非 LBL 模式下 ↑/↓ 键无特殊行为
- **WHEN** 当前卡片为 Normal 模式
- **THEN** ↑/↓ 键不触发翻行操作

#### Scenario: ↑/↓ 键与 ←/→ 键独立工作
- **WHEN** 用户在 LBL 模式下同时使用方向键
- **THEN** ←/→ 控制一级队列翻页，↑/↓ 控制二级队列翻行
- **AND** 两者互不干扰

### Requirement: LBL 回溯重评分覆盖机制

系统 SHALL 确保用户在 LBL 模式下回溯到已评分子 block 后重新评分时，新评分正确覆盖旧评分数据。

#### Scenario: 回溯到已评分子 block 重新评分
- **WHEN** 用户回溯到一个已有评分数据的子 block
- **AND** 对该子 block 重新评分
- **THEN** `savePracticeData` 的同日覆盖机制正确触发
- **AND** 新评分数据覆盖旧评分数据
- **AND** `childSessionData` 即时更新
- **AND** `sessionOverrides` 即时更新

#### Scenario: 回溯重评分后父级 nextDueDate 更新
- **WHEN** 用户回溯重评分某子 block
- **THEN** `updateParentNextDueDate` 被调用
- **AND** 父级 LBL 卡片的 nextDueDate 根据所有子 block 的最新状态重新计算

#### Scenario: 多次回溯重评分的数据一致性
- **WHEN** 用户多次回溯到同一子 block 并反复评分
- **THEN** 每次评分都正确覆盖前一次
- **AND** 不产生重复的 session block
- **AND** 学习进度数据始终反映最后一次评分结果

#### Scenario: 回溯重评分与重插入机制的兼容
- **WHEN** 用户回溯重评分某子 block 且评分为 Forgot（grade=0）
- **AND** `forgotReinsertOffset > 0`
- **THEN** LBL 卡片按 forgotReinsertOffset 重新插入一级队列
- **AND** 行为与正常评分 Forgot 一致

#### Scenario: 回溯重评分 LblNext 子 block 的重插入兼容
- **WHEN** 用户回溯重评分某 LblNext 子 block
- **AND** `lblNextReinsertOffset > 0`
- **AND** 当前子 block 不是最后一个
- **THEN** LBL 卡片按 lblNextReinsertOffset 重新插入一级队列
- **AND** 行为与正常 LblNext 评分一致

### Requirement: 上下翻行后 showAnswers 状态正确

系统 SHALL 在上下翻行后正确设置 showAnswers 状态，确保用户看到正确的界面。

#### Scenario: 翻行到已评分子 block 时显示答案
- **WHEN** 用户翻行到一个已评分（已掌握）的子 block
- **THEN** `showAnswers` 为 true
- **AND** 子 block 以已掌握样式显示（降低透明度 + 绿色边框）

#### Scenario: 翻行到未评分 SM2 子 block 时隐藏答案
- **WHEN** 用户翻行到一个未评分的 SM2 子 block
- **THEN** `showAnswers` 为 false
- **AND** 需要先 Show Answer 再评分

#### Scenario: 翻行到 LblNext 子 block 时显示答案
- **WHEN** 用户翻行到一个 LblNext（Progressive/FixedTime）子 block
- **THEN** `showAnswers` 为 true
- **AND** 显示 Read + Next 按钮

### Requirement: LineByLineView 适配浏览位置

系统 SHALL 确保 LineByLineView 正确渲染用户当前浏览的子 block 位置。

#### Scenario: 翻行后当前行高亮正确
- **WHEN** 用户翻行到某子 block
- **THEN** 该子 block 显示当前行高亮（蓝色边框）
- **AND** 之前的高亮行恢复为普通/已掌握样式

#### Scenario: 翻行后行号指示器更新
- **WHEN** 用户翻行到某子 block
- **THEN** LineByLineSeparator 中的行号更新为当前位置
- **AND** 显示 "Line X / Y (Z due)" 格式

## MODIFIED Requirements

### Requirement: useLineByLineReview Hook 导航能力

旧实现中 `lineByLineCurrentChildIndex` 只能通过评分自动推进到下一个到期子 block，现改为支持用户主动上下翻行导航，浏览位置与到期计算解耦。

### Requirement: Footer LBL 模式控件

旧实现中 LBL 完成状态只显示 ◀/▶ 和 "All lines reviewed" 文字，现改为同时显示 ▲/▼ 按钮支持回退浏览。LBL 活跃状态时在评分控件旁显示 ▲/▼ 按钮。

### Requirement: Footer 快捷键系统

旧实现中只有 ←/→ 方向键快捷键，现新增 ↑/↓ 方向键快捷键用于 LBL 二级队列导航。

## REMOVED Requirements

无移除的需求。
