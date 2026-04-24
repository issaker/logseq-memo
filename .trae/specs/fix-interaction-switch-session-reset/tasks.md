# Tasks

- [x] Task 1: 修改 `onSelectInteraction` — 移除 `fetchPracticeData()` 调用
  - [x] SubTask 1.1: 从 `onSelectInteraction` 回调中移除 `fetchPracticeData()` 调用
  - [x] SubTask 1.2: 从 `onSelectInteraction` 的依赖数组中移除 `fetchPracticeData`
- [x] Task 2: 修改 `onSelectAlgorithm` — 移除 `fetchPracticeData()` 调用
  - [x] SubTask 2.1: 从 `onSelectAlgorithm` 的 Normal 模式分支中移除 `fetchPracticeData()` 调用
  - [x] SubTask 2.2: 从 `onSelectAlgorithm` 的 LBL 模式分支中移除 `fetchPracticeData()` 调用
  - [x] SubTask 2.3: 从 `onSelectAlgorithm` 的依赖数组中移除 `fetchPracticeData`
- [x] Task 3: 修改 `initialCardUids` useEffect — 仅在 UID 集合真正变化时重置
  - [x] SubTask 3.1: 将 `initialCardUids` useEffect 的重置条件从"引用变化"改为"UID 集合真正变化"（比较长度和 UID 内容）
  - [x] SubTask 3.2: 同样修改 `todaySelectedTag` + `initialCardUids` 的第二个 useEffect（wasEmpty/nowHasCards 逻辑保持不变）
- [x] Task 4: 验证 — 运行 lint 和 typecheck 确保代码正确
  - [x] SubTask 4.1: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 4.2: 运行 `npm run typecheck` 确保无类型错误

# Task Dependencies

- [Task 2] 和 [Task 1] 可并行执行
- [Task 3] 独立于 [Task 1] 和 [Task 2]
- [Task 4] depends on [Task 1], [Task 2], [Task 3]
