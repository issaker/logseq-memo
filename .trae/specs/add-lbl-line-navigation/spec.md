# LBL 模式上下翻行导航 Spec

## Why

LBL（逐行）模式下，用户只能按顺序自动推进子 block 学习，无法回退到之前的子 block 重新学习或跳过当前子 block 前进到下一行。当用户想要重新审视之前某行的内容或评分时，只能通过左右翻页切换到其他卡片再切回来，体验不连贯。需要新增上下翻行导航系统，让用户在 LBL 卡片内自由浏览子 block。

## What Changes

- **新增 `onLineByLineNavigateUp` 回调**：在 `useLineByLineReview` 中实现向上翻行逻辑，将 `lineByLineCurrentChildIndex` 移动到上一个子 block
- **新增 `onLineByLineNavigateDown` 回调**：在 `useLineByLineReview` 中实现向下翻行逻辑，将 `lineByLineCurrentChildIndex` 移动到下一个子 block
- **Footer 新增 ▲/▼ 按钮**：在 LBL 模式下显示上下翻行按钮，与现有 ◀/▶ 左右翻页按钮并行排列
- **新增上下方向键快捷键**：↑ 键触发向上翻行，↓ 键触发向下翻行
- **MainContext 新增导航回调**：将 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown` 通过 Context 传递给 Footer
- **回溯时重置 showAnswers 状态**：向上翻行回到已评分子 block 时，根据子 block 算法类型正确设置 showAnswers
- **验证学习记录覆盖机制**：确认 LBL 模式下子 block 的 `savePracticeData` 同日覆盖逻辑正确工作

## Impact

- Affected specs: fix-lbl-algorithm-scope（算法作用域）、optimize-compat-lbl-docs（LBL Forgot 重插入）
- Affected code:
  - `src/hooks/useLineByLineReview.ts` — 新增 `onLineByLineNavigateUp`/`onLineByLineNavigateDown` 回调
  - `src/components/overlay/Footer.tsx` — 新增 ▲/▼ 按钮和 ↑/↓ 快捷键
  - `src/components/overlay/PracticeOverlay.tsx` — 传递导航回调到 MainContext，处理回溯时的 showAnswers 重置
  - `src/components/overlay/LineByLineView.tsx` — 无需修改（已根据 `lineByLineCurrentChildIndex` 渲染）

## ADDED Requirements

### Requirement: LBL 模式上下翻行导航

系统 SHALL 在 LBL 模式下提供上下翻行导航功能，允许用户在子 block 之间自由移动，独立于左右翻页（卡片间导航）系统。

#### Scenario: 向上翻行到上一个子 block
- **WHEN** 用户在 LBL 模式下且当前不在第一个子 block（`lineByLineCurrentChildIndex > 0`）
- **AND** 用户点击 ▲ 按钮或按 ↑ 键
- **THEN** `lineByLineCurrentChildIndex` 减 1
- **AND** `lineByLineRevealedCount` 更新为 `max(lineByLineRevealedCount, lineByLineCurrentChildIndex + 1)`
- **AND** UI 聚焦到新的当前子 block

#### Scenario: 向上翻行在第一个子 block 时无操作
- **WHEN** 用户在 LBL 模式下且当前在第一个子 block（`lineByLineCurrentChildIndex === 0`）
- **AND** 用户点击 ▲ 按钮或按 ↑ 键
- **THEN** 无操作，当前位置不变

#### Scenario: 向下翻行到下一个子 block
- **WHEN** 用户在 LBL 模式下且当前不在最后一个子 block（`lineByLineCurrentChildIndex < childUidsList.length - 1`）
- **AND** 用户点击 ▼ 按钮或按 ↓ 键
- **THEN** `lineByLineCurrentChildIndex` 加 1
- **AND** `lineByLineRevealedCount` 更新为 `max(lineByLineRevealedCount, lineByLineCurrentChildIndex + 1)`
- **AND** UI 聚焦到新的当前子 block

#### Scenario: 向下翻行在最后一个子 block 时无操作
- **WHEN** 用户在 LBL 模式下且当前在最后一个子 block（`lineByLineCurrentChildIndex >= childUidsList.length - 1`）
- **AND** 用户点击 ▼ 按钮或按 ↓ 键
- **THEN** 无操作，当前位置不变

#### Scenario: 向下翻行跳过当前子 block 不触发评分
- **WHEN** 用户在 LBL 模式下对当前到期子 block 点击 ▼ 按钮
- **THEN** 直接移动到下一个子 block
- **AND** 当前子 block 不被评分，保持到期状态
- **AND** 下次回到该子 block 时仍需评分

#### Scenario: LBL 卡片完成后仍可上下翻行
- **WHEN** LBL 卡片所有子 block 已复习完毕（`lineByLineIsCardComplete === true`）
- **AND** 用户点击 ▲ 按钮
- **THEN** `lineByLineCurrentChildIndex` 从 `childUidsList.length` 回退到最后一个子 block
- **AND** `lineByLineIsCardComplete` 变为 false
- **AND** 用户可以重新查看和评分该子 block

### Requirement: 上下翻行按钮 UI 设计

系统 SHALL 在 LBL 模式的 Footer 区域显示 ▲/▼ 翻行按钮，与现有 ◀/▶ 翻页按钮风格一致。

#### Scenario: LBL 模式下显示翻行按钮
- **WHEN** LBL 模式激活且卡片未完成
- **THEN** Footer 在 ◀/▶ 按钮旁边显示 ▲/▼ 按钮
- **AND** ▲/▼ 按钮使用与 ◀/▶ 相同的样式（bp3-button bp3-minimal，44px × 44px）

#### Scenario: LBL 完成状态下显示翻行按钮
- **WHEN** LBL 卡片所有行已复习完毕（`lineByLineIsCardComplete === true`）
- **THEN** LblCompletedControls 中显示 ▲ 按钮，允许用户回退查看之前的子 block
- **AND** ▼ 按钮不显示（因为已在最后）

#### Scenario: 非 LBL 模式下不显示翻行按钮
- **WHEN** 当前卡片不是 LBL 模式
- **THEN** 不显示 ▲/▼ 按钮

### Requirement: 上下方向键快捷键

系统 SHALL 支持上下方向键作为上下翻行的快捷键，与左右方向键作为翻页快捷键形成对称设计。

#### Scenario: ↑ 键向上翻行
- **WHEN** LBL 模式激活
- **AND** 用户按下 ↑ 键
- **THEN** 触发 `onLineByLineNavigateUp`
- **AND** 行为与点击 ▲ 按钮一致

#### Scenario: ↓ 键向下翻行
- **WHEN** LBL 模式激活
- **AND** 用户按下 ↓ 键
- **THEN** 触发 `onLineByLineNavigateDown`
- **AND** 行为与点击 ▼ 按钮一致

#### Scenario: 非 LBL 模式下方向键不触发翻行
- **WHEN** 当前卡片不是 LBL 模式
- **AND** 用户按下 ↑ 或 ↓ 键
- **THEN** 不触发翻行操作

### Requirement: 回溯时 showAnswers 状态正确重置

系统 SHALL 在用户通过上下翻行导航到不同子 block 时，根据目标子 block 的状态正确设置 `showAnswers`。

#### Scenario: 回溯到已掌握的子 block
- **WHEN** 用户向上翻行到一个已掌握的子 block（`nextDueDate > now`）
- **THEN** `showAnswers` 设为 true（已掌握的行无需 Show Answer 步骤）
- **AND** Footer 显示该子 block 对应的评分/推进按钮

#### Scenario: 回溯到到期的 SM2 子 block
- **WHEN** 用户向上翻行到一个到期的 SM2 子 block
- **THEN** `showAnswers` 设为 false（需要先 Show Answer）
- **AND** Footer 显示 Show Answer 按钮

#### Scenario: 回溯到到期的 LblNext 子 block
- **WHEN** 用户向上翻行到一个到期的 Progressive/FixedTime 子 block
- **THEN** `showAnswers` 设为 true（LblNext 模式直接显示内容）
- **AND** Footer 显示 Read + Next 按钮

#### Scenario: 前进到新的到期子 block
- **WHEN** 用户向下翻行到一个未读的子 block
- **THEN** 根据该子 block 的算法类型设置 `showAnswers`（SM2 → false，LblNext → true）

### Requirement: LBL 模式学习记录覆盖机制

系统 SHALL 在 LBL 模式下支持学习记录覆盖，允许用户在回溯到已评分子 block 后重新评分，新评分覆盖旧评分数据。

#### Scenario: 回溯后重新评分覆盖旧数据
- **WHEN** 用户在 LBL 模式下向上翻行到已评分的子 block
- **AND** 用户对该子 block 重新评分
- **THEN** `savePracticeData` 使用同日覆盖逻辑更新该子 block 的 session 数据
- **AND** 旧评分数据被新评分数据完全替换
- **AND** `childSessionData` 即时更新

#### Scenario: 多次回溯重新评分的准确性
- **WHEN** 用户多次回溯到同一子 block 并重新评分
- **THEN** 每次评分都正确覆盖前一次的数据
- **AND** `childSessionData` 始终反映最新的评分结果
- **AND** 父 block 的 `nextDueDate` 在每次评分后正确更新

#### Scenario: 回溯重新评分后父 block nextDueDate 正确
- **WHEN** 用户回溯到已掌握的子 block 并重新评分为 Forgot
- **THEN** 该子 block 的 `nextDueDate` 更新为 today
- **AND** 父 block 的 `nextDueDate` 更新为 today（因为有子 block 到期）
- **AND** 卡片重新出现在到期队列中

#### Scenario: 同日覆盖机制验证
- **WHEN** 用户在同一天对 LBL 子 block 多次评分
- **THEN** `savePracticeData` 的同日去重逻辑正确工作（更新现有 session block 而非创建新的）
- **AND** session block 的 emoji 标识根据最新评分更新
- **AND** 旧字段在重写前被正确回填（`SESSION_SNAPSHOT_KEYS` 检查）

### Requirement: 上下翻行与现有左右翻页系统并行工作

系统 SHALL 确保上下翻行（子 block 间导航）与左右翻页（卡片间导航）完全独立，互不干扰。

#### Scenario: 上下翻行不影响卡片队列位置
- **WHEN** 用户在 LBL 模式下点击 ▲ 或 ▼ 按钮
- **THEN** `currentIndex`（卡片队列位置）不变
- **AND** 仅 `lineByLineCurrentChildIndex`（子 block 位置）变化

#### Scenario: 左右翻页不影响子 block 位置
- **WHEN** 用户在 LBL 模式下点击 ◀ 或 ▶ 按钮
- **THEN** `lineByLineCurrentChildIndex` 不变（或在新卡片中重新初始化）
- **AND** 卡片队列位置变化

#### Scenario: 上下翻行不触发插队机制
- **WHEN** 用户在 LBL 模式下点击 ▼ 跳过当前到期子 block
- **THEN** 不触发 `lblNextReinsertOffset` 或 `forgotReinsertOffset` 插队逻辑
- **AND** 仅移动子 block 焦点，不修改卡片队列

### Requirement: 所有算法模式下上下翻行功能正常

系统 SHALL 确保上下翻行功能在 SM2、Progressive、FixedTime 三种算法模式下均正常工作。

#### Scenario: SM2 算法下上下翻行
- **WHEN** LBL 卡片使用 SM2 算法
- **AND** 用户上下翻行到 SM2 子 block
- **THEN** Footer 显示 SM2 评分按钮（Forgot/Hard/Good/Perfect）
- **AND** `currentChildAlgorithm` 正确反映该子 block 的算法
- **AND** `intervalEstimates` 基于该子 block 的 SM2 数据计算

#### Scenario: Progressive 算法下上下翻行
- **WHEN** LBL 卡片使用 Progressive 算法
- **AND** 用户上下翻行到 Progressive 子 block
- **THEN** Footer 显示 Read + Next 按钮
- **AND** `currentChildIsLblNext` 为 true

#### Scenario: FixedTime 算法下上下翻行
- **WHEN** LBL 卡片使用 FixedTime 算法
- **AND** 用户上下翻行到 FixedTime 子 block
- **THEN** Footer 显示 Review + Next 按钮
- **AND** `fixed_multiplier` 和 `fixed_unit` 正确加载

#### Scenario: 混合算法子 block 间翻行
- **WHEN** LBL 卡片的子 block 0 使用 SM2，子 block 1 使用 Progressive
- **AND** 用户从子 block 0 翻行到子 block 1
- **THEN** Footer 从 SM2 评分按钮切换为 Read + Next 按钮
- **AND** `currentChildAlgorithm` 从 SM2 切换为 Progressive
- **AND** `intervalEstimates` 基于新算法重新计算

## MODIFIED Requirements

### Requirement: useLineByLineReview Hook 输出

旧实现输出 `onLineByLineGrade` 和 `onLineByLineShowAnswer`，现新增 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown` 回调。

### Requirement: Footer GradingControlsWrapper

旧实现仅显示 ◀/▶ 翻页按钮，现新增 ▲/▼ 翻行按钮（仅在 LBL 模式下显示）。

### Requirement: Footer LblCompletedControls

旧实现仅显示 ◀/▶ 和 "All lines reviewed" 文本，现新增 ▲ 按钮允许回退查看之前的子 block。

### Requirement: MainContext

旧实现不包含 LBL 行导航回调，现新增 `onLineByLineNavigateUp` 和 `onLineByLineNavigateDown`。

### Requirement: Footer 快捷键

旧实现仅有 `left`/`right` 方向键快捷键，现新增 `up`/`down` 方向键快捷键（仅在 LBL 模式下生效）。

## REMOVED Requirements

无移除的需求。
