# 数据存储审查计划（修订版）

## 一、当前卡片复习后的所有数据字段清单

### 1.1 Session 核心数据字段（存储于 Roam 数据页 session block 中）

| # | 字段名 | 类型 | 归属（前缀） | 用途 | 功能效果 | 命名规范审查 |
|---|--------|------|-------------|------|----------|-------------|
| 1 | `algorithm` | `SchedulingAlgorithm` | 通用（无前缀） | 标识当前卡片使用的调度算法 | 决定间隔计算方式 | ✅ 通用配置字段，无需前缀 |
| 2 | `interaction` | `InteractionStyle` | 通用（无前缀） | 标识当前卡片的交互模式 | 决定复习交互方式：NORMAL/LBL | ✅ 通用配置字段，无需前缀 |
| 3 | `nextDueDate` | `Date?` | 通用（无前缀） | 下次到期日期 | 决定卡片何时出现在到期队列中 | ✅ 通用字段，无需前缀 |
| 4 | `dateCreated` | `Date?` | 通用（无前缀） | session 创建日期 | 同日去重判断、重打分检测 | ✅ 通用字段，无需前缀 |
| 5 | `sm2_grade` | `number?` | `sm2_` | SM2 评分 | 决定间隔计算方向和 emoji | ✅ 符合 `{owner}_{purpose}` |
| 6 | `sm2_interval` | `number?` | `sm2_` | SM2 间隔天数 | 下次复习日期 = dateCreated + sm2_interval | ✅ 符合规范 |
| 7 | `sm2_repetitions` | `number?` | `sm2_` | SM2 重复次数 | 算法阶段标识，到期卡片排序 | ✅ 符合规范 |
| 8 | `sm2_eFactor` | `number?` | `sm2_` | SM2 易度因子 | 影响间隔增长速度，到期卡片排序 | ✅ 符合规范 |
| 9 | `progressive_repetitions` | `number?` | `progressive_` | Progressive 重复次数 | 间隔曲线位置标识 | ✅ 符合规范 |
| 10 | `progressive_interval` | `number?` | `progressive_` | Progressive 间隔天数 | 下次复习日期 | ✅ 符合规范 |
| 11 | `fixed_multiplier` | `number?` | `fixed_` | Fixed 间隔乘数 | 用户可编辑的间隔配置 | ✅ 符合规范 |
| 12 | `baseSessionData` | `Session?` | 通用（运行时） | 同日更早 session 快照 | 同日多次复习时恢复前一次状态；不持久化 | ✅ 运行时字段 |

---

## 二、命名规范审查与修复

### 2.1 命名规范：`{owner}_{purpose}`

- **`sm2_`** 前缀：SM2 算法专属字段
- **`progressive_`** 前缀：Progressive 算法专属字段
- **`fixed_`** 前缀：Fixed 间隔算法专属字段
- **无前缀**：通用/配置字段

### 2.2 需修复的命名问题

#### 修复 1: 清除所有 `lbl_progress` 残留引用

**涉及文件**:
- `src/components/MigrateLegacyDataPanel.tsx` — 多处引用 `lbl_progress` 和 `lineByLineProgress`
- `src/components/overlay/SettingsDialog.tsx:62` — 引用 `lbl_progress`
- `README.md:154` — 引用 `lbl_progress`

**操作**: 从所有文件中移除 `lbl_progress` / `lineByLineProgress` 的引用，更新为当前架构描述（LBL 子 block 拥有独立 session）。

#### 修复 2: 清除 `readReinsertOffset` 旧名兼容映射

**涉及文件**:
- `src/queries/settings.ts:158-159` — 旧名兼容映射

**操作**: 删除 `readReinsertOffset` 的 case 分支，不再向后兼容旧名。

#### 修复 3: 统一 `intervalMultiplier` 术语为 `fixed_multiplier`

**涉及文件**:
- `src/components/overlay/PracticeOverlay.tsx` — UI 状态变量名 `intervalMultiplier` → `fixed_multiplier`
- `src/components/overlay/Footer.tsx` — UI 状态变量名 `intervalMultiplier` → `fixed_multiplier`

**操作**: 将所有 UI 层的 `intervalMultiplier` 重命名为 `fixed_multiplier`，与数据层命名统一。包括：
- `MainContextProps.intervalMultiplier` → `MainContextProps.fixed_multiplier`
- `setIntervalMultiplier` → `setFixed_multiplier`
- `useState<number>` 变量名
- Footer 中的解构和使用

#### 修复 4: 清除过时注释

**涉及文件**:
- `src/constants.ts:6` — 移除 `lineByLineProgress` 引用
- `src/queries/data.ts:139` — 移除 `lbl_*` 前缀注释行

---

## 三、功能冲突与 Bug 修复

### 3.1 🔴 修复: PROGRESSIVE 算法归入 Spaced 组

**文件**: `src/models/session.ts`

**修改**: 将 `ALGORITHM_META` 中 `PROGRESSIVE` 的 group 从 `'Fixed'` 改为 `'Spaced'`

```typescript
// 修改前
[SchedulingAlgorithm.PROGRESSIVE]: { group: 'Fixed', label: 'Progressive' },

// 修改后
[SchedulingAlgorithm.PROGRESSIVE]: { group: 'Spaced', label: 'Progressive' },
```

**连锁影响审查**:

修改后 `isFixedAlgorithm(PROGRESSIVE)` 将返回 `false`，`isSpacedAlgorithm(PROGRESSIVE)` 将返回 `true`。需审查所有依赖处：

1. **`generatePracticeData`** (practice.ts): `isSpacedAlgorithm(algorithm)` 判断——Progressive 将走 SM2 路径（错误！Progressive 有自己的计算逻辑）。**必须增加 Progressive 专属路径**。
2. **`getDefaultIntervalMultiplier`** (session.ts): Progressive 走 Spaced 分支返回 3，但应返回 2。**需修改**。
3. **Footer 快捷键**: `isFixedAlgorithm(algorithmFromSession)` 判断——Progressive 不再被视为 Fixed，F/H/G 键将启用（合理，Progressive 是间隔重复算法）。
4. **LBL 行为**: `isFixedAlgorithm(algorithm)` 判断——Progressive + LBL 将不再显示 Next 按钮。**需增加 Progressive + LBL 的 Next 按钮逻辑**。
5. **`generateNewSession`** (utils.ts): `isSpacedAlgorithm(effectiveAlgorithm)` 判断——Progressive 将走 SM2 分支（错误！）。**需修改**。
6. **到期排序**: Progressive 卡片将使用 `sm2_eFactor` 排序（同样无意义，但一级排序 nextDueDate 足够）。

**关键设计决策**: Progressive 归入 Spaced 后，需在 `generatePracticeData` 中增加独立的 Progressive 路径，不能让它走 SM2 路径。当前代码结构是 `if (isSpaced) { SM2路径 } else { Fixed/Progressive路径 }`，需改为三分支：

```typescript
if (algorithm === SchedulingAlgorithm.SM2) {
  // SM2 路径
} else if (algorithm === SchedulingAlgorithm.PROGRESSIVE) {
  // Progressive 路径
} else {
  // Fixed 路径
}
```

### 3.2 🟡 注释增强: today.ts 排序逻辑默认值合理性说明

**文件**: `src/queries/today.ts`

**操作**: 不修改排序逻辑，但增加注释说明当前默认值设计具备合理性：

```typescript
// 二级/三级排序使用 SM2 字段（sm2_eFactor, sm2_repetitions）。
// 对于 Fixed/Progressive 算法卡片，这些字段为默认值（eFactor=2.5, repetitions=0），
// 意味着它们在排序中获得中等优先级——高于高 eFactor 的 SM2 卡片，
// 但低于低 eFactor 的困难 SM2 卡片。这是合理的默认行为：
// Fixed 卡片按固定间隔复习，不需要特殊的难度优先级；
// 一级排序 nextDueDate 已足够区分大部分卡片的优先级。
```

### 3.3 🟡 修复: 清除 `readReinsertOffset` 旧名兼容映射

**文件**: `src/queries/settings.ts`

**操作**: 删除 `case 'readReinsertOffset'` 分支（第 158-159 行），不再兼容旧名。

### 3.4 🟡 修复: 清除 `constants.ts` 过时注释

**文件**: `src/constants.ts`

**操作**: 更新注释，移除 `lineByLineProgress` 引用。

### 3.5 🟡 修复: 清除 `data.ts` 过时注释

**文件**: `src/queries/data.ts`

**操作**: 移除 `SESSION_SNAPSHOT_KEYS` 注释中的 `lbl_*` 行。

### 3.6 🟡 修复: 统一 NewSession 类型，排除所有算法输出字段，默认 Progressive 模式

**文件**: `src/models/session.ts`, `src/queries/utils.ts`

**操作**:

1. 修改 `NewSession` 类型，排除所有算法输出字段：

```typescript
// 新卡片只有配置字段和算法输入字段，不应有算法输出字段
export interface NewSession extends Omit<Session, 'nextDueDate' | 'sm2_grade' | 'sm2_interval' | 'progressive_interval' | 'baseSessionData'> {
  isNew: boolean;
}
```

2. 修改 `generateNewSession()` 默认算法为 `PROGRESSIVE`：

```typescript
const effectiveAlgorithm = algorithm ?? SchedulingAlgorithm.PROGRESSIVE;
```

3. 修改 `DEFAULT_REVIEW_CONFIG` 默认算法为 `PROGRESSIVE`：

```typescript
export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  algorithm: SchedulingAlgorithm.PROGRESSIVE,
  interaction: InteractionStyle.NORMAL,
};
```

### 3.7 🟡 修复: IntervalEstimate 类型优化

**文件**: `src/components/overlay/Footer.tsx`

**操作**:

1. 从 `IntervalEstimate` 中排除 `baseSessionData`（间隔预览不需要此嵌套字段）：

```typescript
type IntervalEstimate = Omit<Session, 'baseSessionData'> & {
  nextDueDateFromNow?: string;
};
```

2. 添加注释说明全量继承设计意图：

```typescript
// IntervalEstimate 继承 Session 的所有算法字段（sm2_*, progressive_*, fixed_*）。
// 设计意图：全量继承确保用户在不同算法间切换时，每个算法的历史数据都能被
// 顺延继承而不会不连贯。例如从 SM2 切换到 Fixed 再切回 SM2 时，
// SM2 的 eFactor 和 repetitions 仍然保留，间隔计算能从正确位置继续。
// 排除 baseSessionData 因为间隔预览不需要此嵌套字段。
```

### 3.8 🟡 修复: SettingsFormSettings 与 Settings 接口统一

**文件**: `src/components/SettingsForm.tsx`

**操作**: 用 `Omit<Settings, 'historyCleanupKeepCount' | 'showBreadcrumbs'>` 替代手动定义的 `SettingsFormSettings`：

```typescript
import { Settings } from '~/hooks/useSettings';

export type SettingsFormSettings = Omit<Settings, 'historyCleanupKeepCount' | 'showBreadcrumbs'>;
```

---

## 四、跨功能冲突审查

### 4.1 模式独立原则验证

**原则**: 每个算法只操作自己的字段，其他算法字段原样传递，确保切换算法不丢失数据。

**验证结果**:

| 场景 | SM2 字段 | Progressive 字段 | Fixed 字段 | 结果 |
|------|----------|-----------------|------------|------|
| SM2 路径 | ✅ 计算更新 | ✅ 原样传递 | ✅ 原样传递 | 通过 |
| Progressive 路径 | ✅ 原样传递 | ✅ 计算更新 | ✅ 原样传递 | 通过 |
| Fixed 路径 | ✅ 原样传递 | ✅ 原样传递 | ✅ 计算更新 | 通过 |

### 4.2 "幽灵数据"设计意图说明

**问题**: Progressive 和 Fixed 路径中，非当前算法的字段（如 `progressive_repetitions`）被原样传递。

**结论**: 这是有意设计，属于模式独立原则的核心体现。当用户从 Progressive 切换到 Fixed 时，`progressive_repetitions` 被保留，确保用户切换回 Progressive 时间隔曲线能从正确位置继续，而不是从零开始。同理，SM2 字段在 Fixed/Progressive 路径中也原样传递。

**操作**: 在 `practice.ts` 的 `generatePracticeData` 函数注释中补充说明：

```typescript
// 模式独立原则（Mode Independence Principle）：
// 每个算法只操作自己的字段，其他算法的字段原样传递。
// 这确保了用户在不同算法间切换时，历史数据不会丢失。
// 例如：从 Progressive 切换到 Fixed 后再切回 Progressive，
// progressive_repetitions 仍然保留，间隔曲线能从正确位置继续。
```

### 4.3 其他验证（均通过）

- ✅ `sm2_grade` 跨算法传递：Fixed/Progressive 路径正确传递，确保 emoji 显示正确
- ✅ 同日 Session Block 去重：savePracticeData 正确实现
- ✅ LBL 父子 block 数据一致性：updateParentNextDueDate 正确实现
- ✅ 设置双写一致性：extensionAPI 为主存储，数据页为备份，5 秒防抖同步

---

## 五、实施步骤

### 步骤 1: 修复 PROGRESSIVE 算法分组（核心修改）

**文件**: `src/models/session.ts`
- 将 `ALGORITHM_META` 中 `PROGRESSIVE` 的 group 改为 `'Spaced'`

**文件**: `src/practice.ts`
- 将 `generatePracticeData` 从二分支改为三分支：SM2 / Progressive / Fixed
- Progressive 路径保持原有计算逻辑不变
- 添加模式独立原则注释

**文件**: `src/models/session.ts`
- 修改 `getDefaultIntervalMultiplier`：Progressive 返回 2

**文件**: `src/queries/utils.ts`
- 修改 `generateNewSession`：增加 Progressive 专属分支判断

**文件**: `src/components/overlay/Footer.tsx`
- 审查 LBL + Progressive 的按钮逻辑，确保 Next 按钮正确显示

**文件**: `src/components/overlay/PracticeOverlay.tsx`
- 审查 showAnswers 初始化逻辑，确保 Progressive + LBL 正确

### 步骤 2: 统一术语命名

**文件**: `src/components/overlay/PracticeOverlay.tsx`
- `intervalMultiplier` → `fixed_multiplier`
- `setIntervalMultiplier` → `setFixed_multiplier`

**文件**: `src/components/overlay/Footer.tsx`
- `intervalMultiplier` → `fixed_multiplier`

### 步骤 3: 清除所有过时引用

**文件**: `src/queries/settings.ts`
- 删除 `readReinsertOffset` 兼容映射

**文件**: `src/constants.ts`
- 移除 `lineByLineProgress` 引用

**文件**: `src/queries/data.ts`
- 移除 `lbl_*` 注释行

**文件**: `src/components/MigrateLegacyDataPanel.tsx`
- 清除 `lbl_progress` / `lineByLineProgress` 引用，更新为当前架构描述

**文件**: `src/components/overlay/SettingsDialog.tsx`
- 清除 `lbl_progress` 引用

**文件**: `README.md`
- 清除 `lbl_progress` 引用

### 步骤 4: 统一 NewSession 类型和默认算法

**文件**: `src/models/session.ts`
- 修改 `NewSession` 排除所有算法输出字段
- 修改 `DEFAULT_REVIEW_CONFIG` 默认算法为 PROGRESSIVE

**文件**: `src/queries/utils.ts`
- 修改 `generateNewSession` 默认算法为 PROGRESSIVE

### 步骤 5: 优化 IntervalEstimate 类型

**文件**: `src/components/overlay/Footer.tsx`
- 排除 `baseSessionData`，添加全量继承设计意图注释

### 步骤 6: 统一 SettingsFormSettings 接口

**文件**: `src/components/SettingsForm.tsx`
- 用 `Omit<Settings, 'historyCleanupKeepCount' | 'showBreadcrumbs'>` 替代手动定义

### 步骤 7: 增强排序逻辑注释

**文件**: `src/queries/today.ts`
- 添加默认值合理性说明注释

### 步骤 8: 运行类型检查和测试

```bash
npm run typecheck
npm run test
```
