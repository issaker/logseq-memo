# LBL/Normal 模式切换会话重置修复 Spec

## Why

切换 Interaction（Normal ↔ LBL）时，`onSelectInteraction` 调用 `fetchPracticeData()` 触发全局数据刷新，`today` 对象重新计算导致 `initialCardUids` 变化，PracticeOverlay 的 useEffect 监听 `initialCardUids` 变化后将 `cardQueue` 重置为新的 `initialCardUids`、`currentIndex` 重置为 0，导致会话回退到第一张卡片。这是一个架构级问题：模式切换（局部操作）不应触发会话级状态重置（全局操作）。

## 根因分析

### 数据链路追踪

```
onSelectInteraction(newInteraction)
  → setSessionOverrides(...)          // 乐观更新当前卡片的 session
  → applyOptimisticCardMeta(...)      // 乐观更新 cardMeta
  → updateReviewConfig(...)           // 持久化到 Roam 数据页
  → fetchPracticeData()               // ⚠️ 触发全局数据刷新
    → usePracticeData: setRefetchTrigger(!trigger)
    → useEffect: queries.getPracticeData(...)
    → setToday(todayStats)            // today 对象重新计算
    → setPracticeData(practiceData)   // practiceData 重新计算

// PracticeOverlay 中的级联效应：
today 变化 → todaySelectedTag 变化 → initialCardUids 变化
  → useEffect([selectedTag, initialCardUids]):
      setCardQueue(initialCardUids)   // ⚠️ 卡片队列被重置
      setCurrentIndex(0)              // ⚠️ 索引回退到 0

// 另一个级联效应：
practiceData 变化 → sessions 变化 → currentCardData 变化
  → useCurrentCardData: cardChanged = false (same UID)
  → 但 cardMeta 可能被 useEffect 重置（如果 latestSession 变化）
```

### 问题分类

| # | 问题 | 根因 | 严重度 |
|---|------|------|--------|
| 1 | 切换 Interaction 后会话回退到第一张卡片 | `fetchPracticeData()` → `initialCardUids` 变化 → `setCardQueue` + `setCurrentIndex(0)` | **高** |
| 2 | 切换 Algorithm 后同样存在回退风险 | `onSelectAlgorithm` 也调用 `fetchPracticeData()`，同样触发级联重置 | **高** |
| 3 | `initialCardUids` useEffect 过于激进 | 只要 `initialCardUids` 引用变化就重置队列，不区分"卡片列表真正变化"还是"同列表重新计算" | **高** |
| 4 | `fetchPracticeData` 是全局刷新 | 模式切换只需更新当前卡片的 session 数据，不需要重新计算整个 today | **中** |
| 5 | `childSessionData` 在模式切换后可能过期 | Normal → LBL 时需要重新获取子 block 数据，但 `getChildSessionData` 的触发条件不够精确 | **中** |
| 6 | `isLineByLineActive` 状态切换时机 | `applyOptimisticCardMeta` 更新 `cardMeta.interaction`，但 `isLineByLineActive` 依赖 `interaction`（从 `cardMeta` 派生），切换后 `useLineByLineReview` 的 useEffect 被触发 | **低** |

## What Changes

- **移除 `onSelectInteraction` 中的 `fetchPracticeData()` 调用**：模式切换后不触发全局数据刷新，仅依赖乐观更新（`setSessionOverrides` + `applyOptimisticCardMeta`）
- **移除 `onSelectAlgorithm` 中的 `fetchPracticeData()` 调用**：算法切换同理，不触发全局刷新
- **修改 `initialCardUids` useEffect 的重置逻辑**：仅在卡片列表真正变化（长度变化或 UID 集合变化）时重置 `cardQueue`，同列表重新计算时不重置
- **在 `onSelectInteraction` 中处理 LBL 模式切换的副作用**：Normal → LBL 时确保 `childSessionData` 被正确获取；LBL → Normal 时清理 LBL 状态

## Impact

- Affected specs: fix-lbl-algorithm-scope（算法切换不触发全局刷新）、fix-lbl-completed-card-display（LBL 完成状态不受刷新影响）
- Affected code:
  - `src/components/overlay/PracticeOverlay.tsx` — `onSelectInteraction`、`onSelectAlgorithm`、`initialCardUids` useEffect
  - `src/hooks/useLineByLineReview.ts` — 可能需要处理模式切换时的状态重置

## ADDED Requirements

### Requirement: 模式切换不触发全局数据刷新

系统 SHALL 在切换 Interaction 或 Algorithm 时不调用 `fetchPracticeData()`，仅通过乐观更新（`setSessionOverrides` + `applyOptimisticCardMeta`）反映变更。

#### Scenario: 切换 Interaction 后卡片位置不变
- **WHEN** 用户在第 N 张卡片上切换 Interaction 为 LBL
- **THEN** `currentIndex` 保持为 N，`cardQueue` 不变
- **AND** 当前卡片立即进入 LBL 模式（显示子 block）

#### Scenario: 切换 Algorithm 后卡片位置不变
- **WHEN** 用户在第 N 张卡片上切换 Algorithm 为 PROGRESSIVE
- **THEN** `currentIndex` 保持为 N，`cardQueue` 不变
- **AND** 当前卡片立即使用新算法

#### Scenario: 模式切换持久化正确
- **WHEN** 用户切换 Interaction 或 Algorithm
- **THEN** `updateReviewConfig` 仍然被调用，变更持久化到 Roam 数据页
- **AND** 下次打开会话时变更仍然生效

### Requirement: initialCardUids useEffect 仅在列表真正变化时重置

系统 SHALL 修改 `initialCardUids` 的 useEffect，仅在卡片 UID 列表真正变化（长度变化或 UID 集合不同）时重置 `cardQueue` 和 `currentIndex`，避免因对象引用变化导致不必要的重置。

#### Scenario: fetchPracticeData 触发 today 重新计算但卡片列表不变
- **WHEN** `fetchPracticeData()` 被其他操作触发（如评分后自动刷新），导致 `today` 对象重新计算
- **AND** 新的 `initialCardUids` 与旧的包含相同的 UID 集合（顺序可能不同）
- **THEN** `cardQueue` 和 `currentIndex` 不被重置

#### Scenario: 真正有新卡片加入
- **WHEN** 新卡片被添加到复习队列（`initialCardUids` 长度增加或 UID 集合不同）
- **THEN** `cardQueue` 被更新，`currentIndex` 重置为 0

### Requirement: Normal → LBL 切换时正确初始化子 block 数据

系统 SHALL 在用户将 Interaction 从 Normal 切换为 LBL 时，确保 `childSessionData` 被正确获取，`useLineByLineReview` 的状态被正确初始化。

#### Scenario: Normal → LBL 切换
- **WHEN** 用户在 Normal 模式下切换 Interaction 为 LBL
- **THEN** `isLineByLineActive` 变为 true
- **AND** `childSessionData` 通过 `getChildSessionData` 获取
- **AND** `lineByLineCurrentChildIndex` 被初始化为第一个到期子 block 的索引
- **AND** `lineByLineRevealedCount` 被正确设置

#### Scenario: LBL → Normal 切换
- **WHEN** 用户在 LBL 模式下切换 Interaction 为 Normal
- **THEN** `isLineByLineActive` 变为 false
- **AND** `childSessionData` 被清空
- **AND** 卡片显示为普通模式（非 LBL）

### Requirement: 模式切换后 today 统计数据最终一致

系统 SHALL 确保模式切换后 `today` 的统计数据最终与实际一致，即使不立即调用 `fetchPracticeData()`。

#### Scenario: 模式切换后继续复习时数据刷新
- **WHEN** 用户切换模式后继续复习下一张卡片
- **THEN** 评分操作（`onPracticeClick` → `handlePracticeClick` → `practice()`）会触发数据持久化
- **AND** 下次 `fetchPracticeData()` 被调用时（如关闭重开 overlay、切换 tag），`today` 统计数据正确反映所有变更

#### Scenario: 模式切换不丢失数据
- **WHEN** 用户切换模式后不调用 `fetchPracticeData()`
- **THEN** `updateReviewConfig` 已将变更持久化到 Roam 数据页
- **AND** `sessionOverrides` 保持了乐观更新的数据
- **AND** 不会出现数据丢失

## MODIFIED Requirements

### Requirement: onSelectInteraction 回调行为

旧实现在切换 Interaction 后调用 `fetchPracticeData()` 触发全局刷新，现改为不调用 `fetchPracticeData()`，仅依赖乐观更新。数据最终一致性通过后续操作（评分、关闭重开 overlay）中的 `fetchPracticeData()` 调用保证。

### Requirement: onSelectAlgorithm 回调行为

旧实现在切换 Algorithm 后调用 `fetchPracticeData()` 触发全局刷新，现改为不调用 `fetchPracticeData()`，仅依赖乐观更新。

### Requirement: initialCardUids useEffect 重置策略

旧实现在 `initialCardUids` 引用变化时无条件重置 `cardQueue` 和 `currentIndex`，现改为仅在 UID 集合真正变化时重置。

## REMOVED Requirements

无移除的需求。
