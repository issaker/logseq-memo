# LBL 模式同日重学数据累加与定位重置 Bug 修复 Spec

## Why

LBL 模式下存在两个核心 bug，根源在于 LBL 子 block 缺乏与 Normal 卡片等价的「同日覆盖语义」：

1. **同日重学数据累加**：对已学过的二级 block，在同日重复学习时，`generatePracticeData` 以当日已累加的数据为基数计算，导致 `progressive_repetitions` 和 `progressive_interval` 被反复累加（如 4→6→8），而非基于「非今日的最近一次数据」重新计算并覆盖当日数据。Normal 卡片通过 `baseSessionData` 机制实现了此语义，但 LBL 子 block 的评分路径完全绕过了该机制。

2. **退出会话后定位重置**：退出并重新打开会话后，已学过的二级 block 可能再次出现为「到期」，导致定位回到已学过的 block 而非下一个未学的 block。此 bug 不稳定复现，与数据加载时序和 DB 写入一致性有关。

## 根因分析

### 根因一：LBL 子 block 评分路径缺少 baseSessionData 语义

**Normal 卡片的同日覆盖流程**：
```
parseLatestSession → baseSessionData（非今日快照）
     ↓
baseCardData = baseSessionData（同日重学时使用非今日快照）
     ↓
onPracticeClick → practiceProps = { ...baseData, ...gradeData }
     ↓
generatePracticeData(practiceProps) → 基于非今日状态计算
     ↓
savePracticeData → 同日去重：覆盖当日 session block
```

**LBL 子 block 的当前流程**（有 bug）：
```
getChildSessionData → childSessionData[childUid]（包含当日已累加数据）
     ↓
existingChildSession = childSessionData[childUid]  ← 直接使用当日数据！
     ↓
generatePracticeData({ ...existingChildSession, dateCreated: now }) → 基于当日已累加状态计算
     ↓
savePracticeData → 同日去重：覆盖当日 session block，但数据已错误累加
```

**关键差异**：Normal 卡片使用 `baseCardData`（基于 `baseSessionData`），LBL 子 block 使用 `existingChildSession`（当日最新状态）。当同日重学时，Normal 卡片从「非今日快照」重新计算，LBL 子 block 从「当日已累加状态」继续累加。

### 根因二：effectiveBaseCardData 未使用 baseSessionData

`PracticeOverlay.tsx` 中的 `effectiveBaseCardData` 用于 Footer 的间隔预估显示：

```typescript
const effectiveBaseCardData = React.useMemo(() => {
    if (!isLineByLineActive) return baseCardData;
    const childSession = childSessionData[currentChildUid];
    if (childSession) {
      return { ...childSession, algorithm: childSession.algorithm || algorithm };
    }
    return generateNewSession({ algorithm });
}, [...]);
```

对于 LBL 子 block，它直接使用 `childSessionData` 而不考虑 `baseSessionData`，导致同日重学时 Footer 显示的间隔预估也是基于累加后的数据，与实际评分结果一致地错误。

### 根因三：sessionOverrides 对子 block UID 是死代码

`onLineByLineGrade` 中设置了 `sessionOverrides[childUid]`，但 `sessions` 的计算只使用 `sessionOverrides[currentCardRefUid]`（父级 UID），子 block UID 的 override 从未被读取。`childSessionData` 是子 block 的实际数据源，独立从 DB 加载。

### 根因四：定位重置的时序问题

退出会话后重新打开时：
1. `getChildSessionData` 异步加载子 block 数据
2. 定位 useEffect 在 `childSessionData` 为空时 fallback 到 index 0
3. 如果 DB 写入尚未完全提交（Roam DB 的最终一致性），`getChildSessionData` 可能读到旧数据
4. 旧数据显示已学 block 仍为「到期」，导致定位回到已学 block

此外，`getChildSessionData` 每次都做全量数据页查询（`getPluginPageData`），而非利用已有的 `practiceData` 或 `sessionOverrides`，增加了数据不一致的窗口。

## 核心设计决策

### 决策一：LBL 子 block 评分路径引入 baseSessionData 语义

LBL 子 block 的评分路径 SHALL 与 Normal 卡片保持一致的同日覆盖语义：
- 同日首次学习：使用 `existingChildSession`（当日数据）作为基数
- 同日重学（非 Forgot）：使用 `baseSessionData`（非今日快照）作为基数
- Forgot 重学：使用当日数据（Forgot 不受同日覆盖保护）

实现方式：在 `onLineByLineGrade` 中，检测子 block 是否为同日重学场景，若是则使用 `childSession.baseSessionData` 作为计算基数。

### 决策二：effectiveBaseCardData 使用 baseSessionData

`effectiveBaseCardData` 在 LBL 模式下 SHALL 使用子 block 的 `baseSessionData`（若存在），确保 Footer 的间隔预估基于非今日状态。

### 决策三：移除 sessionOverrides 对子 block UID 的无效写入

`onLineByLineGrade` 中设置 `sessionOverrides[childUid]` 是死代码，SHALL 被移除。子 block 的状态更新仅通过 `setChildSessionData` 管理。

### 决策四：getChildSessionData 利用 practiceData 减少数据不一致窗口

`getChildSessionData` SHALL 优先使用已有的 `practiceData`（从 App 层传入），仅在 `practiceData` 中找不到对应 UID 时才做全量查询。这减少了异步查询的延迟和数据不一致窗口。

## What Changes

- **修复核心 bug**：在 `onLineByLineGrade` 中引入 `baseSessionData` 语义，同日重学时基于非今日快照计算
- **修复间隔预估**：`effectiveBaseCardData` 在 LBL 模式下使用子 block 的 `baseSessionData`
- **移除死代码**：删除 `onLineByLineGrade` 中 `sessionOverrides[childUid]` 的写入
- **优化数据加载**：`getChildSessionData` 优先使用 `practiceData` 减少异步查询
- **更新注释**：补充 LBL 子 block 同日覆盖语义的架构说明

## Impact

- Affected code:
  - `src/hooks/useLineByLineReview.ts` — onLineByLineGrade 引入 baseSessionData 语义、移除 sessionOverrides 子 block 写入
  - `src/components/overlay/PracticeOverlay.tsx` — effectiveBaseCardData 使用 baseSessionData、getChildSessionData 传入 practiceData
  - `src/queries/data.ts` — getChildSessionData 支持 existingPluginPageData 参数优化

---

## 数据流对比

### 修复前（有 bug）

```
同日重学 LBL 子 block:
  childSessionData[childUid] → { progressive_repetitions: 4, progressive_interval: 24, ... }
  existingChildSession = childSessionData[childUid]  ← 当日已累加
  generatePracticeData({ ...existingChildSession })  ← 基于 reps=4 计算
  → progressive_repetitions: 5, progressive_interval: 48  ← 累加！
  
  再次重学:
  → progressive_repetitions: 6, progressive_interval: 96  ← 继续累加！
```

### 修复后

```
同日重学 LBL 子 block:
  childSessionData[childUid] → { progressive_repetitions: 4, progressive_interval: 24, baseSessionData: { progressive_repetitions: 3, ... } }
  isSameDayReScoring = true
  baseChildSession = childSessionData[childUid].baseSessionData  ← 非今日快照
  generatePracticeData({ ...baseChildSession, algorithm, sm2_grade })  ← 基于 reps=3 计算
  → progressive_repetitions: 4, progressive_interval: 24  ← 正确！与首次学习结果一致
  
  再次重学:
  → progressive_repetitions: 4, progressive_interval: 24  ← 仍然正确！
```

---

## ADDED Requirements

### Requirement: LBL 子 block 同日重学使用 baseSessionData 计算

系统 SHALL 在 LBL 子 block 同日重学时（非 Forgot），使用 `baseSessionData`（非今日快照）作为 `generatePracticeData` 的计算基数，确保同日多次学习产生相同结果而非累加。

#### Scenario: Progressive 子 block 同日重学不累加
- **WHEN** 用户在今日已学习一个 Progressive 子 block（progressive_repetitions 从 3 变为 4）
- **AND** 用户在同日再次学习该子 block
- **THEN** `generatePracticeData` 使用 `baseSessionData`（progressive_repetitions = 3）作为基数
- **AND** 计算结果为 progressive_repetitions = 4, progressive_interval = 24（与首次学习一致）
- **AND** 不会出现 progressive_repetitions = 5, progressive_interval = 48 的累加结果

#### Scenario: SM2 子 block 同日重学不累加
- **WHEN** 用户在今日已学习一个 SM2 子 block（sm2_repetitions 从 2 变为 3）
- **AND** 用户在同日再次学习该子 block（grade = 5）
- **THEN** `generatePracticeData` 使用 `baseSessionData`（sm2_repetitions = 2）作为基数
- **AND** 计算结果与首次学习一致

#### Scenario: Forgot 重学不受同日覆盖保护
- **WHEN** 用户在今日已学习一个子 block
- **AND** 用户在同日对该子 block 评分 Forgot（grade = 0）
- **THEN** 使用当日数据作为基数（不使用 baseSessionData）
- **AND** Forgot 的重置逻辑正常生效

#### Scenario: 非同日学习正常使用当日数据
- **WHEN** 用户学习一个非今日学习过的子 block
- **THEN** 使用 `existingChildSession`（当日最新数据）作为基数
- **AND** 行为与修复前一致

### Requirement: effectiveBaseCardData 在 LBL 模式下使用 baseSessionData

系统 SHALL 在 LBL 模式下，当子 block 存在 `baseSessionData` 时，使用 `baseSessionData` 作为 `effectiveBaseCardData` 的基础，确保 Footer 的间隔预估基于非今日状态。

#### Scenario: 同日重学时 Footer 间隔预估正确
- **WHEN** 用户在今日已学习一个 Progressive 子 block
- **AND** 用户查看该子 block 的 Footer 间隔预估
- **THEN** 间隔预估基于 `baseSessionData`（非今日快照）计算
- **AND** 显示的间隔与首次学习时一致

### Requirement: getChildSessionData 优先使用已有 practiceData

系统 SHALL 在 `getChildSessionData` 调用时优先使用已有的 `practiceData`，减少全量数据页查询，降低数据不一致窗口。

#### Scenario: practiceData 中包含子 block 数据时直接使用
- **WHEN** `getChildSessionData` 被调用
- **AND** `practiceData` 中包含所有请求的子 block UID
- **THEN** 直接从 `practiceData` 提取数据，不做额外查询

#### Scenario: practiceData 中缺少子 block 数据时回退到全量查询
- **WHEN** `getChildSessionData` 被调用
- **AND** `practiceData` 中缺少部分子 block UID
- **THEN** 对缺失的 UID 做全量数据页查询

## MODIFIED Requirements

### Requirement: onLineByLineGrade 计算基数选择

旧实现：始终使用 `existingChildSession = childSessionData[childUid]` 作为 `generatePracticeData` 的输入。

新实现：
```
if (isSameDayReScoring && grade !== 0) {
  baseForCalculation = existingChildSession.baseSessionData || existingChildSession
} else {
  baseForCalculation = existingChildSession
}
generatePracticeData({ ...baseForCalculation, algorithm, sm2_grade, dateCreated: now })
```

### Requirement: effectiveBaseCardData LBL 分支

旧实现：`{ ...childSession, algorithm: childSession.algorithm || algorithm }`

新实现：
```
if (childSession.baseSessionData && isSameDay(childSession.dateCreated, now) && childSession.sm2_grade !== 0) {
  { ...childSession.baseSessionData, algorithm: childSession.algorithm || algorithm }
} else {
  { ...childSession, algorithm: childSession.algorithm || algorithm }
}
```

### Requirement: onLineByLineGrade sessionOverrides 写入

旧实现：同时写入 `sessionOverrides[childUid]` 和 `sessionOverrides[currentCardRefUid]`。

新实现：仅写入 `sessionOverrides[currentCardRefUid]`（父级），移除 `sessionOverrides[childUid]` 的写入。

## REMOVED Requirements

### Requirement: sessionOverrides 对子 block UID 的写入

**Reason**: `sessions` 的计算仅使用 `sessionOverrides[currentCardRefUid]`（父级 UID），子 block UID 的 override 从未被读取，是死代码。
**Migration**: 从 `onLineByLineGrade` 的两个分支（LblNext 和 SM2）中移除 `sessionOverrides[childUid]` 的写入。
