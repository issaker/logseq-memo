# 评分系统简化重构计划

## 一、第一性原理分析

### 1.1 系统本质需求

从第一性原理出发，评分系统的核心职责只有两个：

1. **计算调度**：给定当前状态 + 用户评分 → 计算下次复习日期
2. **持久化记录**：将计算结果写入存储，下次读取时还原状态

用户最终体验：
- 评分后看到正确的下次复习间隔
- Forgot 后重新复习，间隔从低开始
- 同日手滑重评，间隔合理（不膨胀也不丢失 Forgot 历史）

### 1.2 当前复杂度热点

经过全面代码审查，识别出以下 **5 个复杂度热点**：

#### 热点 1：baseSessionData 三层传递链（最复杂）

**当前链路**：
```
parseLatestSession (data.ts) → baseSessionData 附在 Session 上
    ↓
baseSessionDataMap (PracticeOverlay.tsx) → ref 缓存映射
    ↓
baseCardData (PracticeOverlay.tsx) → 三级分支逻辑
    ↓
effectiveBaseCardData (PracticeOverlay.tsx) → LBL 再判断一次
    ↓
Footer → generatePracticeData()
```

**问题**：
- `baseSessionData` 是数据层概念，`baseCardData` 是 UI 层概念，`effectiveBaseCardData` 是 LBL 层概念——三层包装同一件事
- `baseCardData` 有 3 个分支（baseSessionData / currentCardData / practiceData），`effectiveBaseCardData` 又有 2 个分支
- `baseSessionDataMap` 是一个手动维护的 ref 映射，与 `practiceData` 同步但独立

**根因**：同日重评时需要"回退到前日数据"来避免间隔膨胀，这个需求被分散在数据层和 UI 层多处处理。

#### 热点 2：同日判断逻辑散布 5 处

| 位置 | 变量名 | 条件差异 |
|------|--------|---------|
| PracticeOverlay.tsx:534 | `isReScoring` | `!isNew && isSameDay && grade!==0` |
| PracticeOverlay.tsx:389 | `isSameDayReScoring` | `isSameDay && grade!==0` |
| PracticeOverlay.tsx:506 | `isChildReScoring` | `isSameDay && grade!==0` |
| PracticeOverlay.tsx:200 | `isForgotReReview` | `grade===0` |
| useLineByLineReview.ts:151 | `isSameDayReScoring` | `isSameDay`（不排除 grade=0） |

**问题**：5 处判断逻辑语义相似但条件微妙不同，容易出错且难以维护。

#### 热点 3：LBL 评分路径与 Normal 评分路径大量重复

**Normal 路径**（PracticeOverlay.tsx:497-576）：
- 组装 practiceProps → generatePracticeData → savePracticeData → sessionOverrides → Forgot 重插

**LBL 路径**（useLineByLineReview.ts:141-379）：
- 组装 childPracticeProps → generatePracticeData → savePracticeData → updateParentNextDueDate → sessionOverrides → Forgot/LBL 重插

**重复部分**：
- baseForCalculation 选取逻辑
- generatePracticeData + savePracticeData 调用
- sessionOverrides 更新
- Forgot 重插逻辑
- 队列前进逻辑

**差异部分**：
- LBL 需要额外调用 updateParentNextDueDate
- LBL 需要更新 childSessionData
- LBL 有 LBL 重插逻辑
- LBL 的 sessionOverrides 包含父卡和子卡两个条目

#### 热点 4：sessionOverrides 乐观更新与 practiceData 轮询的竞态

**当前设计**：
- `practiceData` 来自 1s 轮询（Roam 数据页查询）
- `sessionOverrides` 是本地乐观更新
- `effectiveSession = sessionOverrides || practiceData`（覆盖优先）
- `currentCardData` 由 `useCurrentCardData` 从 `sessions` 派生

**问题**：
- `baseCardData` 中 `practiceData[currentCardRefUid]` 可能是旧数据（轮询延迟）
- `baseSessionDataMap` 从 `practiceData` 提取，也有轮询延迟
- 需要手动维护 `childSessionDataRef` 来避免闭包陷阱

#### 热点 5：savePracticeData 的同日去重 + Forgot 保留 + 字段回填

**当前逻辑**（save.ts:161-260）：
1. 查找今日 session block
2. 解析现有 sm2_grade
3. 判断 shouldPreserveForgot
4. 覆盖或新建
5. 字段回填（防止先删后写丢失数据）
6. 删除旧子块 + 创建新子块

**问题**：6 步操作中 3 步（字段回填、先删后写、Forgot 保留）是为了弥补"覆盖写入"策略的缺陷。如果改为"追加写入"策略，这些步骤可以大幅简化。

---

## 二、简化方案

### 2.1 核心洞察：统一 baseSessionData 语义

**第一性原理**：同日重评时，SM2 算法需要的是"上一次有效学习前的状态"作为计算基础。无论是 Forgot 后重评还是手滑后重评，核心需求都是同一个——**回退到最近一次"稳定状态"**。

**统一语义**：
- `baseSessionData` = 最近一次非同日 session（即昨日或更早的 session）
- 同日 Forgot session 等价于非同日 session 的效果（repetitions=0, interval=0）
- 同日非 Forgot session 的 `baseSessionData` 应指向同日 Forgot（如果存在）或非同日最近 session

**简化**：将 `baseCardData` / `effectiveBaseCardData` 的多层判断统一为一个函数 `resolveBaseForCalculation`。

### 2.2 提取 `resolveBaseForCalculation` 统一函数

**位置**：`src/models/session.ts`（与 Session 类型定义放在一起）

```typescript
export const resolveBaseForCalculation = (
  currentSession: Session,
  now: Date = new Date()
): Session => {
  const isSameDay = currentSession.dateCreated &&
    dateUtils.isSameDay(currentSession.dateCreated, now);
  const isForgot = currentSession.sm2_grade === 0;

  if (!isSameDay) return currentSession;
  if (isForgot) return currentSession;
  if (currentSession.baseSessionData) return currentSession.baseSessionData;
  return currentSession;
};
```

**规则**（3 条，替代当前 5 处判断）：
1. 非同日 → 直接用当前 session（正常复习）
2. 同日 Forgot → 直接用当前 session（Forgot 本身就是新基准）
3. 同日非 Forgot → 用 baseSessionData（回退到 Forgot 或前日）

**消除的代码**：
- `baseCardData` 的 3 分支逻辑
- `effectiveBaseCardData` 的 2 分支逻辑
- `useLineByLineReview` 中 `baseForCalculation` 的 4 条件判断
- `baseSessionDataMap` ref 映射

### 2.3 简化 `baseCardData` → 直接使用 `currentCardData`

**核心洞察**：`baseCardData` 的唯一消费者是 `onPracticeClick`，它将 `baseCardData` 展开为 `practiceProps` 后传给 `generatePracticeData`。如果 `resolveBaseForCalculation` 已经处理了回退逻辑，`baseCardData` 就不再需要——直接用 `currentCardData` 即可。

**改动**：
- 删除 `baseSessionDataMap` ref
- 删除 `baseCardData` useMemo
- 删除 `effectiveBaseCardData` useMemo
- `onPracticeClick` 中 `const baseData = currentCardData`
- Footer 的 `intervalEstimates` 中 `const dataForEstimates = currentCardData`
- `generatePracticeData` 内部调用 `resolveBaseForCalculation` 处理回退

**但注意**：`generatePracticeData` 是纯函数，不应依赖 `now`。因此回退逻辑需要在调用前处理。

**修正方案**：在 `onPracticeClick` 和 `useLineByLineReview.onLineByLineGrade` 中调用 `resolveBaseForCalculation`，将结果作为 `practiceProps` 的基础。

### 2.4 简化 LBL 评分路径

**当前问题**：`onLineByLineGrade` 有两条路径（LBL Next / SM2），每条路径都重复了 savePracticeData + updateParentNextDueDate + sessionOverrides + 重插逻辑。

**简化方案**：提取公共的 `gradeAndSave` 函数，两条路径只差异在 `baseForCalculation` 和 `sm2_grade` 的来源。

### 2.5 简化 savePracticeData 的同日处理

**当前**：先删后写 + 字段回填 + Forgot 保留判断

**简化方案**：保持当前逻辑不变（已经在上次改进中优化），但增加清晰注释说明每一步的意图。

---

## 三、实施步骤

### Step 1：提取 `resolveBaseForCalculation` 统一函数

**文件**：`src/models/session.ts`

- 新增 `resolveBaseForCalculation(currentSession, now)` 函数
- 3 条规则：非同日→当前session / 同日Forgot→当前session / 同日非Forgot→baseSessionData
- 添加详细注释说明设计意图

### Step 2：简化 PracticeOverlay 中的 baseCardData 链路

**文件**：`src/components/overlay/PracticeOverlay.tsx`

- 删除 `baseSessionDataMap` ref 及其 useEffect
- 将 `baseCardData` useMemo 简化为调用 `resolveBaseForCalculation(currentCardData)`
- 将 `effectiveBaseCardData` useMemo 简化为：
  - 非 LBL → `resolveBaseForCalculation(currentCardData)`
  - LBL → `resolveBaseForCalculation(childSession)`
- `onPracticeClick` 中 `const baseData = resolveBaseForCalculation(currentCardData)`

### Step 3：简化 useLineByLineReview 中的 baseForCalculation

**文件**：`src/hooks/useLineByLineReview.ts`

- LBL Next 路径：`resolveBaseForCalculation(existingChildSession)`
- SM2 路径：`resolveBaseForCalculation(existingChildSession)`
- 删除 `isExistingForgot` 判断和 4 条件 `baseForCalculation`

### Step 4：提取 LBL 评分公共逻辑

**文件**：`src/hooks/useLineByLineReview.ts`

- 提取 `gradeChildBlock` 内部函数，封装 savePracticeData + updateParentNextDueDate + sessionOverrides + childSessionData 更新
- LBL Next 和 SM2 两条路径调用同一个 `gradeChildBlock`

### Step 5：为修改的代码添加清晰注释

**文件**：所有修改的文件

- `resolveBaseForCalculation`：详细注释 3 条规则和设计意图
- `PracticeOverlay.tsx`：注释 baseCardData 简化后的数据流
- `useLineByLineReview.ts`：注释 LBL 评分简化后的流程
- `save.ts`：补充 Forgot 保留逻辑的注释

### Step 6：更新 README.md

**文件**：`README.md`

- 更新 "Why update same-day session blocks instead of creating new ones?" 部分，说明 Forgot 保留的新行为
- 更新 Data Model 部分，说明同日可能存在多个 session block（Forgot + 后续评分）
- 更新 Data Flow 部分，说明 `resolveBaseForCalculation` 统一了同日重评的回退逻辑
- 在 Key Design Decisions 中新增 "Why resolveBaseForCalculation?" 说明

---

## 四、风险评估

### 4.1 行为等价性验证

`resolveBaseForCalculation` 的 3 条规则必须与当前 5 处判断逻辑行为等价：

| 场景 | 当前行为 | 新行为 | 等价？ |
|------|---------|--------|--------|
| 非同日 Normal | `practiceData[uid]` | `currentSession` | ✅ |
| 同日 Forgot | `currentCardData` | `currentSession` | ✅ |
| 同日非 Forgot + baseSessionData | `baseSessionData` | `baseSessionData` | ✅ |
| 同日非 Forgot + 无 baseSessionData | `practiceData[uid]` | `currentSession` | ✅（无 baseSessionData 时 currentSession 就是 practiceData） |
| LBL 同日 Forgot | `existingChildSession` | `currentSession` | ✅ |
| LBL 同日非 Forgot + baseSessionData + 非 Forgot 原记录 | `baseSessionData` | `baseSessionData` | ✅ |
| LBL 同日非 Forgot + baseSessionData + Forgot 原记录 | `existingChildSession` | `currentSession`（= Forgot 结果） | ✅（Forgot 结果包含 repetitions=0，等价） |

### 4.2 不改变的部分

- SM2/Progressive/FixedTime 算法实现（practice.ts）
- 数据存储结构（session block 格式）
- savePracticeData 的 Forgot 保留逻辑
- parseLatestSession 的 baseSessionData 提取逻辑
- 队列策略（sortNormalDueCardUids / getLblQueueState）
- 用户界面和交互流程

### 4.3 需要注意的边界情况

1. **currentCardData vs practiceData 的差异**：当前 `baseCardData` 在非同日场景使用 `practiceData[uid]`，而 `currentCardData` 来自 `useCurrentCardData`（含 sessionOverrides）。简化后统一使用 `currentCardData`，实际上更准确（因为 sessionOverrides 优先级更高）。

2. **LBL effectiveBaseCardData 的 algorithm 覆盖**：当前 `effectiveBaseCardData` 会用 `getSessionAlgorithm(childSession, algorithm)` 覆盖 algorithm。简化后需要在 `resolveBaseForCalculation` 返回后保留这个覆盖。

3. **generateNewSession() 合并**：当前 `baseCardData` 在使用 `baseSessionData` 时会先展开 `generateNewSession()` 作为默认值。简化后 `resolveBaseForCalculation` 直接返回 `baseSessionData`，不再需要这个合并（因为 `baseSessionData` 本身已经是完整快照）。

---

## 五、预期收益

| 维度 | 改进 |
|------|------|
| 代码行数 | 减少约 60-80 行（删除 baseSessionDataMap、简化 baseCardData/effectiveBaseCardData、简化 baseForCalculation） |
| 判断逻辑 | 5 处同日判断 → 1 个统一函数 |
| 数据流层数 | 4 层（baseSessionData → baseSessionDataMap → baseCardData → effectiveBaseCardData）→ 2 层（baseSessionData → resolveBaseForCalculation） |
| LBL 代码重复 | 2 条路径共享 gradeChildBlock |
| 可维护性 | 同日重评逻辑集中在一处，修改只需改一个函数 |
| 用户体验 | 无变化（行为等价） |
