# Tasks

- [ ] Task 1: 移除未使用的依赖包
  - [ ] SubTask 1.1: 从 package.json devDependencies 中移除 `@emotion/babel-plugin`
  - [ ] SubTask 1.2: 从 package.json devDependencies 中移除 `tailwindcss`
  - [ ] SubTask 1.3: 运行 `npm install` 更新 lock 文件
  - [ ] SubTask 1.4: 运行 `npm run build` 确认构建正常

- [ ] Task 2: 修复内存泄漏与资源清理问题
  - [ ] SubTask 2.1: 修复 `useAutoCollapseBlocks.ts` - useEffect 中 setTimeout 添加 clearTimeout cleanup
  - [ ] SubTask 2.2: 修复 `PracticeOverlay.tsx` - getChildSessionData Promise 竞态条件，添加 cancelled 标志
  - [ ] SubTask 2.3: 修复 `PracticeOverlay.tsx` - focusout 中 setTimeout 添加清理机制

- [ ] Task 3: 补充异步操作错误处理
  - [ ] SubTask 3.1: `usePracticeData.tsx` - getPracticeData 调用添加 try/catch
  - [ ] SubTask 3.2: `useBlockInfo.tsx` - fetchBlockInfo 调用添加 try/catch
  - [ ] SubTask 3.3: `useCachedData.ts` - getPluginPageCachedData 调用添加 try/catch
  - [ ] SubTask 3.4: `useSettings.ts` - initialize 函数添加 try/catch
  - [ ] SubTask 3.5: `useLineByLineReview.ts` - onLineByLineGrade 添加 try/catch
  - [ ] SubTask 3.6: `PracticeOverlay.tsx` - onSelectAlgorithm 添加 try/catch
  - [ ] SubTask 3.7: `PracticeOverlay.tsx` - onSelectInteraction 添加 try/catch
  - [ ] SubTask 3.8: `CardBlock.tsx` - renderBlock 添加 try/catch

- [ ] Task 4: 修复可选链安全性问题
  - [ ] SubTask 4.1: 修复 `PracticeOverlay.tsx` 中 `document?.activeElement.blur()` 为 `document.activeElement?.blur()`

- [ ] Task 5: 修复 React Hooks 依赖问题
  - [ ] SubTask 5.1: 修复 `useLineByLineReview.ts` 中 useEffect 缺失 currentChildIsLblNext 依赖

- [ ] Task 6: 修复失败的测试用例
  - [ ] SubTask 6.1: 在 `testUtils.ts` 的 generateMockRoamAlphaAPI 中添加 `pull` 方法 mock
  - [ ] SubTask 6.2: 为 `useBlockInfo.tsx` 添加 try/catch（与 SubTask 3.2 合并）
  - [ ] SubTask 6.3: 运行 `npm test` 确认所有测试通过

- [ ] Task 7: 安全修复依赖漏洞
  - [ ] SubTask 7.1: 运行 `npm audit fix`（不带 --force）修复可安全修复的漏洞
  - [ ] SubTask 7.2: 运行 `npm run build` 和 `npm test` 确认无回归

- [ ] Task 8: 最终验证
  - [ ] SubTask 8.1: 运行 `npx tsc --noEmit` 确认零类型错误
  - [ ] SubTask 8.2: 运行 `npx eslint '**/*.{ts,tsx,js,jsx}'` 确认零 ESLint 错误
  - [ ] SubTask 8.3: 运行 `npm test` 确认所有测试通过
  - [ ] SubTask 8.4: 运行 `npm run build` 确认构建成功

# Task Dependencies
- Task 2 和 Task 3 可并行执行
- Task 6 依赖 Task 3（SubTask 3.2）和 Task 5
- Task 7 独立于其他任务，可并行执行
- Task 8 依赖所有其他任务完成
