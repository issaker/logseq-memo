# LBL 模式剩余 Bug 修复计划

## Issue 1: SM2 showAnswer 状态下按钮左对齐

### 根因

[Footer.tsx:L250-260](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/Footer.tsx#L250-L260)：

```typescript
) : !showAnswers ? (
  <div className="flex items-center gap-3">      // ← 缺少 justify-center
    {isLineByLine && (
      <LblUpDownControls ... />
    )}
    <AnswerHiddenControls ... />
  </div>
) : (
  <GradingControlsWrapper ... />                  // ← 有 justify-center ✅
```

`!showAnswers` 分支中的 `<div>` 使用了 `flex items-center gap-3` 但**没有 `justify-center`**。在 SM2+LBL 模式下，用户必须点击 Show Answer，所以会进入此分支。内部的 ▲▼ 按钮 + Show Answer 按钮整体左对齐。

而 `GradingControlsWrapper` 在 `showAnswers=true` 时使用 `justify-center`，是居中的。

问题在于：`!showAnswers` 分支里这个包裹 div 是之前修复排版时引入的，当时为了把 ▲▼ 和 Show Answer 按钮放一起，但忘记了 `justify-center`。

### 修复方案

```typescript
<div className="flex items-center justify-center gap-3">
```

---

## Issue 2: 快速上下翻行时显示错误按钮 (Progressive 显示 SM2 按钮)

### 根因

`onLineByLineUp`/`onLineByLineDown` 使用 `React.useCallback` 捕获 `lineByLineCurrentChildIndex` 的当前值。当用户**快速连续**按 ↑↓ 时：

1. 第一次 `onLineByLineDown()` 调用 `setLineByLineCurrentChildIndex(1)`
2. React **尚未重新渲染**，快捷键绑定的仍旧是旧的回调
3. 第二次 `onLineByLineDown()` 触发，**闭包中的 `lineByLineCurrentChildIndex` 仍然是 0**
4. 两次都 `setLineByLineCurrentChildIndex(0+1)`，最终停在 child 1

这个场景下 index 是对的（停在了正确的位置），但问题出在 **`showAnswers` 被覆盖**：

5. `onLineByLineDown` 中同时调用 `setShowAnswers(isTargetLblNext)` 设置对应值
6. 但 PracticeOverlay 的 `useEffect`（[L337-354](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L337-L354)）在每次 `currentChildIsLblNext` 变化时也会调用 `setShowAnswers`
7. 如果两次按键之间有中间状态，`useEffect` 会基于**本次渲染的 `currentChildIsLblNext`** 覆盖 `showAnswers`
8. 当用户从 Progressive child（`currentChildIsLblNext=true`）快速导航到 SM2 child（`currentChildIsLblNext=false`）时：
   - `useEffect` 看到 `currentChildIsLblNext=false` → `setShowAnswers(false)`
   - 但 `setShowAnswers(true)` 可能后于 `setShowAnswers(false)` 被处理（取决于 React 批处理顺序）

**核心问题**：`onLineByLineDown` 使用 `setShowAnswers`（同步设置）与 PracticeOverlay 的 `useEffect` 中 `setShowAnswers`（异步设置）形成竞争条件。

### 修复方案

**移除 PracticeOverlay 中 [L337-354](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L337-L354) 的 `useEffect`。**

原因：
- `onLineByLineUp`/`onLineByLineDown` 已经正确设置了 `showAnswers`
- `onLineByLineGrade`/`onLineByLineShowAnswer` 也已经正确设置了 `showAnswers`
- `onPracticeClick`（非 LBL 路径）在 `handlePracticeClick` 后调用 `setShowAnswers(false)`，同样不需要这个 effect
- 这个 effect 的设计初衷是"同步 `showAnswers` 与 `currentChildIsLblNext`"——但 `showAnswers` 已经被上游事件处理函数正确设置了，effect 的二次覆盖只会引入竞争条件

移除后，各个事件处理函数各自负责自己的 `showAnswers` 状态，不存在竞争。

**额外防护**：在 `onLineByLineUp`/`onLineByLineDown` 中使用 `useRef` 存储当前索引，避免快速连续按时的闭包陈腐问题。

```typescript
// useLineByLineReview.ts
const lineByLineCurrentChildIndexRef = React.useRef(lineByLineCurrentChildIndex);
lineByLineCurrentChildIndexRef.current = lineByLineCurrentChildIndex;
```

然后在回调中读取 ref 值而非闭包值。

---

## 涉及的文件修改

| 文件 | 修改内容 |
|------|---------|
| `src/components/overlay/Footer.tsx` | L251: `<div>` 添加 `justify-center` |
| `src/components/overlay/PracticeOverlay.tsx` | 移除 L337-354 的 `useEffect` |
| `src/hooks/useLineByLineReview.ts` | `onLineByLineUp`/`onLineByLineDown` 使用 `useRef` 避免闭包陈腐 |
