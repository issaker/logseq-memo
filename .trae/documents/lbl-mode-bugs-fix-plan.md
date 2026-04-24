# LBL 模式上下翻行 + Progressive 算法 Bug 修复计划

## Bug 1 根因：GradingControlsWrapper 与 onLineByLineGrade 算法判定不一致

### 问题描述

Progressive+LBL 模式下，子 block 之前的算法是 SM2。当学习该子 block 时：
- `currentChildAlgorithm` = SM2（子 block 自身数据）
- `currentChildIsLblNext` = false（SM2 是评分算法）
- **但**: `GradingControlsWrapper` 使用 `usePracticeSession().algorithm`（父卡片的 PROGRESSIVE）来控制 UI
- 所以 UI 显示 Progressive 的 Read + Next 按钮，而非 SM2 的 Forgot/Hard/Good/Perfect
- 用户点击 Next → `intervalPractice` 调用 `onPracticeClick({ refUid })`，**不传 `sm2_grade`**
- `onPracticeClick` 传 `gradeData.sm2_grade`（undefined）给 `onLineByLineGrade`
- `onLineByLineGrade` 因 `currentChildIsLblNext = false` 进入 SM2 路径
- `generatePracticeData` 中 `sm2_grade || 0` = `undefined || 0` = `0`（Forgot）
- `supermemo` 返回 `sm2_interval: 0` → `nextDueDate = today`
- `findNextDueChildIndex` 返回同一个 child 索引 → **死循环**

### 修复方案

**`GradingControlsWrapper` 在 LBL 模式下应使用 `currentChildAlgorithm` 而非 PracticeSession 的 `algorithm`**

```typescript
// 位置: Footer.tsx - GradingControlsWrapper
const { isLineByLine, currentChildAlgorithm, currentChildIsLblNext } = React.useContext(MainContext);
const effectiveAlgorithm = isLineByLine ? (currentChildAlgorithm || algorithm) : algorithm;
const isAutoAdvanceMode = !isGradingAlgorithm(effectiveAlgorithm);
const isLblNextActive = isLBLReviewMode(interaction) && (isLineByLine ? currentChildIsLblNext : false);
```

效果：
- Child 1（有 SM2 数据）：`effectiveAlgorithm = SM2` → 显示 SM2 评分按钮（Forgot/Hard/Good/Perfect）
- Child 2（无数据，继承父级 Progressive）：`effectiveAlgorithm = PROGRESSIVE` → 显示 Progressive 控件
- UI 与 `onLineByLineGrade` 的 `currentChildIsLblNext` 判定**完全一致**

---

## Bug 2 根因：Footer 导航按钮排版间距不一致

### 问题描述

当前 `GradingControlsWrapper` 中：
- 外层 `justify-center gap-x-2`
- 内层有 `<div className="flex items-center gap-x-1">` 包裹 ▲▼◀▶
- `LblUpDownControls` 内部又有自身的 `gap-1`
- 多层嵌套导致 ▲▼ 与 ◀▶ 之间、导航组与评分控件之间的间距不均匀

### 修复方案

**将 ▲▼◀▶ 作为同级独立 flex 项，统一使用外层容器的 gap，去除所有内层分组**

```typescript
// 外层容器
<div className="flex items-center flex-wrap justify-center gap-3 w-full">
  {/* ▲ — 独立的 flex 项 */}
  {isLineByLine && <UpButton />}
  {/* ▼ — 独立的 flex 项 */}
  {isLineByLine && <DownButton />}
  {/* ◀ — 独立的 flex 项 */}
  <PrevButton />
  {/* ▶ — 独立的 flex 项 */}
  <NextButton />
  {/* 评分控件 — 评分按钮/Read+Next/间隔编辑，都是独立 flex 项 */}
  <GradingControls />
  {/* 算法选择器，独立 flex 项 */}
  <AlgorithmSelector />
  {/* 交互选择器，独立 flex 项 */}
  <InteractionSelector />
</div>
```

每个按钮都是外层 flex 容器的直接子元素，通过 `gap-3` 获得完全一致的间距。

---

## 涉及的文件修改

| 文件 | 修改内容 |
|------|---------|
| `src/components/overlay/Footer.tsx` | 修改 `GradingControlsWrapper` 使用 `currentChildAlgorithm`；重构布局移除内层分组 |
