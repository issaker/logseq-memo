# 性能优化验证清单

## 渲染效率

- [x] MainContext.Provider value 使用 useMemo 包裹，依赖项正确
- [x] PracticeSessionContext.Provider value 使用 useMemo 包裹，依赖项正确
- [x] CardBlock 使用 React.memo 包裹导出
- [x] LineByLineView 使用 React.memo 包裹导出
- [x] onRenderComplete 使用稳定的 NOOP 常量引用，非内联函数
- [x] lottieAnimationOption 和 lottieStyle 提取为模块级常量
- [x] mobileOverlayStyles CSS 仅注入一次，不在每次渲染时重新生成

## 数据层并行化

- [x] savePracticeData 子块创建使用 Promise.all 并行执行
- [x] savePracticeData 子块删除使用 Promise.all 并行执行
- [x] getChildSessionData 接受可选 pluginPageData 参数，避免全量重载
- [x] getDailyNoteBlockUids 使用单次 Datalog 查询，无 N+1 模式
- [x] getPracticeData 多 tag 查询使用 Promise.all 并行执行
- [x] calculateCompletedTodayCounts 中 new Date() 在循环外创建

## 资源加载

- [x] react-lottie 使用 React.lazy 动态导入
- [x] done.json 动画数据随 Lottie 一起懒加载
- [x] Suspense 包裹 Lottie 渲染区域
- [x] webpack 生产构建不包含 inline-source-map

## 内存泄漏修复

- [x] useCollapseReferenceList MutationObserver 有防循环机制（防抖或变更标记）
- [x] CardBlock 组件卸载时清理所有已注册的 textarea blur 监听器
- [x] PracticeOverlay handleFocusOut setTimeout 有卸载保护

## 原生 API 与工具

- [x] debounce 函数返回值附带 cancel() 方法
- [x] useCloze wrapMatches 不在循环中重复调用 getAllTextNodes
- [x] useOnVisibilityStateChange 使用 useRef 存储 callback，不因 callback 变化重新注册监听器

## 代码质量

- [x] 所有性能优化改写的代码块有注释说明优化原因
- [x] npm run typecheck 通过
- [x] npm run test 通过
- [x] npm run build 成功
