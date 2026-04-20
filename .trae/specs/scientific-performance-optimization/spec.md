# 系统性能科学优化 Spec

## Why

当前项目存在多处可量化的性能瓶颈：Context Provider value 每次渲染创建新引用导致整棵组件树不必要重渲染、数据层存在 N+1 查询和串行 API 调用、react-lottie 未懒加载增加首屏包体积、MutationObserver 可能无限触发导致 CPU 飙升。这些问题直接影响用户在复习操作（评分、翻卡、标签切换）时的响应速度。

## What Changes

- **渲染效率优化**：Context Provider value 使用 `useMemo` 稳定引用；CardBlock / LineByLineView 使用 `React.memo`；提取内联函数和常量对象为稳定引用；静态 CSS 一次性注入
- **数据层并行化**：savePracticeData 中串行块操作改为 `Promise.all` 并行；getChildSessionData 避免全量数据页重载；getDailyNoteBlockUids 消除 N+1 查询；多 tag 查询并行化
- **资源加载优化**：react-lottie 和动画数据懒加载；webpack 生产构建移除 inline-source-map
- **内存泄漏修复**：useCollapseReferenceList MutationObserver 添加防循环机制；CardBlock blur 事件监听器清理；setTimeout 回调卸载保护
- **原生 API 优先**：自定义 debounce 添加取消机制；sleep+模拟点击模式改为 MutationObserver 等待
- **useCloze DOM 操作优化**：消除循环中重复扫描文本节点

## Impact

- Affected specs: 无直接关联的已有 spec
- Affected code:
  - `src/components/overlay/PracticeOverlay.tsx` — Context value useMemo、lottie 懒加载、静态 CSS 提取、内联函数稳定化
  - `src/components/overlay/CardBlock.tsx` — React.memo、blur 监听器清理、sleep→MutationObserver
  - `src/components/overlay/LineByLineView.tsx` — React.memo、内联函数稳定化
  - `src/queries/data.ts` — getChildSessionData 优化、多 tag 并行查询
  - `src/queries/save.ts` — 串行→并行块操作
  - `src/queries/utils.ts` — getDailyNoteBlockUids N+1 消除、fetchBlockInfo 优化
  - `src/queries/today.ts` — 循环外创建 Date
  - `src/hooks/useCollapseReferenceList.tsx` — MutationObserver 防循环
  - `src/hooks/useCloze.tsx` — DOM 操作优化
  - `src/hooks/useOnVisibilityStateChange.tsx` — callback ref 稳定化
  - `src/utils/async.ts` — debounce 添加取消机制
  - `webpack.config.js` — 生产构建优化

---

## ADDED Requirements

### Requirement: Context Provider value 引用稳定化

系统 SHALL 确保 `MainContext.Provider` 和 `PracticeSessionContext.Provider` 的 `value` prop 仅在依赖项变化时才创建新引用，避免消费子组件的不必要重渲染。

#### Scenario: MainContext value 引用稳定
- **WHEN** PracticeOverlay 因非 Context 相关状态变化而重渲染
- **THEN** `MainContext.Provider` 的 `value` 引用保持不变
- **AND** 消费 `MainContext` 的子组件（Footer、Header 等）不触发重渲染

#### Scenario: PracticeSessionContext value 引用稳定
- **WHEN** PracticeOverlay 因非 session 相关状态变化而重渲染
- **THEN** `PracticeSessionContext.Provider` 的 `value` 引用保持不变

### Requirement: 纯展示组件 React.memo 包裹

系统 SHALL 对 `CardBlock` 和 `LineByLineView` 纯展示组件使用 `React.memo` 包裹，防止父组件状态变化导致的不必要重渲染。

#### Scenario: CardBlock props 未变化时不重渲染
- **WHEN** PracticeOverlay 重渲染但 CardBlock 的 props 未变化
- **THEN** CardBlock 不触发重渲染

#### Scenario: LineByLineView props 未变化时不重渲染
- **WHEN** PracticeOverlay 重渲染但 LineByLineView 的 props 未变化
- **THEN** LineByLineView 不触发重渲染

### Requirement: 内联函数和常量对象稳定引用

系统 SHALL 将 JSX 中传递给子组件的内联函数和常量对象提取为组件级稳定引用，确保 `React.memo` 的浅比较能正确工作。

#### Scenario: onRenderComplete 空函数引用稳定
- **WHEN** PracticeOverlay 或 LineByLineView 重渲染
- **THEN** 传递给 CardBlock 的 `onRenderComplete` 回调引用保持不变

#### Scenario: lottieAnimationOption 和 lottieStyle 引用稳定
- **WHEN** PracticeOverlay 重渲染
- **THEN** `lottieAnimationOption` 和 `lottieStyle` 对象引用保持不变

### Requirement: 静态 CSS 一次性注入

系统 SHALL 将 `mobileOverlayStyles()` 生成的静态 CSS 提取为模块级常量，仅在组件首次挂载时注入一次，而非每次渲染都重新生成和注入。

#### Scenario: mobileOverlayStyles 不在每次渲染时执行
- **WHEN** PracticeOverlay 重渲染
- **THEN** 不重新调用 `mobileOverlayStyles()` 函数
- **AND** CSS 样式仍然正确应用

### Requirement: savePracticeData 并行化块操作

系统 SHALL 将 savePracticeData 中的串行块创建和删除操作改为 `Promise.all` 并行执行，显著减少评分操作的等待时间。

#### Scenario: 子块创建并行执行
- **WHEN** 保存会话数据需要创建多个子块
- **THEN** 所有子块创建操作通过 `Promise.all` 并行执行
- **AND** 总等待时间约等于单次 API 调用时间（而非 N 倍）

#### Scenario: 子块删除并行执行
- **WHEN** 需要删除旧的子块字段
- **THEN** 所有删除操作通过 `Promise.all` 并行执行

### Requirement: getChildSessionData 避免全量数据页重载

系统 SHALL 优化 `getChildSessionData` 的实现，避免为获取少量子行数据而重新查询整个数据页。

#### Scenario: 仅查询需要的子行数据
- **WHEN** 调用 `getChildSessionData` 获取指定 childUids 的数据
- **THEN** 不重新调用 `getPluginPageData` 查询整个数据页
- **AND** 使用已有的 pluginPageData 缓存或精确查询

### Requirement: getDailyNoteBlockUids 消除 N+1 查询

系统 SHALL 将 `getDailyNoteBlockUids` 中的逐页查询模式改为单次 Datalog 查询，一次性获取所有 Daily Note 页面的顶层块 uid。

#### Scenario: 单次查询获取所有 Daily Note 块
- **WHEN** 调用 `getDailyNoteBlockUids`
- **THEN** 使用单次 Datalog 查询获取结果
- **AND** 不对每个 Daily Note 页面执行单独的块查询

### Requirement: 多 tag 查询并行化

系统 SHALL 将 `getPracticeData` 中对多个 tag 的串行查询改为并行执行。

#### Scenario: 多 tag 并行查询
- **WHEN** `getPracticeData` 需要查询多个 tag 的数据
- **THEN** 所有 tag 的 `getSessionData` 调用通过 `Promise.all` 并行执行

### Requirement: react-lottie 懒加载

系统 SHALL 将 `react-lottie` 组件和 `done.json` 动画数据改为动态导入，仅在用户完成所有复习（isDone 状态）时才加载，减少初始 bundle 体积。

#### Scenario: Lottie 按需加载
- **WHEN** 插件初始加载
- **THEN** `react-lottie` 和 `done.json` 不包含在初始 bundle 中
- **WHEN** 用户完成所有复习进入 isDone 状态
- **THEN** 动态加载 Lottie 组件和动画数据

### Requirement: webpack 生产构建优化

系统 SHALL 优化 webpack 生产构建配置：移除 inline-source-map，确保 production 模式下 tree-shaking 生效。

#### Scenario: 生产构建无 inline source map
- **WHEN** 执行 `npm run build`
- **THEN** 输出的 bundle 不包含 inline-source-map
- **AND** 可选生成外部 .map 文件用于调试

### Requirement: useCollapseReferenceList MutationObserver 防循环

系统 SHALL 为 `useCollapseReferenceList` 中的 MutationObserver 添加防循环机制，防止回调中的 DOM 操作再次触发观察者。

#### Scenario: MutationObserver 不因自身操作无限触发
- **WHEN** MutationObserver 回调执行 `collapseDataReferenceBlock()`
- **AND** 该操作导致 DOM 变化
- **THEN** MutationObserver 不会因该 DOM 变化再次触发回调
- **AND** 使用防抖或变更标记机制确保单次触发

### Requirement: CardBlock blur 事件监听器清理

系统 SHALL 在 CardBlock 组件卸载时清理通过 MutationObserver 添加到 textarea 元素上的 blur 事件监听器，防止内存泄漏。

#### Scenario: 组件卸载时清理 blur 监听器
- **WHEN** CardBlock 组件卸载
- **THEN** 所有已注册的 textarea blur 事件监听器被移除

### Requirement: setTimeout 回调卸载保护

系统 SHALL 对 PracticeOverlay 中 `handleFocusOut` 的 setTimeout 回调添加卸载保护，防止在组件卸载后执行状态更新。

#### Scenario: 组件卸载后 setTimeout 不执行状态更新
- **WHEN** 组件在 setTimeout 回调执行前卸载
- **THEN** 回调不执行 `setIsEditing(false)`
- **AND** 不产生 React 对已卸载组件的状态更新警告

### Requirement: debounce 添加取消机制

系统 SHALL 为自定义 `debounce` 函数添加取消功能，返回的防抖函数应附带 `cancel()` 方法，允许在组件卸载时取消待执行的延迟调用。

#### Scenario: 防抖函数可取消
- **WHEN** 调用防抖函数的 `cancel()` 方法
- **THEN** 待执行的延迟调用被取消
- **AND** 原函数不会被执行

### Requirement: useCloze DOM 操作优化

系统 SHALL 优化 `useCloze` 中 `wrapMatches` 函数的 DOM 操作，消除循环中重复调用 `getAllTextNodes` 扫描文本节点的问题。

#### Scenario: wrapMatches 不重复扫描文本节点
- **WHEN** 处理包含多个 cloze 标记的文本
- **THEN** `getAllTextNodes` 仅在初始时调用一次
- **AND** 后续匹配操作基于已有节点列表进行偏移更新

### Requirement: useOnVisibilityStateChange callback ref 稳定化

系统 SHALL 使用 `useRef` 存储 `useOnVisibilityStateChange` 的 callback，避免 callback 引用变化导致 `visibilitychange` 事件监听器频繁重新注册。

#### Scenario: callback 变化不重新注册事件监听器
- **WHEN** 传入的 callback 引用变化
- **THEN** `visibilitychange` 事件监听器不重新注册
- **AND** 始终使用最新的 callback 引用

### Requirement: 性能优化注释

系统 SHALL 对所有因性能优化而改写的代码块添加简短注释，说明优化原因，防止后续维护者误删优化逻辑。

#### Scenario: 优化代码有注释说明
- **WHEN** 查看因性能优化而改写的代码
- **THEN** 存在注释说明为何这样写更快（如 "useMemo: 稳定引用避免子组件不必要重渲染"）

## MODIFIED Requirements

### Requirement: savePracticeData 保存流程

旧实现串行创建和删除子块，现改为 `Promise.all` 并行执行。功能行为不变，仅执行时序从串行变为并行。

### Requirement: getPracticeData 数据获取流程

旧实现串行查询每个 tag，现改为 `Promise.all` 并行查询。功能行为不变，仅执行时序从串行变为并行。

### Requirement: getChildSessionData 查询策略

旧实现每次调用都重新查询整个数据页，现改为接受已有的 pluginPageData 参数或使用更精确的查询，避免全量重载。

## REMOVED Requirements

无移除的需求。
