# 修复：渐进阅读模式点击 Next 导致插件崩溃

## 问题分析

### 崩溃流程
1. 牌组中只有一张新卡片，默认打开渐进阅读模式
2. 用户点击 **Next** 按钮 → 卡片被处理 → 队列中无更多卡片
3. 系统进入"完成"状态（`isDone = true`）
4. 完成状态渲染 `LazyDoneAnimation` 组件（[PracticeOverlay.tsx:694-697](src/components/overlay/PracticeOverlay.tsx#L694-L697)）
5. `LazyDoneAnimation` 使用 `React.lazy` + 动态 `import()` 加载 `react-lottie` 和 `done.json`（[PracticeOverlay.tsx:34-50](src/components/overlay/PracticeOverlay.tsx#L34-L50)）
6. Webpack 将动态 `import()` 拆分为独立的 chunk 文件
7. 在 Roam Research 插件环境中，webpack 尝试从 `https://roamresearch.com/js/compiled/XXX.extension.js` 加载 chunk
8. 这些 chunk 文件在 Roam CDN 上不存在 → **404 错误** → **ChunkLoadError**
9. 没有 ErrorBoundary 兜底 → 错误向上冒泡 → **整个组件崩溃**

### 根本原因
- **Webpack 动态代码分割**：`React.lazy` + `import()` 导致 webpack 生成额外 chunk 文件，而 Roam 插件环境只能加载主 `extension.js`
- **缺少 `publicPath` 配置**：[webpack.config.js](webpack.config.js) 没有设置 `output.publicPath`，webpack 默认使用页面相对路径加载 chunk
- **缺少 ErrorBoundary**：`React.Suspense` 只处理了加载中状态（`fallback={null}`），没有处理加载失败的情况

## 修复方案

### 步骤 1：将 `React.lazy` 动态导入改为静态导入（核心修复）

将 [PracticeOverlay.tsx:34-50](src/components/overlay/PracticeOverlay.tsx#L34-L50) 的 `LazyDoneAnimation` 从动态导入改为静态导入：

```tsx
// 删除 React.lazy 动态导入
// 改为：
import Lottie from 'react-lottie';
import doneAnimationData from '~/lotties/done.json';

const DoneAnimation = () => (
  <Lottie
    options={{ ...LOTTIE_BASE_OPTIONS, animationData: doneAnimationData.default || doneAnimationData }}
    style={LOTTIE_STYLE}
  />
);
```

同时在渲染处（[PracticeOverlay.tsx:694-697](src/components/overlay/PracticeOverlay.tsx#L694-L697)）移除 `React.Suspense` 包裹，直接使用 `<DoneAnimation />`。

**理由**：这是最可靠的修复方式。Roam Research 插件以单文件 `extension.js` 加载，动态 `import()` 生成的额外 chunk 文件无法在 Roam 环境中被正确加载。静态导入确保所有代码打包到单个文件中。

### 步骤 2：在 webpack 配置中禁用代码分割（防御性配置）

在 [webpack.config.js](webpack.config.js) 中添加：

```js
optimization: {
  splitChunks: false,
},
```

**理由**：作为防御性措施，即使未来有人再使用动态 `import()`，也不会生成额外的 chunk 文件。

### 步骤 3：添加 ErrorBoundary 兜底（安全网）

为完成状态的动画区域添加 ErrorBoundary，即使 Lottie 加载失败也不会导致整个组件崩溃：

```tsx
class DoneAnimationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
```

用 `<DoneAnimationErrorBoundary>` 包裹 `<DoneAnimation />`。

### 步骤 4：验证构建

运行 `npm run build` 确认：
- 构建成功无错误
- 输出只有单个 `extension.js` 文件，没有额外的 chunk 文件
