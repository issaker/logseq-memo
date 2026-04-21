# 修复：渐进阅读模式到期后自动变为 SM2 的问题

## 问题描述

用户将卡片保存为"渐进阅读"（Progressive）模式复习，但到期时算法字段自动变成了 SM2。

用户提供的学习数据：
```
[[April 20th, 2026]] 🟢
interaction:: NORMAL
algorithm:: SM2
nextDueDate:: [[April 22nd, 2026]]
progressive_repetitions:: 1
progressive_interval:: 2
```

## 根因分析

### 关键线索

1. **`algorithm:: SM2`** 但同时存在 **`progressive_repetitions:: 1`** 和 **`progressive_interval:: 2`** — 这两个字段只在 PROGRESSIVE 路径中才会被更新（[practice.ts:105-129](src/practice.ts#L105-L129)），说明卡片确实在 PROGRESSIVE 模式下被复习过。

2. **🟢 绿色表情** — 在 [save.ts:54-73](src/queries/save.ts#L54-L73) 的 `getEmojiFromGrade` 中，🟢 对应 `sm2_grade === 5` 或非评分算法（PROGRESSIVE/FixedTime）。如果算法是 SM2 且没有 grade，不会显示 🟢。这暗示数据保存时算法很可能是 PROGRESSIVE。

3. **`nextDueDate` 为 2 天后** — `progressiveInterval(0) = 2`（[practice.ts:43-47](src/practice.ts#L43-L47)），与 PROGRESSIVE 模式的间隔计算一致，而非 SM2 模式。

### 结论：算法在 PROGRESSIVE 复习后被覆盖为 SM2

运行时代码中 **不存在** 自动将 PROGRESSIVE 切换为 SM2 的逻辑。算法变更只有两个入口：
- 用户通过 AlgorithmSelector 手动切换（[PracticeOverlay.tsx:521-559](src/components/overlay/PracticeOverlay.tsx#L521-L559)）
- 数据迁移

**最可能的根因是数据迁移代码中的不一致性：**

### Bug 1：Phase 6 LBL 子块迁移默认算法为 SM2（[MigrateLegacyDataPanel.tsx:1175](src/components/MigrateLegacyDataPanel.tsx#L1175)）

```typescript
const algorithm = sessionData.algorithm || 'SM2';  // ← 应为 'PROGRESSIVE'
```

当 `sessionData.algorithm` 缺失时，回退到 `'SM2'`，但运行时默认值是 `PROGRESSIVE`（[session.ts:103-106](src/models/session.ts#L103-L106)）。这导致 LBL 子块在迁移时被错误地设为 SM2。

### Bug 2：Phase 1 迁移不检查已有 algorithm 字段（[MigrateLegacyDataPanel.tsx:552-559](src/components/MigrateLegacyDataPanel.tsx#L552-L559)）

```typescript
if (task.needsReviewModeWrite || task.needsCardTypeRename) {
  const config = LEGACY_MODE_TO_CONFIG[task.resolvedMode];
  await updateReviewConfig({
    refUid: task.cardUid,
    dataPageTitle,
    algorithm: config?.algorithm,   // ← 直接覆盖，不检查已有值
    interaction: config?.interaction,
  });
}
```

如果用户在迁移后已手动将算法改为 PROGRESSIVE 并复习，再次运行迁移会用 `LEGACY_MODE_TO_CONFIG` 的映射值覆盖。

## 修复方案

### 步骤 1：修复 Phase 6 迁移默认算法

**文件**: [MigrateLegacyDataPanel.tsx:1175](src/components/MigrateLegacyDataPanel.tsx#L1175)

将 `sessionData.algorithm || 'SM2'` 改为 `sessionData.algorithm || SchedulingAlgorithm.PROGRESSIVE`，与运行时默认值保持一致。

### 步骤 2：为 Phase 1 迁移添加已有 algorithm 检查

**文件**: [MigrateLegacyDataPanel.tsx:552-559](src/components/MigrateLegacyDataPanel.tsx#L552-L559)

在调用 `updateReviewConfig` 前，检查最新 session block 中是否已存在 `algorithm` 字段。如果已存在且值有效，跳过覆盖，保留用户手动设置的值。

具体实现：在 Phase 1 的 task 预处理阶段，读取每个卡片最新 session block 中的 algorithm 字段。如果已存在有效的 algorithm 值（PROGRESSIVE / SM2 / FIXED_TIME 之一），则在 task 中标记 `needsAlgorithmOverwrite = false`，后续调用 `updateReviewConfig` 时跳过 algorithm 参数。

## 影响范围

- 迁移代码：仅影响未迁移或重新迁移的数据
- 不影响已有正确数据的卡片
- 不影响运行时复习流程
