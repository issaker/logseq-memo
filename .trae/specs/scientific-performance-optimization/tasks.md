# Tasks

## 第一阶段：渲染效率优化（最高优先级，影响面最广）

- [x] Task 1: Context Provider value 引用稳定化
  - [x] SubTask 1.1: MainContext.Provider value 使用 `useMemo` 包裹，依赖项包含所有 value 中使用的状态变量
  - [x] SubTask 1.2: PracticeSessionContext.Provider value 使用 `useMemo` 包裹，依赖项包含 sessionContext 展开项 + algorithm/interaction/onSelect*
  - [x] SubTask 1.3: 为 useMemo 添加性能优化注释

- [x] Task 2: 纯展示组件 React.memo 包裹
  - [x] SubTask 2.1: CardBlock 组件使用 `React.memo` 包裹导出
  - [x] SubTask 2.2: LineByLineView 组件使用 `React.memo` 包裹导出
  - [x] SubTask 2.3: 添加性能优化注释说明 memo 原因

- [x] Task 3: 内联函数和常量对象稳定引用
  - [x] SubTask 3.1: 提取 `const NOOP = () => {}` 模块级常量，替换 PracticeOverlay 和 LineByLineView 中的 `onRenderComplete={() => {}}`
  - [x] SubTask 3.2: 将 `lottieAnimationOption` 和 `lottieStyle` 提取为模块级常量（不依赖组件状态）
  - [x] SubTask 3.3: 添加性能优化注释

- [x] Task 4: 静态 CSS 一次性注入
  - [x] SubTask 4.1: 将 `mobileOverlayStyles()` 的返回值提取为模块级常量字符串
  - [x] SubTask 4.2: 使用 `useEffect` + `useRef` 确保样式仅注入一次，或直接使用模块级常量
  - [x] SubTask 4.3: 添加性能优化注释

## 第二阶段：数据层并行化（高优先级，直接影响操作响应速度）

- [x] Task 5: savePracticeData 并行化块操作
  - [x] SubTask 5.1: 将子块删除的 `for...await` 循环改为 `Promise.all(children.map(...))`
  - [x] SubTask 5.2: 将子块创建的 `for...await` 循环改为 `Promise.all(Object.keys(data).map(...))`
  - [x] SubTask 5.3: 添加性能优化注释说明并行化原因

- [x] Task 6: getChildSessionData 避免全量数据页重载
  - [x] SubTask 6.1: 修改 `getChildSessionData` 接受可选的 `pluginPageData` 参数，避免重复查询
  - [x] SubTask 6.2: 更新调用方传入已有的 pluginPageData
  - [x] SubTask 6.3: 添加性能优化注释

- [x] Task 7: getDailyNoteBlockUids 消除 N+1 查询
  - [x] SubTask 7.1: 编写单次 Datalog 查询替代逐页查询模式
  - [x] SubTask 7.2: 验证查询结果与原实现一致
  - [x] SubTask 7.3: 添加性能优化注释

- [x] Task 8: 多 tag 查询并行化
  - [x] SubTask 8.1: 将 `getPracticeData` 中的 `for...await` 循环改为 `Promise.all(tagsList.map(...))`
  - [x] SubTask 8.2: 添加性能优化注释

- [x] Task 9: today.ts 循环外创建 Date
  - [x] SubTask 9.1: 将 `new Date()` 提取到 `calculateCompletedTodayCounts` 函数的循环外部

## 第三阶段：资源加载优化

- [x] Task 10: react-lottie 懒加载
  - [x] SubTask 10.1: 使用 `React.lazy` + `import()` 动态导入 Lottie 组件
  - [x] SubTask 10.2: 将 `done.json` 动画数据移入 lazy import
  - [x] SubTask 10.3: 添加 `<Suspense>` 包裹 Lottie 渲染区域
  - [x] SubTask 10.4: 添加性能优化注释

- [x] Task 11: webpack 生产构建优化
  - [x] SubTask 11.1: 将 `devtool` 改为条件配置：development 用 `inline-source-map`，production 用 `source-map` 或 false
  - [x] SubTask 11.2: 验证 `npm run build` 输出正常

## 第四阶段：内存泄漏修复

- [x] Task 12: useCollapseReferenceList MutationObserver 防循环
  - [x] SubTask 12.1: 添加防抖机制（如 300ms debounce），确保回调不会因自身 DOM 操作无限触发
  - [x] SubTask 12.2: 添加性能优化注释

- [x] Task 13: CardBlock blur 事件监听器清理
  - [x] SubTask 13.1: 维护已注册 blur 监听器的 textarea 集合（useRef）
  - [x] SubTask 13.2: 在 MutationObserver disconnect 或组件卸载时批量移除 blur 监听器
  - [x] SubTask 13.3: 添加性能优化注释

- [x] Task 14: setTimeout 回调卸载保护
  - [x] SubTask 14.1: 在 PracticeOverlay 中添加 `isMountedRef`
  - [x] SubTask 14.2: 在 `handleFocusOut` 的 setTimeout 回调中检查 isMountedRef
  - [x] SubTask 14.3: 在组件卸载时设置 isMountedRef.current = false

## 第五阶段：原生 API 与工具优化

- [x] Task 15: debounce 添加取消机制
  - [x] SubTask 15.1: 修改 debounce 返回值，附带 `cancel()` 方法
  - [x] SubTask 15.2: 添加性能优化注释

- [x] Task 16: useCloze DOM 操作优化
  - [x] SubTask 16.1: 修改 `wrapMatches`，在匹配替换后使用偏移量更新文本节点列表，而非重新调用 `getAllTextNodes`
  - [x] SubTask 16.2: 添加性能优化注释

- [x] Task 17: useOnVisibilityStateChange callback ref 稳定化
  - [x] SubTask 17.1: 使用 `useRef` 存储 callback，effect 中从 ref.current 读取
  - [x] SubTask 17.2: 将 callback 从 useEffect 依赖数组中移除

## 第六阶段：验证

- [x] Task 18: 运行 typecheck 和测试
  - [x] SubTask 18.1: 运行 `npm run typecheck` 确保无类型错误
  - [x] SubTask 18.2: 运行 `npm run test` 确保所有测试通过
  - [x] SubTask 18.3: 运行 `npm run build` 确保生产构建成功

# Task Dependencies

- Task 2 (React.memo) 依赖 Task 3 (内联函数稳定引用) — 必须先稳定 props 引用，memo 才能正确工作
- Task 10 (lottie 懒加载) 独立，可与其他任务并行
- Task 5-9 (数据层优化) 互相独立，可并行
- Task 12-14 (内存修复) 互相独立，可并行
- Task 18 (验证) 依赖所有其他任务完成
