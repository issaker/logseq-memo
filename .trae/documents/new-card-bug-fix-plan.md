# 新卡片 Bug 修复计划（修订版）

## 一、Bug 描述

1. **新卡片默认模式**：新卡片应默认为 Progressive 模式（直接阅读），而非 SM2 模式（记忆卡片）
2. **误报"覆盖今日数据"**：新卡片切换模式后点击 Next，提示"今日已学习，此次学习将覆盖今日数据"，但卡片明明没有学习过

## 二、Bug 根因分析

### Bug 1: `isReScoring` 检测缺少 `isNew` 判断

**位置**: [PracticeOverlay.tsx:341-343](src/components/overlay/PracticeOverlay.tsx#L341-L343)

```tsx
const isReScoring = currentCardData?.dateCreated
    && dateUtils.isSameDay(currentCardData.dateCreated, new Date())
    && currentCardData.sm2_grade !== 0;
```

**问题**: `generateNewSession()` 为新卡片设置了 `dateCreated: new Date()`，导致：
- `dateCreated` = 今天 → `true`
- `isSameDay` = `true`
- `sm2_grade` = `undefined`，`undefined !== 0` = `true`
- **结果**: `isReScoring = true`（误判！新卡片被当作"今日已学习"卡片）

### Bug 2: `onSelectInteraction` 回退算法仍为 SM2

**位置**: [PracticeOverlay.tsx:537](src/components/overlay/PracticeOverlay.tsx#L537)

```tsx
const currentAlgorithm = algorithm || SchedulingAlgorithm.SM2;
```

**问题**: `algorithm` 来自 `useCurrentCardData`，它已经回退到 `DEFAULT_REVIEW_CONFIG.algorithm`（PROGRESSIVE），所以 `algorithm` 永远不为 `undefined`。这个 `|| SchedulingAlgorithm.SM2` 回退是多余的，且如果被触发说明有 bug。应该改为直接使用 `algorithm`，如果为 `undefined` 则抛出错误。

同理，`onSelectAlgorithm` 中的 `interaction || InteractionStyle.NORMAL` 也应该改为直接使用 `interaction`。

### Bug 3: `generateNewSession()` 为新卡片设置 `dateCreated: new Date()`

**位置**: [utils.ts:278](src/queries/utils.ts#L278)

```tsx
dateCreated: dateCreated || new Date(),
```

**问题**: 新卡片的 `dateCreated` 被设为当前时间，但这不是真正的学习日期。新卡片的 `dateCreated` 应为 `undefined`，只在真正学习时（`savePracticeData`）才设置。

## 三、修复方案

### 修复 1: `isReScoring` 增加 `isNew` 排除条件

**文件**: `src/components/overlay/PracticeOverlay.tsx`

```tsx
const isReScoring = !currentCardData?.isNew
    && currentCardData?.dateCreated
    && dateUtils.isSameDay(currentCardData.dateCreated, new Date())
    && currentCardData.sm2_grade !== 0;
```

### 修复 2: 移除多余回退，改为断言

**文件**: `src/components/overlay/PracticeOverlay.tsx`

`onSelectInteraction`:
```tsx
if (!algorithm) throw new Error('algorithm is undefined in onSelectInteraction');
const currentAlgorithm = algorithm;
```

`onSelectAlgorithm`:
```tsx
if (!interaction) throw new Error('interaction is undefined in onSelectAlgorithm');
const currentInteraction = interaction;
```

这样如果未来出现 `algorithm` 或 `interaction` 为 `undefined` 的 bug，会立即暴露而非静默使用错误的默认值。

### 修复 3: `generateNewSession()` 不为新卡片设置 `dateCreated` 默认值

**文件**: `src/queries/utils.ts`

```tsx
const baseSession: Omit<NewSession, 'isNew'> = {
    dateCreated,  // 不再默认为 new Date()，新卡片为 undefined
    algorithm: effectiveAlgorithm,
    interaction: effectiveInteraction,
};
```

**依赖审查**（`dateCreated` 为 `undefined` 时的安全性）:

1. ✅ `today.ts:77-79` — `calculateCompletedTodayCounts` 已排除 `isNew` 卡片
2. ✅ `PracticeOverlay.tsx:341` — 修复后 `!isNew` 排除 + `dateCreated` 为 `undefined` 时短路
3. ✅ `practice.ts:71` — `const referenceDate = dateCreated || new Date()` 安全回退
4. ✅ `save.ts` — `savePracticeData` 接收 `dateCreated` 参数，`undefined` 时使用当前日期
5. ✅ `data.ts:278-299` — `parseLatestSession` 只在已有 session block 时设置 `baseSessionData`

## 四、实施步骤

### 步骤 1: 修复 `isReScoring` 检测

**文件**: `src/components/overlay/PracticeOverlay.tsx`

在 `isReScoring` 条件中增加 `!currentCardData?.isNew` 判断。

### 步骤 2: 移除多余回退，改为断言

**文件**: `src/components/overlay/PracticeOverlay.tsx`

- `onSelectInteraction`: 移除 `|| SchedulingAlgorithm.SM2`，改为断言
- `onSelectAlgorithm`: 移除 `|| InteractionStyle.NORMAL`，改为断言

### 步骤 3: 修复 `generateNewSession()` 的 `dateCreated` 默认值

**文件**: `src/queries/utils.ts`

将 `dateCreated: dateCreated || new Date()` 改为 `dateCreated`。

### 步骤 4: 运行类型检查和测试

```bash
npm run typecheck
npm run test
```
