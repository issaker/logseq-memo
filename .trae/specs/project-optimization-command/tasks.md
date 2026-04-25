# Tasks

## Phase 1: 代码质量检查与修复（code-quality-check）

- [x] Task 1: 移除未使用的依赖包
  - [x] SubTask 1.1: 从 package.json devDependencies 中移除 `@emotion/babel-plugin`
  - [x] SubTask 1.2: 从 package.json devDependencies 中移除 `tailwindcss`
  - [x] SubTask 1.3: 运行 `npm install` 更新 lock 文件
  - [x] SubTask 1.4: 运行 `npm run build` 确认构建正常

- [x] Task 2: 修复失败的测试用例
  - [x] SubTask 2.1: 在 `testUtils.ts` 的 generateMockRoamAlphaAPI 中添加 `updateBlock` 方法 mock
  - [x] SubTask 2.2: 修复 `date.test.ts` 中不稳定的 "Same day" 测试（使用固定日期替代 `new Date()`）

- [x] Task 3: 补充异步操作错误处理
  - [x] SubTask 3.1: `usePracticeData.tsx` - getPracticeData 调用添加 try/catch
  - [x] SubTask 3.2: `useBlockInfo.tsx` - fetchBlockInfo 调用添加 try/catch
  - [x] SubTask 3.3: `useCachedData.ts` - getPluginPageCachedData 调用添加 try/catch
  - [x] SubTask 3.4: `useSettings.ts` - initialize 函数添加 try/catch
  - [x] SubTask 3.5: `useLineByLineReview.ts` - onLineByLineGrade 添加 try/catch
  - [x] SubTask 3.6: `PracticeOverlay.tsx` - onSelectAlgorithm 添加 try/catch
  - [x] SubTask 3.7: `PracticeOverlay.tsx` - onSelectInteraction 添加 try/catch
  - [x] SubTask 3.8: `CardBlock.tsx` - renderBlock 添加 try/catch

- [x] Task 4: 修复可选链安全性问题
  - [x] SubTask 4.1: 修复 `PracticeOverlay.tsx` 中 `document?.activeElement.blur()` 为 `document.activeElement?.blur()`

- [x] Task 5: 修复 React Hooks 依赖问题
  - [x] SubTask 5.1: 验证 `useLineByLineReview.ts` useEffect 依赖数组正确，添加注释说明

- [x] Task 6: 修复内存泄漏与资源清理问题
  - [x] SubTask 6.1: 修复 `useAutoCollapseBlocks.ts` - useEffect 中 setTimeout 添加 clearTimeout cleanup
  - [x] SubTask 6.2: 修复 `PracticeOverlay.tsx` - getChildSessionData Promise 竞态条件，添加 cancelled 标志
  - [x] SubTask 6.3: 验证 `PracticeOverlay.tsx` focusout 中 isMountedRef 保护机制正确，无需额外修改

- [x] Task 7: 安全修复依赖漏洞
  - [x] SubTask 7.1: 运行 `npm audit fix`（不带 --force）修复可安全修复的漏洞（25/29 已修复，剩余 4 个低危需 --force）
  - [x] SubTask 7.2: 运行 `npm run build` 和 `npm test` 确认无回归

- [x] Task 8: Phase 1 质量门检查
  - [x] SubTask 8.1: 运行 `npx tsc --noEmit` 确认零类型错误
  - [x] SubTask 8.2: 运行 `npx eslint '**/*.{ts,tsx,js,jsx}'` 确认零 ESLint 错误
  - [x] SubTask 8.3: 运行 `npm test` 确认所有测试通过（119/119）
  - [x] SubTask 8.4: 运行 `npm run build` 确认构建成功

## Phase 2: 测试补强与回归防护（test-coverage-hardening，有限范围）

- [x] Task 9: 测试质量审查
  - [x] SubTask 9.1: 检查是否存在假阳性测试 — 发现 1 个弱测试（practice.test.ts LBL 字段测试名不副实），已修复
  - [x] SubTask 9.2: 检查是否有测试过度依赖实现细节 — 未发现严重问题
  - [x] SubTask 9.3: 修正弱测试（practice.test.ts 增加断言验证 LBL 字段不出现）

- [x] Task 10: 核心路径测试补强评估
  - [x] SubTask 10.1: 评估覆盖率 — SM2/Progressive/FixedTime 核心算法 100%，数据模型 100%
  - [x] SubTask 10.2: 核心路径已充分覆盖，低覆盖区域（LBL导航/数据迁移/设置）重度依赖 Roam API，强行测试收益低

- [x] Task 11: CI 集成检查
  - [x] SubTask 11.1: 确认 `.github/workflows/main.yml` 包含 install + lint + test
  - [x] SubTask 11.2: 新增 typecheck job（并行运行）

- [x] Task 12: Phase 2 质量门检查
  - [x] SubTask 12.1: 运行 `npm test` 确认所有测试通过
  - [x] SubTask 12.2: 运行 `npm run typecheck` 确认无类型错误

## Phase 3: 开发体验与可维护性审查（dx-maintainability-audit，轻量级）

- [x] Task 13: VSCode 配置共享
  - [x] SubTask 13.1: 创建 `.vscode/extensions.json`，推荐 ESLint、Prettier、TypeScript Next 插件
  - [x] SubTask 13.2: 更新 `.vscode/settings.json`，添加 formatOnSave、defaultFormatter、fixAll.eslint

- [x] Task 14: .gitignore 精简
  - [x] SubTask 14.1: 从 142 行精简至 43 行，移除无关模板
  - [x] SubTask 14.2: 确认关键忽略项存在（.env、node_modules、dist、.DS_Store、coverage）

- [x] Task 15: 脚本与工作流清晰度
  - [x] SubTask 15.1: 确认 package.json scripts 齐全（dev/build/test/lint/typecheck）
  - [x] SubTask 15.2: README Development 部分补充 dev 和 lint 脚本说明

## Phase 4: 终态清理与精简（final-cleanup）

- [x] Task 16: 死代码与冗余逻辑清理
  - [x] SubTask 16.1: 修复 13 个文件中的未使用变量/参数（加 `_` 前缀或移除解构）
  - [x] SubTask 16.2: 删除孤立文件 `src/__mocks__/pluginPageBlockData.ts`
  - [x] SubTask 16.3: 未发现被注释掉的代码块

- [x] Task 17: 文件系统瘦身
  - [x] SubTask 17.1: 删除孤立 mock 文件和空目录；删除冗余 `build.sh`
  - [x] SubTask 17.2: .md 文件审计完成，无需删除（CHANGELOG 仅 3 行，无冗余文档）
  - [x] SubTask 17.3: done.json 已引用；extension.css 保守保留；build.sh 已删除

- [x] Task 18: 注释压缩提纯
  - [x] SubTask 18.1: 未发现重复代码本义的冗余注释
  - [x] SubTask 18.2: 翻译 17 处中文注释为英文；保留 UI 显示文本

- [x] Task 19: 全局复查与最终确认
  - [x] SubTask 19.1: `npm test` 119/119 通过
  - [x] SubTask 19.2: `npm run lint` 零错误（修复 coverage/ 目录 lint 问题）；`npx tsc --noEmit` 零类型错误
  - [x] SubTask 19.3: `npm run build` 构建成功（3.3 MiB）
  - [x] SubTask 19.4: README.md 已更新脚本说明

# Task Dependencies

- Task 2 依赖 Task 6（SubTask 6.1 修复 useAutoCollapseBlocks 后测试才能通过）
- Task 3 和 Task 6 可并行执行
- Task 8 依赖 Task 1-7 全部完成
- Task 9-11 可并行执行
- Task 12 依赖 Task 9-11
- Task 13-15 可并行执行
- Task 16-18 可并行执行
- Task 19 依赖 Task 16-18
- Phase 2 依赖 Phase 1（先修复代码质量问题，再审查测试）
- Phase 3 与 Phase 2 无依赖，可并行
- Phase 4 依赖 Phase 1-3 全部完成
