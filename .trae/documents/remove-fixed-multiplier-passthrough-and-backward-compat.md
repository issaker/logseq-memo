# 清理计划：移除 fixed_multiplier 在非 FixedTime 路径的透传 + 移除向后兼容代码

## 问题分析

### 问题一：`fixed_multiplier` 在 Progressive/SM2 路径中无意义

**现状**：`generatePracticeData` 的 SM2 和 Progressive 路径会将 `fixed_multiplier`/`fixed_unit` 原样透传（pass-through），遵循 Mode Independence Principle。但这导致了：
- Progressive 模式的 session block 中会写入 `fixed_multiplier:: 2`（来自 `progressive_interval` 的回退值）
- SM2 模式的 session block 中也会写入 `fixed_multiplier:: 3`（来自默认值）
- 这些字段对 SM2/Progressive 算法没有任何计算意义，纯粹是数据污染

**根因**：`fixed_multiplier` 被当作"跨算法共享 UI 状态"使用，在 PracticeOverlay 中无论什么算法都初始化它。但实际上：
- Progressive 的 `IntervalString` 显示用的是 `nextDueDateFromNow`，完全忽略 `fixed_multiplier`
- SM2 根本不显示间隔编辑器
- 只有 FixedTime 真正需要 `fixed_multiplier` 作为 NumericInput 的值和 nextDueDate 的计算参数

**结论**：`fixed_multiplier`/`fixed_unit` 应该只在 FixedTime 路径中产生和持久化，SM2/Progressive 路径不应输出这些字段。

### 问题二：向后兼容代码是技术债务

**现状**：代码中存在运行时向后兼容层：
- `LEGACY_ALGORITHM_MAP`：将 `FIXED_DAYS/WEEKS/MONTHS/YEARS` 映射为 `FIXED_TIME`
- `inferFixedUnitFromLegacyAlgorithm`：从旧算法名推导时间单位（死代码，无调用者）
- `resolveReviewConfig` 中的遗留映射逻辑

**原则**：插件不需要运行时向后兼容。数据迁移面板负责向前迁移旧数据，运行时代码只处理当前格式。这样：
- 运行时代码更简洁，减少 bug 面
- 旧数据通过一次性迁移解决，不永久背负兼容包袱
- `resolveReviewConfig` 遇到非法算法值直接回退默认，不做旧名映射

---

## 修改步骤

### 步骤 1：`src/practice.ts` — 移除 SM2/Progressive 路径的 `fixed_multiplier`/`fixed_unit` 透传

**SM2 路径**：从解构和输出中移除 `fixed_multiplier`/`fixed_unit`

```typescript
// 之前
const { sm2_grade, sm2_interval, sm2_repetitions, sm2_eFactor,
        progressive_repetitions, progressive_interval,
        fixed_multiplier, fixed_unit } = props;
return {
  ...
  ...(fixed_multiplier !== undefined && { fixed_multiplier }),
  ...(fixed_unit !== undefined && { fixed_unit }),
  ...
};

// 之后
const { sm2_grade, sm2_interval, sm2_repetitions, sm2_eFactor,
        progressive_repetitions, progressive_interval } = props;
return {
  ...
  ...(progressive_repetitions !== undefined && { progressive_repetitions }),
  ...(progressive_interval !== undefined && { progressive_interval }),
  ...
};
```

**Progressive 路径**：同理移除

```typescript
// 之前
const { progressive_repetitions, sm2_repetitions, sm2_eFactor, sm2_interval, sm2_grade,
        fixed_multiplier, fixed_unit } = props;
return {
  ...
  ...(fixed_multiplier !== undefined && { fixed_multiplier }),
  ...(fixed_unit !== undefined && { fixed_unit }),
  ...
};

// 之后
const { progressive_repetitions, sm2_repetitions, sm2_eFactor, sm2_interval, sm2_grade } = props;
return {
  ...
  // 不再输出 fixed_multiplier/fixed_unit
};
```

**FixedTime 路径**：保持不变（`fixed_multiplier`/`fixed_unit` 是其核心字段）

**practice 函数**：从解构中移除 `fixed_multiplier`/`fixed_unit`，改为从 props 直接透传给 `generatePracticeData`

### 步骤 2：`src/models/session.ts` — 移除向后兼容代码

1. **删除 `inferFixedUnitFromLegacyAlgorithm` 函数**（死代码，无调用者）
2. **删除 `LEGACY_ALGORITHM_MAP` 常量**
3. **简化 `resolveReviewConfig`**：移除旧名映射，遇到非法值直接回退默认

```typescript
// 之后
export const resolveReviewConfig = (
  rawAlgorithm?: string,
  rawInteraction?: string
): ReviewConfig => {
  const algorithm = Object.values(SchedulingAlgorithm).find(a => a === rawAlgorithm) || DEFAULT_REVIEW_CONFIG.algorithm;
  const interaction = Object.values(InteractionStyle).find(i => i === rawInteraction) || DEFAULT_REVIEW_CONFIG.interaction;
  return { algorithm, interaction };
};
```

4. **移除注释中的 `(backward compatible)` 标记**
5. **删除 `getDefaultIntervalMultiplier` 函数**：此函数为 Progressive 返回 2、为 FixedTime 返回 3，但现在 Progressive 不再需要初始化 `fixed_multiplier`，此函数只在 FixedTime 新卡默认值处使用，可以内联为常量

### 步骤 3：`src/components/overlay/PracticeOverlay.tsx` — 简化 `fixed_multiplier` 状态管理

1. **简化初始化**：`fixed_multiplier` 只在 FixedTime 算法下从 session 数据读取，其他算法使用默认值 3

```typescript
// 之后
const [fixed_multiplier, setFixed_multiplier] = React.useState<number>(
  isFixedTimeAlgorithm(algorithm)
    ? (currentCardData?.fixed_multiplier || 3)
    : 3
);
```

2. **简化卡片切换逻辑**：移除 Progressive 用 `progressive_interval` 设置 `fixed_multiplier` 的逻辑

```typescript
// 之后
if (isFixedTimeAlgorithm(algo)) {
  setFixed_multiplier(latestSession.fixed_multiplier || 3);
  setFixed_unit((latestSession as any).fixed_unit || FixedTimeUnit.DAYS);
} else {
  setFixed_multiplier(3);
  setFixed_unit(FixedTimeUnit.DAYS);
}
```

3. **简化 `onPracticeClick` 中的 practiceProps**：只在 FixedTime 时传入 `fixed_multiplier`/`fixed_unit`

```typescript
const practiceProps = {
  ...baseData,
  ...gradeData,
  ...(isFixedTimeAlgorithm(algorithm) && { fixed_multiplier, fixed_unit }),
  algorithm,
  interaction,
};
```

4. **从 `useCallback` 依赖数组中移除 `fixed_multiplier`/`fixed_unit`**（如果不再是必须依赖）

### 步骤 4：`src/components/overlay/Footer.tsx` — 清理 interval 估算中的 `fixed_multiplier`

1. **`intervalEstimates` 计算**：只在 FixedTime 时传入 `fixed_multiplier`/`fixed_unit`

```typescript
const practiceResultData = generatePracticeData({
  sm2_grade: grade,
  sm2_interval,
  sm2_repetitions,
  sm2_eFactor,
  dateCreated: new Date(),
  algorithm: algorithmFromSession,
  interaction: interactionFromSession || InteractionStyle.NORMAL,
  ...(isFixedTimeAlgorithm(algorithmFromSession) && { fixed_multiplier, fixed_unit }),
  progressive_repetitions,
  progressive_interval,
});
```

2. **移除 `FixedIntervalModeControls` 中 Progressive 对 `fixed_multiplier` 的依赖**：Progressive 模式下 `IntervalString` 已使用 `nextDueDateFromNow`，不需要 `fixed_multiplier`

### 步骤 5：`src/components/MigrateLegacyDataPanel.tsx` — 新增 FIXED_* → FIXED_TIME 迁移步骤

在现有迁移流程中新增一个 Phase，将 session block 中的 `algorithm:: FIXED_DAYS/WEEKS/MONTHS/YEARS` 转换为 `algorithm:: FIXED_TIME` 并写入对应的 `fixed_unit::` 字段。

具体逻辑：
1. 扫描所有 session block，找到 `algorithm:: FIXED_DAYS/WEEKS/MONTHS/YEARS` 的块
2. 将 `algorithm::` 值改为 `FIXED_TIME`
3. 添加 `fixed_unit:: days/weeks/months/years` 子块（根据原算法名推导）
4. 保留 `fixed_multiplier` 字段不变（它已经是数字值）

### 步骤 6：`src/models/__tests__/session.test.ts` — 移除遗留映射测试

删除整个 `describe('legacy algorithm mapping', ...)` 测试块（第39-67行），因为 `resolveReviewConfig` 不再做旧名映射。

### 步骤 7：`src/practice.test.ts` — 更新测试

- SM2/Progressive 路径的测试中，移除对 `fixed_multiplier`/`fixed_unit` 透传的断言
- FixedTime 路径的测试保持不变
- 移除 `getDefaultIntervalMultiplier` 相关测试（如果有的话）

### 步骤 8：`README.md` — 强调不向后兼容原则

1. 更新 "Why data migration instead of runtime backward compatibility?" 章节，明确强调：
   - 插件**不做运行时向后兼容**
   - 旧数据必须通过数据迁移面板一次性迁移
   - `resolveReviewConfig` 遇到非法算法值直接回退默认（PROGRESSIVE），不做旧名映射
   - 这是有意的设计决策，避免长期技术债务

2. 更新 Data Migration 章节，补充 `FIXED_DAYS/WEEKS/MONTHS/YEARS → FIXED_TIME` 迁移说明

### 步骤 9：注释清理

- `session.ts`：移除 `(backward compatible)` 注释
- `data.ts`：简化废弃字段注释
- `save.ts`：更新头部注释中的字段列表说明

---

## 修改文件清单

| 文件 | 修改类型 |
|------|---------|
| `src/practice.ts` | 移除 SM2/Progressive 路径的 fixed_multiplier/fixed_unit 透传 |
| `src/models/session.ts` | 删除 LEGACY_ALGORITHM_MAP、inferFixedUnitFromLegacyAlgorithm、getDefaultIntervalMultiplier；简化 resolveReviewConfig |
| `src/components/overlay/PracticeOverlay.tsx` | 简化 fixed_multiplier 状态管理，只在 FixedTime 时使用 |
| `src/components/overlay/Footer.tsx` | 清理 interval 估算中的 fixed_multiplier 依赖 |
| `src/components/MigrateLegacyDataPanel.tsx` | 新增 FIXED_* → FIXED_TIME 迁移步骤 |
| `src/models/__tests__/session.test.ts` | 移除遗留映射测试 |
| `src/practice.test.ts` | 更新 SM2/Progressive 测试断言 |
| `src/queries/data.ts` | 简化注释 |
| `README.md` | 强调不向后兼容原则 |
