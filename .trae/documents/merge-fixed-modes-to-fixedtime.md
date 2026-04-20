# 修改计划：合并 Fixed 模式为 FixedTime

## 概述

将四种 Fixed 模式（FIXED_DAYS、FIXED_WEEKS、FIXED_MONTHS、FIXED_YEARS）合并为一个 `FIXED_TIME` 模式，在该模式下允许用户输入自定义时间（数字 + 时间单位下拉选项）。同时调整边框颜色方案和算法下拉选单顺序。

最终三大算法：**SM2**（记忆卡）、**Progressive**（阅读卡）、**FixedTime**（自定义时间卡/手动推迟）。

---

## 一、数据模型变更（`src/models/session.ts`）

### 1.1 修改 `SchedulingAlgorithm` 枚举

```typescript
// 之前
export enum SchedulingAlgorithm {
  SM2 = 'SM2',
  PROGRESSIVE = 'PROGRESSIVE',
  FIXED_DAYS = 'FIXED_DAYS',
  FIXED_WEEKS = 'FIXED_WEEKS',
  FIXED_MONTHS = 'FIXED_MONTHS',
  FIXED_YEARS = 'FIXED_YEARS',
}

// 之后
export enum SchedulingAlgorithm {
  PROGRESSIVE = 'PROGRESSIVE',   // 第一位（新卡默认）
  SM2 = 'SM2',
  FIXED_TIME = 'FIXED_TIME',
}
```

### 1.2 新增 `FixedTimeUnit` 枚举

```typescript
export enum FixedTimeUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years',
}
```

### 1.3 修改 `Session` 类型

```typescript
export type Session = {
  algorithm: SchedulingAlgorithm;
  interaction: InteractionStyle;
  sm2_repetitions?: number;
  sm2_interval?: number;
  sm2_eFactor?: number;
  sm2_grade?: number;
  progressive_repetitions?: number;
  progressive_interval?: number;
  fixed_multiplier?: number;    // 保留，向后兼容旧数据读取
  fixed_unit?: FixedTimeUnit;   // 新增：FixedTime 时间单位
  baseSessionData?: Session;
} & SessionCommon;
```

> **关于 `fixed_multiplier` 的保留说明**：用户要求 fixedTime 不需要"独家数据字段"，但 `fixed_multiplier` 已存在于旧数据中，保留它用于向后兼容读取。新增的 `fixed_unit` 字段是用户输入持久化的最小需求（数字+单位），不属于"算法状态字段"——它只是记录用户的选择，类似 SM2 的 grade 记录用户打分。FixedTime 没有类似 `sm2_eFactor` 或 `progressive_repetitions` 这样的跨次复习算法状态字段。

### 1.4 修改 `ALGORITHM_META`

```typescript
export const ALGORITHM_META: Record<SchedulingAlgorithm, AlgorithmMeta> = {
  [SchedulingAlgorithm.PROGRESSIVE]: { group: 'Progressive', label: 'Progressive' },
  [SchedulingAlgorithm.SM2]: { group: 'SM2', label: 'SM2' },
  [SchedulingAlgorithm.FIXED_TIME]: { group: 'FixedTime', label: 'Fixed Time' },
};
```

### 1.5 修改 `AlgorithmGroup` 类型

```typescript
export type AlgorithmGroup = 'SM2' | 'Progressive' | 'FixedTime';
```

### 1.6 修改工具函数

- **`isFixedAlgorithm`** → 重命名为 `isFixedTimeAlgorithm`，检查 `FIXED_TIME`
- **`isSpacedAlgorithm`** → 删除（不再有 Spaced 组的概念）
- **`getDefaultIntervalMultiplier`** → 简化为按算法返回默认值
- **`resolveReviewConfig`** → 增加旧 FIXED_* 值到 FIXED_TIME 的映射

```typescript
export const isFixedTimeAlgorithm = (algorithm: SchedulingAlgorithm | undefined): boolean => {
  return algorithm === SchedulingAlgorithm.FIXED_TIME;
};

export const getDefaultIntervalMultiplier = (algorithm: SchedulingAlgorithm | undefined): number => {
  if (algorithm === SchedulingAlgorithm.PROGRESSIVE) return 2;
  if (algorithm === SchedulingAlgorithm.FIXED_TIME) return 3;
  return 3;
};

// 旧算法值映射到新值
const LEGACY_ALGORITHM_MAP: Record<string, SchedulingAlgorithm> = {
  FIXED_DAYS: SchedulingAlgorithm.FIXED_TIME,
  FIXED_WEEKS: SchedulingAlgorithm.FIXED_TIME,
  FIXED_MONTHS: SchedulingAlgorithm.FIXED_TIME,
  FIXED_YEARS: SchedulingAlgorithm.FIXED_TIME,
};

export const resolveReviewConfig = (rawAlgorithm?: string, rawInteraction?: string): ReviewConfig => {
  const mappedAlgorithm = LEGACY_ALGORITHM_MAP[rawAlgorithm ?? ''] || rawAlgorithm;
  const algorithm = Object.values(SchedulingAlgorithm).find(a => a === mappedAlgorithm) || DEFAULT_REVIEW_CONFIG.algorithm;
  const interaction = Object.values(InteractionStyle).find(i => i === rawInteraction) || DEFAULT_REVIEW_CONFIG.interaction;
  return { algorithm, interaction };
};
```

### 1.7 新增算法颜色/意图映射工具函数

```typescript
export const getAlgorithmIntent = (algorithm: SchedulingAlgorithm | undefined): 'success' | 'warning' | 'primary' | 'none' => {
  switch (algorithm) {
    case SchedulingAlgorithm.SM2: return 'success';       // 绿色
    case SchedulingAlgorithm.PROGRESSIVE: return 'warning'; // 橙色
    case SchedulingAlgorithm.FIXED_TIME: return 'primary';  // 蓝色
    default: return 'none';
  }
};
```

### 1.8 新增旧算法到时间单位的推导函数

```typescript
export const inferFixedUnitFromLegacyAlgorithm = (rawAlgorithm: string): FixedTimeUnit | undefined => {
  switch (rawAlgorithm) {
    case 'FIXED_DAYS': return FixedTimeUnit.DAYS;
    case 'FIXED_WEEKS': return FixedTimeUnit.WEEKS;
    case 'FIXED_MONTHS': return FixedTimeUnit.MONTHS;
    case 'FIXED_YEARS': return FixedTimeUnit.YEARS;
    default: return undefined;
  }
};
```

---

## 二、调度算法变更（`src/practice.ts`）

### 2.1 修改 `generatePracticeData` 的 Fixed 路径

将四路 switch 合并为单一 FIXED_TIME 路径：

```typescript
if (algorithm === SchedulingAlgorithm.FIXED_TIME) {
  const {
    fixed_multiplier,
    fixed_unit,
    progressive_repetitions,
    sm2_repetitions,
    sm2_eFactor,
    sm2_interval,
    sm2_grade,
  } = props;

  const value = fixed_multiplier || 3;
  const unit = fixed_unit || FixedTimeUnit.DAYS;
  const unitDays: Record<FixedTimeUnit, number> = {
    [FixedTimeUnit.DAYS]: 1,
    [FixedTimeUnit.WEEKS]: 7,
    [FixedTimeUnit.MONTHS]: 30,
    [FixedTimeUnit.YEARS]: 365,
  };
  const nextDueDate = dateUtils.addDays(referenceDate, value * unitDays[unit]);

  return {
    algorithm,
    interaction,
    fixed_multiplier: value,
    fixed_unit: unit,
    ...(progressive_repetitions !== undefined && { progressive_repetitions }),
    ...(sm2_repetitions !== undefined && { sm2_repetitions }),
    ...(sm2_eFactor !== undefined && { sm2_eFactor }),
    ...(sm2_interval !== undefined && { sm2_interval }),
    ...(sm2_grade !== undefined && { sm2_grade }),
    nextDueDate,
    nextDueDateFromNow: dateUtils.customFromNow(nextDueDate),
  };
}
```

### 2.2 更新注释

更新文件头部注释，将"Fixed 路径：计算 fixed_multiplier"改为"FixedTime 路径：计算 fixed_multiplier × fixed_unit"。

---

## 三、数据持久化变更

### 3.1 `src/queries/data.ts` — 更新 `SESSION_SNAPSHOT_KEYS`

```typescript
export const SESSION_SNAPSHOT_KEYS = [
  'algorithm',
  'interaction',
  'nextDueDate',
  'sm2_repetitions',
  'sm2_interval',
  'sm2_eFactor',
  'sm2_grade',
  'progressive_repetitions',
  'progressive_interval',
  'fixed_multiplier',
  'fixed_unit',          // 新增
] as const;
```

### 3.2 `src/queries/save.ts` — 更新 `NUMERIC_SESSION_KEYS`

```typescript
const NUMERIC_SESSION_KEYS = [
  'sm2_grade',
  'sm2_interval',
  'sm2_repetitions',
  'sm2_eFactor',
  'progressive_repetitions',
  'progressive_interval',
  'fixed_multiplier',
];
```

> `fixed_unit` 是字符串枚举值，不需要加入 NUMERIC_SESSION_KEYS。

### 3.3 `src/queries/utils.ts` — 更新 `generateNewSession`

```typescript
if (effectiveAlgorithm === SchedulingAlgorithm.FIXED_TIME) {
  return {
    ...baseSession,
    fixed_multiplier: 3,
    fixed_unit: FixedTimeUnit.DAYS,
    isNew,
  };
}
```

---

## 四、主题/颜色变更（`src/theme.ts`）

### 4.1 更新颜色定义

```typescript
// 之前
modeSpaced: 'var(--roam-success-color, #56d364)',   // 绿色 = Spaced 组
modeFixed: 'var(--roam-warning-color, #d29922)',     // 橙色 = Fixed 组

// 之后
modeSM2: 'var(--roam-success-color, #56d364)',        // 绿色 = SM2
modeProgressive: 'var(--roam-warning-color, #d29922)', // 橙色 = Progressive
modeFixedTime: 'var(--roam-primary-color, #8cb4ff)',   // 蓝色 = FixedTime
```

### 4.2 新增颜色获取函数

```typescript
export const getAlgorithmColor = (algorithm: SchedulingAlgorithm | undefined): string => {
  switch (algorithm) {
    case SchedulingAlgorithm.SM2: return colors.modeSM2;
    case SchedulingAlgorithm.PROGRESSIVE: return colors.modeProgressive;
    case SchedulingAlgorithm.FIXED_TIME: return colors.modeFixedTime;
    default: return colors.borderSubtle;
  }
};
```

---

## 五、UI 组件变更

### 5.1 `src/components/overlay/PracticeOverlay.tsx`

#### 5.1.1 更新 `MainContextProps`

```typescript
interface MainContextProps {
  fixed_multiplier: number;
  setFixed_multiplier: (multiplier: number) => void;
  fixed_unit: FixedTimeUnit;                    // 新增
  setFixed_unit: (unit: FixedTimeUnit) => void; // 新增
  // ...其他属性
}
```

#### 5.1.2 新增 `fixed_unit` 状态

```typescript
const [fixed_unit, setFixed_unit] = React.useState<FixedTimeUnit>(
  currentCardData?.fixed_unit || FixedTimeUnit.DAYS
);
```

#### 5.1.3 更新卡片切换时的状态重置逻辑

```typescript
if (algo === SchedulingAlgorithm.PROGRESSIVE) {
  setFixed_multiplier(latestSession.progressive_interval || getDefaultIntervalMultiplier(algo));
  setFixed_unit(FixedTimeUnit.DAYS);
} else if (algo === SchedulingAlgorithm.FIXED_TIME) {
  setFixed_multiplier(latestSession.fixed_multiplier || getDefaultIntervalMultiplier(algo));
  setFixed_unit(latestSession.fixed_unit || FixedTimeUnit.DAYS);
} else {
  setFixed_multiplier(getDefaultIntervalMultiplier(algo));
  setFixed_unit(FixedTimeUnit.DAYS);
}
```

#### 5.1.4 更新 `onPracticeClick` 中的 practiceProps

```typescript
const practiceProps = {
  ...baseData,
  ...gradeData,
  fixed_multiplier: fixed_multiplier,
  fixed_unit: fixed_unit,    // 新增
  algorithm,
  interaction,
};
```

#### 5.1.5 更新 Dialog 边框颜色

将基于 `ALGORITHM_META[$algorithm]?.group` 的颜色判断改为使用 `getAlgorithmColor`：

```typescript
const Dialog = styled(Blueprint.Dialog)<{...}>`
  border: 2px solid ${({ $algorithm }) => getAlgorithmColor($algorithm)};
  border-color: ${({ $showModeBorders, $algorithm }) =>
    $showModeBorders === false ? colors.borderSubtle : getAlgorithmColor($algorithm)};
`;
```

### 5.2 `src/components/overlay/Header.tsx`

#### 5.2.1 更新 `ModeBadge` 组件

```typescript
const ModeBadge = ({ algorithm, interaction }) => {
  const algoMeta = algorithm ? ALGORITHM_META[algorithm] : undefined;
  const interactionMeta = interaction ? INTERACTION_META[interaction] : undefined;
  const groupIntent = getAlgorithmIntent(algorithm);  // 使用新的按算法映射

  return (
    <>
      {algoMeta && (
        <Blueprint.Tag intent={groupIntent} minimal>
          {algoMeta.label}   {/* 显示 "SM2" / "Progressive" / "Fixed Time" 而非组名 */}
        </Blueprint.Tag>
      )}
      {/* LBL 标签不变 */}
    </>
  );
};
```

### 5.3 `src/components/overlay/Footer.tsx`

#### 5.3.1 更新 `FixedIntervalEditor` — 添加时间单位下拉选项

```typescript
const FixedIntervalEditor = () => {
  const { fixed_multiplier, setFixed_multiplier, fixed_unit, setFixed_unit } = React.useContext(MainContext);

  const handleInputValueChange = (numericValue) => {
    if (isNaN(numericValue)) return;
    setFixed_multiplier(numericValue);
  };

  const unitOptions = [
    { value: FixedTimeUnit.DAYS, label: 'Days' },
    { value: FixedTimeUnit.WEEKS, label: 'Weeks' },
    { value: FixedTimeUnit.MONTHS, label: 'Months' },
    { value: FixedTimeUnit.YEARS, label: 'Years' },
  ];

  return (
    <div className="flex p-2 items-center w-80 justify-evenly">
      <div className="">Every</div>
      <div className="w-24">
        <Blueprint.NumericInput
          min={1}
          max={365}
          stepSize={1}
          majorStepSize={30}
          minorStepSize={1}
          value={fixed_multiplier}
          onValueChange={handleInputValueChange}
          fill
        />
      </div>
      <Blueprint.HTMLSelect
        value={fixed_unit}
        onChange={(e) => setFixed_unit(e.currentTarget.value as FixedTimeUnit)}
        minimal
      >
        {unitOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Blueprint.HTMLSelect>
    </div>
  );
};
```

#### 5.3.2 更新 `IntervalString` 组件

```typescript
const IntervalString = ({ algorithm, fixed_multiplier, fixed_unit, nextDueDateFromNow }) => {
  if (algorithm === SchedulingAlgorithm.PROGRESSIVE) {
    const displayText = nextDueDateFromNow || 'Progressive';
    return (<>Review <span className="font-medium mr-3">{displayText}</span></>);
  }

  if (algorithm === SchedulingAlgorithm.FIXED_TIME) {
    const unit = fixed_unit || FixedTimeUnit.DAYS;
    const value = fixed_multiplier || 3;
    const unitLabel = { days: 'Days', weeks: 'Weeks', months: 'Months', years: 'Years' }[unit];

    if (value === 1) {
      const singularMap = { days: 'Daily', weeks: 'Weekly', months: 'Monthly', years: 'Yearly' };
      return (<>Review <span className="font-medium mr-3">{singularMap[unit]}</span></>);
    }
    return (<>Review <span className="font-medium mr-3">Every {value} {unitLabel}</span></>);
  }

  return null;
};
```

#### 5.3.3 更新 `ALGORITHM_OPTIONS` — 重排顺序

由于枚举定义顺序已改为 PROGRESSIVE、SM2、FIXED_TIME，`Object.values(SchedulingAlgorithm)` 会自动按此顺序生成选项。Progressive 在第一位。

#### 5.3.4 更新快捷键 `E` 的启用条件

```typescript
// 之前
disabled: !isFixedAlgorithm(algorithmFromSession),

// 之后
disabled: !isFixedTimeAlgorithm(algorithmFromSession),
```

#### 5.3.5 删除未使用的 `isFixedModeActive` 变量

### 5.4 `src/components/SettingsForm.tsx`

更新模式边框说明文字：

```typescript
// 之前
Show the green/orange dialog border that marks the current card's review mode.

// 之后
Show the colored dialog border that marks the current card's algorithm (green=SM2, orange=Progressive, blue=Fixed Time).
```

---

## 六、数据迁移变更（`src/components/MigrateLegacyDataPanel.tsx`）

### 6.1 更新 `LEGACY_MODE_TO_CONFIG` 映射

```typescript
const LEGACY_MODE_TO_CONFIG = {
  SPACED_INTERVAL: { algorithm: SchedulingAlgorithm.SM2, interaction: InteractionStyle.NORMAL },
  SPACED_INTERVAL_LBL: { algorithm: SchedulingAlgorithm.SM2, interaction: InteractionStyle.LBL },
  FIXED_PROGRESSIVE: { algorithm: SchedulingAlgorithm.PROGRESSIVE, interaction: InteractionStyle.NORMAL },
  FIXED_PROGRESSIVE_LBL: { algorithm: SchedulingAlgorithm.PROGRESSIVE, interaction: InteractionStyle.LBL },
  FIXED_DAYS: { algorithm: SchedulingAlgorithm.FIXED_TIME, interaction: InteractionStyle.NORMAL },
  FIXED_WEEKS: { algorithm: SchedulingAlgorithm.FIXED_TIME, interaction: InteractionStyle.NORMAL },
  FIXED_MONTHS: { algorithm: SchedulingAlgorithm.FIXED_TIME, interaction: InteractionStyle.NORMAL },
  FIXED_YEARS: { algorithm: SchedulingAlgorithm.FIXED_TIME, interaction: InteractionStyle.NORMAL },
};
```

### 6.2 新增迁移步骤：旧 FIXED_* 算法值 → FIXED_TIME

在数据迁移流程中增加一步，将 session block 中的 `algorithm:: FIXED_DAYS/WEEKS/MONTHS/YEARS` 转换为 `algorithm:: FIXED_TIME`，并写入对应的 `fixed_unit::` 字段。

---

## 七、测试文件更新

### 7.1 `src/models/session.test.ts`

- 更新 `isFixedAlgorithm` → `isFixedTimeAlgorithm` 测试
- 删除 `isSpacedAlgorithm` 测试
- 更新 `ALGORITHM_META` 测试中的有效 group 列表
- 更新 `resolveReviewConfig` 测试中的 FIXED_* 用例

### 7.2 `src/models/__tests__/session.test.ts`

- 将 `FIXED_DAYS/WEEKS/MONTHS/YEARS` 测试用例替换为 `FIXED_TIME` 测试用例

### 7.3 `src/practice.test.ts`

- 新增 FixedTime 模式的 `generatePracticeData` 测试
- 测试各时间单位（days/weeks/months/years）的 nextDueDate 计算
- 测试 Mode Independence：FixedTime 不污染 SM2/Progressive 字段
- 测试旧 FIXED_* 值通过 resolveReviewConfig 正确映射到 FIXED_TIME

---

## 八、README 和注释更新

### 8.1 `README.md`

- 更新 SchedulingAlgorithm 表格：三大算法（SM2、Progressive、FixedTime）
- 更新颜色说明：green=SM2, orange=Progressive, blue=FixedTime
- 更新架构描述：移除 Spaced/Fixed 分组概念
- 更新键盘快捷键表：`E` 键说明从 "Fixed algorithms only" 改为 "Fixed Time only"
- 更新数据模型示例

### 8.2 代码注释

- `session.ts` 头部注释：更新字段说明
- `practice.ts` 头部注释：更新三条路径说明
- `save.ts` 头部注释：更新字段列表
- `data.ts` SESSION_SNAPSHOT_KEYS 注释：更新字段说明

---

## 九、数据流审查与边界分析

### 9.1 旧数据兼容性

| 场景 | 处理方式 |
|------|---------|
| 旧数据 `algorithm:: FIXED_DAYS` | `resolveReviewConfig` 映射为 `FIXED_TIME`，`inferFixedUnitFromLegacyAlgorithm` 推导 `fixed_unit = days` |
| 旧数据 `algorithm:: FIXED_WEEKS` | 同上，推导 `fixed_unit = weeks` |
| 旧数据 `algorithm:: FIXED_MONTHS` | 同上，推导 `fixed_unit = months` |
| 旧数据 `algorithm:: FIXED_YEARS` | 同上，推导 `fixed_unit = years` |
| 旧数据有 `fixed_multiplier` 无 `fixed_unit` | `fixed_unit` 默认为 `days`（最安全的选择） |
| 新数据 `algorithm:: FIXED_TIME` | 正常读取 `fixed_multiplier` + `fixed_unit` |

### 9.2 算法切换数据隔离

| 切换方向 | 行为 |
|---------|------|
| SM2 → Progressive | SM2 字段原样保留，Progressive 字段正常计算 |
| SM2 → FixedTime | SM2 字段原样保留，FixedTime 使用用户输入计算 nextDueDate |
| Progressive → SM2 | Progressive 字段原样保留，SM2 字段正常计算 |
| Progressive → FixedTime | Progressive 字段原样保留，FixedTime 使用用户输入计算 nextDueDate |
| FixedTime → SM2 | FixedTime 字段（fixed_multiplier, fixed_unit）原样保留，SM2 字段正常计算 |
| FixedTime → Progressive | FixedTime 字段原样保留，Progressive 字段正常计算 |

### 9.3 关键边界检查点

1. **`generatePracticeData` 入口**：确保 FIXED_TIME 路径正确计算 nextDueDate，且不污染其他算法字段
2. **`savePracticeData` 写入**：确保 `fixed_unit` 字段正确写入 session block
3. **`mergeSessionSnapshot` 合并**：确保 `fixed_unit` 被正确合并到快照中
4. **`resolveReviewConfig` 兼容**：确保旧 FIXED_* 值正确映射
5. **UI 状态同步**：确保 `fixed_unit` 在卡片切换时正确重置

---

## 十、修改文件清单

| 文件 | 修改类型 |
|------|---------|
| `src/models/session.ts` | 重构：枚举、类型、工具函数 |
| `src/practice.ts` | 重构：调度算法 Fixed 路径 |
| `src/theme.ts` | 修改：颜色定义和获取函数 |
| `src/queries/data.ts` | 修改：SESSION_SNAPSHOT_KEYS |
| `src/queries/save.ts` | 微调：注释更新 |
| `src/queries/utils.ts` | 修改：generateNewSession |
| `src/components/overlay/PracticeOverlay.tsx` | 修改：状态、边框颜色、Context |
| `src/components/overlay/Header.tsx` | 修改：ModeBadge |
| `src/components/overlay/Footer.tsx` | 修改：IntervalEditor、IntervalString、选择器、快捷键 |
| `src/components/SettingsForm.tsx` | 修改：说明文字 |
| `src/components/MigrateLegacyDataPanel.tsx` | 修改：迁移映射 |
| `src/models/session.test.ts` | 更新：测试用例 |
| `src/models/__tests__/session.test.ts` | 更新：测试用例 |
| `src/practice.test.ts` | 更新：测试用例 |
| `README.md` | 更新：文档 |
