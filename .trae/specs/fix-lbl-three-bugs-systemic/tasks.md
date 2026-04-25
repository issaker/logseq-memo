# Tasks

- [x] Task 1: 修复 Bug 1 — childSessionData 为空时的 fallback 定位
  - [x] SubTask 1.1: 修改 `useLineByLineReview.ts` 的定位 useEffect，移除 `!Object.keys(childSessionData).length` 守卫，改为：当 `childSessionData` 为空时 fallback 到 index 0, revealedCount = 1；有数据时走正常 `findNextDueChildIndex` 逻辑
  - [x] SubTask 1.2: 确保 `needsPositioningRef` 在 fallback 场景下也被正确设为 `false`（避免空数据时重复定位）
  - [x] SubTask 1.3: 验证新卡片首行可见、有历史数据卡片定位正确

- [x] Task 2: 修复 Bug 2 — 删除 isLblNextActive 和 LblNextControls
  - [x] SubTask 2.1: 在 `Footer.tsx` 的 `GradingControlsWrapper` 中删除 `isLblNextActive` 分支，让 `isAutoAdvanceMode` 直接渲染 `FixedIntervalModeControls`
  - [x] SubTask 2.2: 删除 `Footer.tsx` 中的 `LblNextControls` 组件定义
  - [x] SubTask 2.3: 从 `GradingControlsWrapper` 的 MainContext 解构中移除 `currentChildIsLblNext`
  - [x] SubTask 2.4: 从 `PracticeOverlay.tsx` 的 `MainContextProps` 接口中移除 `currentChildIsLblNext` 字段
  - [x] SubTask 2.5: 从 `PracticeOverlay.tsx` 的 `mainContextValue` useMemo 中移除 `currentChildIsLblNext` 的传递
  - [x] SubTask 2.6: 验证 Progressive 显示 Review+Next、FixedTime 显示 Change Interval+Next、SM2 显示评分按钮

- [x] Task 3: 修复 Bug 3 — 插队返回后覆盖提示数据源修复
  - [x] SubTask 3.1: 在 `useLineByLineReview` 中将 `currentIndex` 加入定位 useEffect 的依赖，确保插队返回时重新定位
  - [x] SubTask 3.2: 在 `PracticeOverlay.tsx` 中将 `currentIndex` 加入 `getChildSessionData` useEffect 的依赖，确保插队返回时重新加载 DB 数据
  - [x] SubTask 3.3: 新增 `childSessionDataRef`，在 `onPracticeClick` 的 overwrite 检查中使用 ref 获取最新数据

- [x] Task 4: 更新 README
  - [x] SubTask 4.1: 更新 README 算法按钮栏表格，明确 Normal 和 LBL 统一
  - [x] SubTask 4.2: 删除 LBL 章节中关于 "Read + Next" / LblNextControls 的描述
  - [x] SubTask 4.3: 补充 LBL 子 block 就是 Normal 卡片的设计原则

- [x] Task 5: 验证 — 运行 lint 和 typecheck
  - [x] SubTask 5.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 5.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 1] 和 [Task 2] 可并行执行（不同文件）
- [Task 3] 依赖 [Task 1]（需要 `needsPositioningRef` 的修改）
- [Task 4] 依赖 [Task 1], [Task 2], [Task 3]
- [Task 5] 依赖所有前置任务
