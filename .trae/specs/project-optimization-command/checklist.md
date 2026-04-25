# 项目全面优化总指挥 — 验证清单

## Phase 1: 代码质量检查与修复

- [x] `@emotion/babel-plugin` 和 `tailwindcss` 已从 package.json devDependencies 中移除
- [x] `npm run build` 构建成功
- [x] `testUtils.ts` generateMockRoamAlphaAPI 包含 `updateBlock` 方法 mock
- [x] `npm test` 所有测试通过（119/119, 0 failed）
- [x] `usePracticeData.tsx` getPracticeData 有 try/catch
- [x] `useBlockInfo.tsx` fetchBlockInfo 有 try/catch
- [x] `useCachedData.ts` getPluginPageCachedData 有 try/catch
- [x] `useSettings.ts` initialize 有 try/catch
- [x] `useLineByLineReview.ts` onLineByLineGrade 有 try/catch
- [x] `PracticeOverlay.tsx` onSelectAlgorithm 有 try/catch
- [x] `PracticeOverlay.tsx` onSelectInteraction 有 try/catch
- [x] `CardBlock.tsx` renderBlock 有 try/catch
- [x] `PracticeOverlay.tsx` 可选链已修复为 `document.activeElement?.blur()`
- [x] `useLineByLineReview.ts` useEffect 依赖数组有注释说明
- [x] `useAutoCollapseBlocks.ts` useEffect 中 setTimeout 有 clearTimeout cleanup
- [x] `PracticeOverlay.tsx` getChildSessionData Promise 竞态有 cancelled 标志防护
- [x] `PracticeOverlay.tsx` focusout 中 setTimeout 有 isMountedRef 清理机制
- [x] `npm audit fix` 已执行（不带 --force，修复 25/29 漏洞）
- [x] `npx tsc --noEmit` 零类型错误
- [x] `npm run lint` 零 ESLint 错误

## Phase 2: 测试补强与回归防护

- [x] 无假阳性测试（修复 1 个弱测试：practice.test.ts LBL 字段断言增强）
- [x] 无过度依赖实现细节的脆断测试
- [x] 核心路径测试空白已评估（SM2/Progressive/FixedTime 100%覆盖，低覆盖区域依赖 Roam API 不宜强行测试）
- [x] `.github/workflows/main.yml` 包含 install + lint + test + typecheck
- [x] `npm test` 所有测试通过
- [x] `npm run typecheck` 无类型错误

## Phase 3: 开发体验与可维护性审查

- [x] `.vscode/extensions.json` 存在，推荐 ESLint、Prettier、TypeScript Next 插件
- [x] `.vscode/settings.json` 格式化器配置统一（formatOnSave + defaultFormatter + fixAll.eslint）
- [x] `.gitignore` 已精简（142行→43行），移除无关模板内容
- [x] `.gitignore` 包含关键忽略项（.env、node_modules、dist、.DS_Store、coverage）
- [x] package.json scripts 包含 dev/build/test/lint/typecheck
- [x] README 说明了每个脚本的用途

## Phase 4: 终态清理与精简

- [x] ESLint no-unused-vars 零警告（13 个文件修复未使用变量/参数）
- [x] 无从未被导入的孤立 .ts/.tsx 文件（已删除 pluginPageBlockData.ts）
- [x] 无被注释掉的代码块
- [x] 无一次性脚本和临时测试文件（已删除 build.sh）
- [x] 非核心 .md 文件已审计（CHANGELOG.md 仅 3 行保留；THEME_SYSTEM.md 有参考价值保留）
- [x] 无未被引用的资源文件
- [x] 无重复代码本义的冗余注释
- [x] 注释风格统一（英文），17 处中文注释已翻译；UI 显示文本保留
- [x] `npm test` 全部通过
- [x] `npm run lint && npx tsc --noEmit` 零错误零警告
- [x] `npm run build` 生产构建成功（3.3 MiB）
- [x] README.md 准确反映修改后的项目状态
