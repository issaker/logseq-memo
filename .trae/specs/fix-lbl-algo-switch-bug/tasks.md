# Tasks

- [x] Task 1: 修复 `useLineByLineReview` 算法切换跳行 Bug
  - [x] SubTask 1.1: 新增 `prevCardRefUidRef` 和 `needsPositioningRef` 两个 ref，分别追踪卡片变化和定位需求
  - [x] SubTask 1.2: 将现有定位 useEffect 拆分为两个 useEffect：第一个监听 `currentCardRefUid` 变化时设置 `needsPositioningRef.current = true`；第二个监听 `childSessionData` 变化且 `needsPositioningRef.current === true` 时执行定位，定位后设置 `needsPositioningRef.current = false`
  - [x] SubTask 1.3: 确保异步加载 `childSessionData` 后仍能正确初始化位置（`needsPositioningRef` 在卡片切换时为 true，数据加载后触发第二个 useEffect 完成定位）

- [x] Task 2: 新增 LBL 重评分覆盖提示
  - [x] SubTask 2.1: 在 `PracticeOverlay.tsx` 的 `onPracticeClick` 中，LBL 分支调用 `onLineByLineGrade` 之前，检测当前子 block 是否为同日重评分（`childSessionData[childUid].dateCreated` 是今天且 `sm2_grade !== 0`），若是则调用 `setShowOverwriteReminder(true)`

- [x] Task 3: 更新 README
  - [x] SubTask 3.1: 在快捷键表格中添加 ↑/↓ 快捷键说明
  - [x] SubTask 3.2: 在 Architecture 部分新增 "LBL Dual-Queue Architecture" 小节，说明一级队列（◀/▶）和二级队列（▲/▼）的并行导航设计

- [x] Task 4: 补充代码注释
  - [x] SubTask 4.1: 在 `useLineByLineReview.ts` 文件头注释中补充二级队列架构核心设计思想（一级队列管理卡片间导航，二级队列管理子 block 间导航，两者独立并行）
  - [x] SubTask 4.2: 在 `PracticeOverlay.tsx` 的 `MainContext` 接口注释中补充二级队列架构说明
  - [x] SubTask 4.3: 在 `Footer.tsx` 的上下翻行按钮和快捷键处补充注释

- [x] Task 5: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 5.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 5.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] depends on [Task 1]（重评分提示需要位置不跳行才能正确工作）
- [Task 5] depends on [Task 1] and [Task 2]（验证需要在代码修改完成后进行）
- [Task 3] and [Task 4] 可并行执行
