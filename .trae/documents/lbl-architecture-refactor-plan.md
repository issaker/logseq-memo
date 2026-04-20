# LBL 数据存储架构重构方案：从父级 `lbl_progress` 迁移到子 Block 独立 Session

## 一、现状分析

### 当前架构

```
roam/memo 数据页
├── data
│   ├── ((parentUid))                          ← 父 Block 引用
│   │   ├── [[Date]] 🟢                        ← 最新 Session Block
│   │   │   ├── algorithm:: SM2
│   │   │   ├── interaction:: LBL
│   │   │   ├── nextDueDate:: [[Date]]
│   │   │   ├── lbl_progress:: {"childUid1":{...},"childUid2":{...}}  ← 所有子 Block 进度打包为 JSON
│   │   │   ├── sm2_eFactor:: 2.5
│   │   │   └── ...
```

**核心特征**：
- 所有子 Block 的复习数据以 JSON 字符串存储在父 Block Session 的 `lbl_progress` 字段中
- Key 是子 Block UID，Value 是 `LineByLineChildData`
- 父 Block 的 `nextDueDate` 决定卡片是否出现在到期队列中
- 算法独立原则：每个算法只操作自己的字段，其他字段原样传递

### 当前 LBL 复习流程

1. 从到期队列取出父卡片
2. 解析 `lbl_progress` JSON
3. 按顺序遍历 `childUidsList`，找到第一个到期/未读的子 Block
4. 从该行开始逐行复习
5. **缺陷**：复习完一行后，移动到序列中的下一行（即使未到期），而非跳到下一个到期的子 Block

---

## 二、当前架构的问题

### 问题 1：数据不可移植（核心痛点）

当用户在 Roam 中重新组织 Block 结构时，子 Block 的复习数据会丢失：

```
场景：用户将子 Block A 从父 Block P1 移动到父 Block P2

Before:
  P1 的 lbl_progress: {"A": {nextDueDate: "2026-05-01", ...}, "B": {...}}

After:
  P1 的 lbl_progress: {"A": {nextDueDate: "2026-05-01", ...}, "B": {...}}  ← A 的数据仍留在 P1
  P2 的 lbl_progress: {}  ← A 在 P2 下被视为全新内容，之前的复习进度全部丢失
```

### 问题 2：无法自动跳过未到期行

当前 `useLineByLineReview.ts` 的扫描逻辑：
- 只在初始化时找到第一个到期行
- 复习完一行后，`lineByLineCurrentChildIndex + 1` 直接进入序列中的下一行
- 即使下一行未到期，用户仍需交互

### 问题 3：`lbl_progress` JSON 的脆弱性

- JSON 字符串存储在 Roam Block 中，用户可能意外编辑或删除
- JSON 解析失败时静默返回空对象，数据丢失无感知
- 随着子 Block 数量增加，JSON 字符串会变得很长

---

## 三、新架构设计

### 核心思路

**子 Block 拥有完整独立的 Session Data，父级 LBL Block 仅仅是逐行模式的辅助功能板块。**

```
roam/memo 数据页
├── data
│   ├── ((parentUid))                          ← 父 Block：仅存储卡片级配置
│   │   ├── [[Date]] 🟢
│   │   │   ├── algorithm:: SM2
│   │   │   ├── interaction:: LBL
│   │   │   └── nextDueDate:: [[Date]]         ← 由子 Block 到期日计算得出
│   │
│   ├── ((childUid1))                          ← 子 Block 1：完整独立 Session
│   │   ├── [[Date]] 🟢
│   │   │   ├── algorithm:: SM2                ← 子 Block 可拥有自己的算法配置
│   │   │   ├── interaction:: NORMAL           ← 子 Block 作为独立卡片时的交互模式
│   │   │   ├── nextDueDate:: [[Date]]
│   │   │   ├── sm2_interval:: 6
│   │   │   ├── sm2_repetitions:: 3
│   │   │   ├── sm2_eFactor:: 2.5
│   │   │   └── progressive_repetitions:: 1
│   │
│   ├── ((childUid2))                          ← 子 Block 2：完整独立 Session
│   │   ├── [[Date]] 🟢
│   │   │   ├── algorithm:: PROGRESSIVE
│   │   │   ├── interaction:: NORMAL
│   │   │   ├── nextDueDate:: [[Date]]
│   │   │   ├── sm2_interval:: 1
│   │   │   ├── sm2_repetitions:: 0
│   │   │   ├── sm2_eFactor:: 2.5
│   │   │   └── progressive_repetitions:: 0
```

### 设计原则

1. **子 Block 拥有完整独立的 Session Data**：
   - 每个子 Block 的 Session 与普通卡片完全相同（包含 algorithm, interaction, nextDueDate, sm2_*, progressive_*, fixed_*）
   - 用户随时可以将子 Block 加入任意牌组变成独立卡片，不影响其学习数据进度
   - 子 Block 在 LBL 模式下被复习时，更新的是子 Block 自己的 Session

2. **父级 LBL Block 仅仅是辅助功能板块**：
   - 父 Block 仅存储 `algorithm`、`interaction`、`nextDueDate`
   - `algorithm` 和 `interaction` 决定 LBL 模式下子 Block 的复习行为
   - `nextDueDate` 由子 Block 的到期状态计算得出
   - 父 Block 不再存储任何子 Block 的复习数据

3. **数据跟随内容**：子 Block 被移动到其他父 Block 时，复习数据自动跟随

4. **自动跳过未到期行**：复习时扫描子 Block 的到期状态，自动跳到下一个到期行

### 父 Block `nextDueDate` 的计算

```
if (任何子 Block 未读或到期) {
  parent.nextDueDate = today  // 保持卡片在到期队列中
} else {
  parent.nextDueDate = min(所有子 Block 的 nextDueDate)  // 最早的子 Block 到期日
}
```

**优化策略**：每次子 Block 评分后，同步更新父 Block 的 `nextDueDate`，避免加载时批量查询。

---

## 四、方案对比

| 维度 | 现方案（lbl_progress JSON） | 新方案（子 Block 独立 Session） |
|------|---------------------------|-------------------------------|
| **数据可移植性** | ❌ 移动子 Block 丢失进度 | ✅ 数据跟随子 Block |
| **子 Block 可独立成卡** | ❌ 不支持 | ✅ 天然支持 |
| **自动跳过未到期行** | ❌ 需额外实现 | ✅ 自然支持 |
| **数据页可读性** | ❌ JSON 字符串不可读 | ✅ 每个字段独立可读 |
| **读取性能** | ✅ 一次解析 JSON | ⚠️ 需查询多个子 Block Session |
| **写入性能** | ✅ 一次写入 JSON | ⚠️ 需分别写入子 Block + 更新父 Block |
| **数据页体积** | ✅ 紧凑 | ⚠️ 更多条目 |

---

## 五、自动跳过逻辑详细设计

### 行为定义

**"跳过"不是不显示，而是直接显示一直到到期子 Block 才需要用户点击 Show Answer。**

```
子 Block 状态: [到期, 已掌握, 到期, 已掌握, 到期]
索引:           [0,    1,       2,    3,       4]

当前行为:
  复习第0行(需ShowAnswer) → 显示第1行(已掌握,需ShowAnswer) → 复习第2行 → ...

新行为:
  复习第0行(需ShowAnswer) → 第1行自动显示(已掌握,无需交互) → 复习第2行(需ShowAnswer) → 第3行自动显示 → 复习第4行 → 完成
```

具体规则：
- **到期/未读子 Block**：需要用户交互（SM2 模式需 Show Answer + 打分；LblNext 模式需点击 Read/Next）
- **已掌握子 Block**：自动显示，降低透明度 + 绿色边框，无需用户交互，自动前进到下一个子 Block
- 用户能看到所有子 Block 的内容（已掌握的提供上下文），但只需对到期的行进行复习操作

### UI 展示

- **到期行**：正常显示，左侧蓝色边框，需要用户交互
- **已掌握行**：显示但降低透明度 + 绿色边框（提供上下文），自动跳过无需交互
- **进度指示器**：`L2/10 (3 due)` — 当前第2行/共10行/3行到期

### 实现方式

```typescript
const getDueChildIndices = (
  childUidsList: string[],
  childSessionData: Record<string, Session>
): number[] => {
  const now = new Date();
  return childUidsList.reduce((indices, uid, index) => {
    const session = childSessionData[uid];
    if (!session || !session.nextDueDate || session.nextDueDate <= now) {
      indices.push(index);
    }
    return indices;
  }, [] as number[]);
};
```

复习完一个到期子 Block 后，自动前进：如果下一个子 Block 已掌握，自动显示并继续前进，直到遇到下一个到期子 Block 或卡片完成。

---

## 六、LBL 初始化阶段的 Session 同步

当用户刷到一张 LBL 复习卡片时，初始化阶段需要执行以下步骤：

### 步骤 1：获取当前子 Block UID 列表

从 Roam API 获取父 Block 的 `childrenUids`（按 order 排序）。

### 步骤 2：为新子 Block 创建 Session

对于当前子 Block 列表中的每个 UID：
- 检查数据页中是否已有该 UID 的 Session 条目
- 如果没有 → 创建新的 Session（`generateNewSession()`）
- 如果已有 → 使用现有 Session 数据

### 步骤 3：计算父 Block 的 nextDueDate

基于所有子 Block 的 Session 数据，计算父 Block 的 `nextDueDate`：
- 如果有任何子 Block 未读或到期 → `nextDueDate = today`
- 否则 → `nextDueDate = min(所有子 Block 的 nextDueDate)`
- 如果计算结果与父 Block 当前 `nextDueDate` 不同，更新父 Block

### 步骤 4：开始复习

基于同步后的数据，找到第一个到期子 Block，开始 LBL 复习流程。

> **注意**：不在此阶段自动清理无引用的 Session 条目。自动清理在复杂情况下可能出现 bug，未来会开发手动清理工具供用户使用。

---

## 七、插队机制协调

### 插队的核心语义

**Forgot 和 LBL 的插队都是让卡片直接翻页，在 N 张以后再继续顺延刚才的逐行学习。**

关键点：
- 插队 = 当前卡片翻到下一张 + N 张后重新出现继续逐行学习
- **不是**逐行学习完全部再翻页
- **不是**再遇到插队的逐行学习卡片时重新看一遍（从头开始）

### 插队后继续学习的保证机制

当插队的卡片重新出现时，必须从**上次停止位置的下一个到期子 Block** 继续，而不是从头开始。

**保证方式**：由于子 Block 拥有独立 Session，每次卡片出现时初始化逻辑会扫描所有子 Block 的到期状态，找到第一个到期子 Block。已复习的子 Block 的 `nextDueDate` 已被更新为未来日期，因此不会被重新选中。

```
场景：LBL + Fixed，5 个子 Block，lblNextReinsertOffset = 3

1. 卡片出现 → 扫描子 Block → 第0行到期 → 显示第0行
2. 用户点击 Read → 第0行 nextDueDate 更新为 2 天后 → 插队卡片到 3 张后
3. 翻到下一张卡片（非当前 LBL 卡片）
4. ... 3 张卡片后 ...
5. LBL 卡片重新出现 → 扫描子 Block → 第1行到期（第0行已不在到期队列）
6. 显示第1行 → 用户点击 Read → 第1行 nextDueDate 更新 → 插队 → 继续
```

```
场景：LBL + SM2，5 个子 Block，forgotReinsertOffset = 3

1. 卡片出现 → 扫描子 Block → 第2行到期 → 显示第2行
2. 用户点击 Forgot → 第2行 SM2 重置（interval=0, nextDueDate=today）
3. 插队卡片到 3 张后 → 翻到下一张卡片
4. ... 3 张卡片后 ...
5. LBL 卡片重新出现 → 扫描子 Block → 第2行仍然到期（nextDueDate=today）
6. ⚠️ 此时第2行仍到期，用户会再次看到第2行（这是 Forgot 的正确行为）
7. 但如果第2行之前还有其他到期行（如第0行），会先显示第0行
```

### 需要特别注意的 Bug 场景

**Bug 场景：插队回来后从头开始复习**

如果初始化逻辑没有正确利用子 Block 的独立 Session 数据，可能会出现：
- 插队回来后，重新从第0行开始（即使第0行已掌握）
- 原因：初始化时没有正确扫描子 Block 到期状态，或 Session 数据未正确更新

**防范措施**：
1. 插队前确保当前子 Block 的 Session 已正确更新（nextDueDate 已设为未来日期）
2. 插队前确保父 Block 的 nextDueDate 已同步更新
3. 卡片重新出现时，严格按子 Block Session 的 nextDueDate 扫描，不依赖任何"上次位置"记忆

**Bug 场景：重复插队导致卡片多次出现在队列中**

当前行为中，每次 Read/Next 或 Forgot 都可能插队。如果用户连续复习多个子 Block（在插队回来后），每次都会插队，导致队列中出现多个同一卡片的实例。

**防范措施**：
- 这是当前设计的有意行为（每次读一行插队一次），不需要修改
- 但需要确保每次插队回来后，从正确的位置继续

### LBL + Fixed（LblNext）插队流程

```
1. 用户点击 Read/Next
2. 更新当前子 Block 的独立 Session（progressive_repetitions++, nextDueDate 计算）
3. 同步更新父 Block 的 nextDueDate
4. 判断是否需要插队（shouldReinsertLblCard：offset > 0 且不是最后一个到期子 Block）
5. 如果需要插队：
   a. 将父卡片 UID 插入队列后方 offset 张之后
   b. 翻到下一张卡片
6. 当父卡片再次出现时，从下一个到期子 Block 继续（已掌握的自动跳过）
```

### LBL + SM2 Forgot 插队流程

```
1. 用户点击 Forgot（grade=0）
2. 更新当前子 Block 的独立 Session（sm2 重置：interval=0, repetitions=0, nextDueDate=today）
3. 同步更新父 Block 的 nextDueDate
4. 判断是否需要插队（grade===0 && forgotReinsertOffset > 0）
5. 如果需要插队：
   a. 将父卡片 UID 插入队列后方 offset 张之后
   b. 翻到下一张卡片
6. 当父卡片再次出现时：
   - 如果 Forgot 的子 Block 仍到期（nextDueDate=today）→ 先复习它（如果前面没有其他到期行）
   - 如果前面有其他到期行 → 先复习前面的到期行
```

### LBL + SM2 非 Forgot 打分流程

```
1. 用户点击 Hard/Good/Perfect（grade >= 1）
2. 更新当前子 Block 的独立 Session（SM2 计算新间隔）
3. 同步更新父 Block 的 nextDueDate
4. 不插队，直接前进到下一个到期子 Block（自动跳过已掌握行）
5. 如果没有更多到期子 Block → 卡片完成，翻到下一张
```

---

## 八、实施步骤

### Phase 1：数据模型调整

1. **修改 `session.ts`**：
   - 移除 `Session.lbl_progress` 字段
   - 移除 `CardMeta.lbl_progress` 字段
   - 移除 `LineByLineProgressMap` 和 `LineByLineChildData` 类型
   - 子 Block 的 Session 复用现有 `Session` 类型（已有完整字段集）

2. **修改 `SESSION_SNAPSHOT_KEYS`**：
   - 移除 `lbl_progress`

### Phase 2：数据读写层重构

3. **修改 `data.ts`（读取层）**：
   - `getPracticeData`：不再解析 `lbl_progress`
   - 新增 `getChildSessionData(childUids, dataPageTitle)`：根据子 Block UID 列表批量查询子 Block 的 Session 数据
   - 子 Block Session 解析逻辑与父 Block 相同（复用 `parseLatestSession`）

4. **修改 `save.ts`（写入层）**：
   - 移除 `updateLineByLineProgress` 函数
   - 子 Block 的 Session 写入复用 `savePracticeData`（子 Block 拥有完整 Session，与普通卡片无区别）
   - 新增 `updateParentNextDueDate(refUid, childUids, dataPageTitle)`：从子 Block Session 计算并更新父 Block 的 `nextDueDate`
   - LBL 模式下评分后调用：先 `savePracticeData` 保存子 Block Session，再 `updateParentNextDueDate` 更新父 Block

### Phase 3：LBL 复习逻辑重构

5. **修改 `useLineByLineReview.ts`**：
   - 移除 `lineByLineProgressStr` 输入参数
   - 新增 `childSessionData` 输入参数（`Record<string, Session>`）
   - 修改初始化逻辑：
     - 为新子 Block 创建 Session（如数据页中无对应条目）
     - 遍历子 Block UID 列表，查询各自的 Session，找到第一个到期的子 Block
   - **实现自动跳过**：
     - 维护 `dueChildIndices` 列表（所有到期子 Block 的索引）
     - 复习完一个到期子 Block 后，自动前进到下一个到期子 Block
     - 中间的已掌握子 Block 自动显示（降低透明度 + 绿色边框），无需用户交互
   - 修改 `onLineByLineGrade`：
     - 评分后更新子 Block 的独立 Session（调用 `savePracticeData`）
     - 同步更新父 Block 的 `nextDueDate`（调用 `updateParentNextDueDate`）
   - 协调插队机制（详见第七节），确保插队回来后从正确位置继续

6. **修改 `PracticeOverlay.tsx`**：
   - LBL 模式下，批量获取子 Block 的 Session 数据（调用 `getChildSessionData`）
   - 传递 `childSessionData` 给 `useLineByLineReview`

7. **修改 `LineByLineView.tsx`**：
   - 保持当前视觉设计：已掌握行降低透明度 + 绿色边框
   - 更新进度指示器：`L2/10 (3 due)` 格式

### Phase 4：到期卡片计算调整

8. **修改 `today.ts`**：
   - `calculateCompletedTodayCounts`：LBL 卡片完成判断改为检查子 Block Session（不再解析 `lbl_progress`）
   - `getDueCardUids`：父 Block 的 `nextDueDate` 已由写入层维护，无需改动

### Phase 5：数据迁移（Settings Data Migration 模块）

9. **在 Data Migration 设置中新增迁移功能**：
   - 迁移名称：`Migrate LBL Progress to Child Sessions`
   - 迁移逻辑：
     a. 扫描数据页中所有 `interaction:: LBL` 的卡片
     b. 对每张 LBL 卡片：
        - 解析 `lbl_progress` JSON
        - 为每个子 Block UID 创建独立 Session 条目（`((childUid))`）
        - 将 `LineByLineChildData` 转换为完整 `Session`（补全 algorithm, interaction 等字段）
        - 删除父 Block Session 中的 `lbl_progress` 字段
        - 更新父 Block 的 `nextDueDate`
   - 迁移前提示用户备份数据
   - 迁移完成后显示统计（迁移了多少卡片、多少子 Block）

10. **不做向后兼容**：
    - 迁移后旧格式（`lbl_progress`）不再被识别
    - 用户必须运行迁移后才能使用 LBL 功能
    - 迁移是单向的，不提供回滚

### Phase 6：测试与验证

11. **更新单元测试**：
    - `useLineByLineReview` 测试：验证自动跳过逻辑
    - `savePracticeData` 测试：验证子 Block Session 写入
    - `updateParentNextDueDate` 测试：验证父 Block nextDueDate 计算
    - 插队机制协调测试：验证插队回来后从正确位置继续

12. **集成测试**：
    - LBL + SM2 完整流程（含自动跳过）
    - LBL + Progressive 完整流程（含自动跳过）
    - 子 Block 移动后数据保持
    - 子 Block 作为独立卡片加入牌组
    - 迁移后数据完整性
    - 插队回来后继续学习（不从头开始）

---

## 九、风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 读取性能下降（多 Session 查询） | 利用 `useCachedData` 缓存；子 Block 数量通常 < 20 |
| 数据页体积增大 | Roam 数据页非用户面向，体积影响有限 |
| 迁移数据丢失 | 迁移前提示备份；迁移在 Settings 中独立执行，用户可控 |
| 子 Block 被删除后残留 Session | 不自动清理，未来开发手动清理工具 |
| 父 Block `nextDueDate` 与子 Block 不同步 | 每次子 Block 评分后同步更新父 Block |
| 插队回来后从头开始复习 | 严格依赖子 Block Session 的 nextDueDate 扫描，不依赖位置记忆 |
| 子 Block 同时在独立牌组和 LBL 中 | Session 数据共享是特性而非 Bug，任何一处复习都更新同一 Session |
