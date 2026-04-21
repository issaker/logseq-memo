# 修复：LBL 模式下 Footer 按钮显示的预计间隔使用了父卡片数据而非子块数据

## 问题描述

当在 Normal 模式已有学习数据的卡片（如 Progressive 已学过 2 次）切换为 LBL 时，子 block 逐行阅读时的 Next 按钮显示预计下次学习时间不是 2 days，而是 12 days。合理怀疑它只读取了父级 block 的学习数据，而不是当前正在逐行阅读的子 block 的学习数据来计算显示的预期值。SM2 算法下也是相同的逻辑问题。

## 根因分析

### 数据流追踪

1. Footer 的 `intervalEstimates` 在 [Footer.tsx:179-209](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/Footer.tsx#L179-L209) 中计算：

```typescript
const intervalEstimates = React.useMemo(() => {
  const dataForEstimates = baseCardData || currentCardData;  // ← 父卡片数据
  const { sm2_interval, sm2_repetitions, sm2_eFactor,
          progressive_repetitions, progressive_interval } = dataForEstimates;
  // 用父卡片的 progressive_repetitions=2 来计算 → 12 days
  const practiceResultData = generatePracticeData({
    progressive_repetitions,  // ← 父卡片的值
    // ...
  });
}, [baseCardData, currentCardData, ...]);
```

2. `baseCardData` 来自 MainContext，在 [PracticeOverlay.tsx:190-197](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L190-L197) 中计算，始终是**父卡片**的会话数据。

3. 但 LBL 模式下，实际评分逻辑 `onLineByLineGrade` 使用的是**子块**的会话数据：

```typescript
// useLineByLineReview.ts:149-150
const childUid = childUidsList[lineByLineCurrentChildIndex];
const existingChildSession = childSessionData[childUid] || generateNewSession({ algorithm });
// 用子块的 progressive_repetitions=0 来计算 → 2 days ✓
```

### 问题本质

**Footer 显示的预计间隔基于父卡片数据，而实际评分计算基于子块数据，两者不一致。**

### 具体示例

**Progressive 算法**：
- 父卡片 `progressive_repetitions = 2` → `progressiveInterval(2) = 12` → 显示 "12 days" ✗
- 子块 `progressive_repetitions = 0`（新块）→ `progressiveInterval(0) = 2` → 应显示 "2 days" ✓

**SM2 算法**：
- 父卡片 `sm2_repetitions = 3, sm2_interval = 6` → Grade 5: `round(6 * 2.5 * 1) = 15` → 显示 "15 days" ✗
- 子块 `sm2_repetitions = 0`（新块）→ Grade 5: `1 day` → 应显示 "1 day" ✓

## 修复方案

### 核心思路

在 PracticeOverlay 中，当处于 LBL 模式时，计算一个 `effectiveBaseCardData`，使用当前正在复习的子块的会话数据（而非父卡片数据），然后通过 MainContext 传递给 Footer。

### 修改步骤

#### 步骤 1：在 PracticeOverlay 中计算 LBL 模式的 effectiveBaseCardData

文件：[PracticeOverlay.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx)

在 `baseCardData` 的 `useMemo` 之后，添加 `effectiveBaseCardData` 的计算逻辑：

```typescript
const effectiveBaseCardData = React.useMemo(() => {
  if (!isLineByLineActive) return baseCardData;
  const currentChildUid = childUidsList[lineByLineCurrentChildIndex];
  if (!currentChildUid) return baseCardData;
  return childSessionData[currentChildUid] || generateNewSession({ algorithm });
}, [isLineByLineActive, baseCardData, childUidsList, lineByLineCurrentChildIndex, childSessionData, algorithm]);
```

逻辑说明：
- 非 LBL 模式：直接使用 `baseCardData`（父卡片数据），行为不变
- LBL 模式：使用当前子块的 `childSessionData`，若无数据则用 `generateNewSession` 生成默认值
- `childSessionData` 是从数据页加载的原始数据（不含乐观更新），与 `baseCardData` 的设计意图一致

#### 步骤 2：将 MainContext 中的 baseCardData 替换为 effectiveBaseCardData

文件：[PracticeOverlay.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx)

在 `mainContextValue` 的 `useMemo` 中，将 `baseCardData` 替换为 `effectiveBaseCardData`：

```typescript
const mainContextValue = React.useMemo(() => ({
  // ...
  baseCardData: effectiveBaseCardData,  // 原来是 baseCardData
}), [..., effectiveBaseCardData]);
```

### 不需要修改的文件

- **Footer.tsx**：Footer 通过 `React.useContext(MainContext)` 获取 `baseCardData`，无需任何修改，因为它拿到的已经是正确的数据源
- **useLineByLineReview.ts**：评分逻辑已经正确使用子块数据，无需修改
- **LineByLineView.tsx**：渲染逻辑不涉及间隔预估，无需修改

### 修复后的数据流

```
PracticeOverlay:
  baseCardData (父卡片原始数据)
       │
       ▼
  effectiveBaseCardData:
    ├── 非 LBL → baseCardData (不变)
    └── LBL 模式 → childSessionData[currentChildUid] || generateNewSession()
       │
       ▼
  MainContext.baseCardData → Footer.intervalEstimates
    ├── Progressive: progressive_repetitions=0 → 2 days ✓
    └── SM2: sm2_repetitions=0 → 1 day ✓
```

### 边界情况

1. **子块无会话数据（新块）**：`childSessionData[currentChildUid]` 为 `undefined`，回退到 `generateNewSession({ algorithm })`，与 `onLineByLineGrade` 中的逻辑一致
2. **LBL 模式下翻到已掌握的子块**：`childSessionData` 包含该子块的数据，正确显示其间隔预估
3. **非 LBL 模式**：`effectiveBaseCardData === baseCardData`，行为完全不变
4. **子块评分后乐观更新**：`childSessionData` 不受乐观更新影响（从数据页加载），`sessionOverrides` 是独立的，与 `baseCardData` 的设计一致

## 影响范围

- 修改 1 个文件：PracticeOverlay.tsx
- 新增约 8 行代码（`effectiveBaseCardData` 的 useMemo）
- 修改 1 行代码（mainContextValue 中的替换）
- 不影响非 LBL 模式的任何行为
