# 合并 Data Migration 面板 + 增强字段重命名迁移

## 问题分析

### 1. LBL Progress Migration 面板冗余

当前 Settings 中有两个独立的迁移面板：
- **Data Migration**：处理旧版 reviewMode → algorithm + interaction 的迁移
- **LBL Progress Migration**：处理 lbl_progress JSON → 子 Block 独立 Session 的迁移

这两个面板应该合并为一个统一的 Data Migration 面板，按阶段顺序执行所有迁移逻辑。

### 2. 用户当前数据格式需要额外的字段重命名

用户当前的数据格式示例：
```
- [[April 13th, 2026]] 🟢
    - interaction:: NORMAL
    - algorithm:: SM2
    - interaction:: NORMAL          ← 重复字段
    - algorithm:: SM2               ← 重复字段
    - nextDueDate:: [[April 19th, 2026]]
    - progressiveRepetitions:: 2    ← 旧字段名，应为 progressive_repetitions
    - intervalMultiplierType:: Progressive  ← 应删除，已由 algorithm 替代
    - intervalMultiplier:: 6        ← 旧字段名，应为 fixed_multiplier
- [[April 10th, 2026]] 🟢
    - nextDueDate:: [[April 12th, 2026]]
    - progressiveRepetitions:: 1    ← 旧字段名
    - intervalMultiplierType:: Progressive  ← 应删除
    - intervalMultiplier:: 2        ← 旧字段名
```

现有 Phase 4 的 `FIELD_RENAME_MAP` 已经包含了这些映射：
```typescript
const FIELD_RENAME_MAP: Record<string, string> = {
  repetitions: 'sm2_repetitions',
  interval: 'sm2_interval',
  eFactor: 'sm2_eFactor',
  grade: 'sm2_grade',
  progressiveRepetitions: 'progressive_repetitions',
  progressiveInterval: 'progressive_interval',
  intervalMultiplier: 'fixed_multiplier',
  lineByLineProgress: 'lbl_progress',
};

const FIELDS_TO_DELETE = ['intervalMultiplierType', 'lineByLineReview'];
```

但 Phase 4 的 `lineByLineProgress: 'lbl_progress'` 映射需要更新——因为新架构中 `lbl_progress` 已被移除，应该改为将 `lineByLineProgress` 和 `lbl_progress` 都迁移到子 Block 独立 Session。

---

## 实施步骤

### Step 1：合并迁移面板

**修改 `SettingsDialog.tsx`**：
- 移除 `MigrateLblProgressPanel` 的导入和独立的 "LBL Progress Migration" 区域
- 只保留一个统一的 "Data Migration" 区域

**修改 `MigrateLegacyDataPanel.tsx`**：
- 移除 `MigrateLblProgressPanel` 组件（独立导出）
- 将 LBL Progress 迁移逻辑整合到现有 `MigrateLegacyDataPanel` 的迁移流程中，作为新的 Phase 6

### Step 2：更新 Phase 4 的字段重命名映射

**修改 `MigrateLegacyDataPanel.tsx` 中的 `FIELD_RENAME_MAP`**：
- 移除 `lineByLineProgress: 'lbl_progress'`（因为新架构不再使用 `lbl_progress`）
- 将 `lineByLineProgress` 加入 `FIELDS_TO_DELETE`（因为 LBL 进度数据将在 Phase 6 中迁移到子 Block Session）

更新后的映射：
```typescript
const FIELD_RENAME_MAP: Record<string, string> = {
  repetitions: 'sm2_repetitions',
  interval: 'sm2_interval',
  eFactor: 'sm2_eFactor',
  grade: 'sm2_grade',
  progressiveRepetitions: 'progressive_repetitions',
  progressiveInterval: 'progressive_interval',
  intervalMultiplier: 'fixed_multiplier',
};

const FIELDS_TO_DELETE = ['intervalMultiplierType', 'lineByLineReview', 'lineByLineProgress', 'lbl_progress'];
```

注意：`lineByLineProgress` 和 `lbl_progress` 不再重命名，而是直接删除（因为 Phase 6 会先将数据迁移到子 Block Session，然后删除这些字段）。

### Step 3：添加 Phase 6 — LBL Progress → 子 Block 独立 Session

在现有 Phase 5（Compact）之后，新增 Phase 6：

**Phase 6 逻辑**：
1. 扫描数据页中所有 `interaction:: LBL` 的卡片
2. 对每张 LBL 卡片：
   a. 检查是否有 `lbl_progress` 或 `lineByLineProgress` 字段
   b. 解析 JSON 数据
   c. 为每个子 Block UID 创建独立的 `((childUid))` 条目和 Session Block
   d. 将 `LineByLineChildData` 转换为完整 Session（包含 algorithm, interaction=NORMAL, nextDueDate, sm2_*, progressive_* 字段）
   e. 删除父 Block Session 中的 `lbl_progress` / `lineByLineProgress` 字段块
   f. 更新父 Block 的 `nextDueDate`（基于子 Block 的到期状态）
3. 显示迁移统计

### Step 4：更新 Phase 4 的执行顺序

Phase 4 的字段重命名和删除逻辑需要调整：
- 先执行字段重命名（`progressiveRepetitions` → `progressive_repetitions` 等）
- 再执行字段删除（`intervalMultiplierType`, `lineByLineReview`）
- **不删除** `lineByLineProgress` 和 `lbl_progress`（留给 Phase 6 处理，因为 Phase 6 需要先读取数据再删除）

更新 `FIELDS_TO_DELETE`：
```typescript
const FIELDS_TO_DELETE = ['intervalMultiplierType', 'lineByLineReview'];
```

Phase 6 中单独删除 `lineByLineProgress` 和 `lbl_progress`。

### Step 5：更新面板描述和确认对话框

更新 Data Migration 面板的描述文字，涵盖所有迁移阶段：
- Phase 1-3: reviewMode → algorithm + interaction
- Phase 4: 字段重命名 + 删除废弃字段
- Phase 5: 紧凑化最新 Session 快照
- Phase 6: lbl_progress → 子 Block 独立 Session

---

## 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/components/MigrateLegacyDataPanel.tsx` | 移除 `MigrateLblProgressPanel`；更新 `FIELD_RENAME_MAP` 和 `FIELDS_TO_DELETE`；在 Phase 5 后新增 Phase 6 LBL 迁移逻辑；更新面板描述 |
| `src/components/overlay/SettingsDialog.tsx` | 移除 `MigrateLblProgressPanel` 导入和独立区域 |
