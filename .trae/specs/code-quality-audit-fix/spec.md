# 代码质量审查与修复 Spec

## Why
项目在推送至 GitHub 前需要进行系统性代码质量审查，当前存在未使用的依赖、内存泄漏风险、缺失的错误处理、测试失败等问题，影响项目的长期可维护性和稳定性。

## What Changes
- 移除未使用的依赖：`@emotion/babel-plugin`、`tailwindcss`
- 修复 3 处内存泄漏/资源清理问题
- 修复 1 处 Promise 竞态条件
- 修复 1 处不安全的可选链用法
- 为 8+ 处关键异步操作补充 try/catch 错误处理
- 修复 2 个失败的测试用例
- 修复 1 处 React Hook 依赖缺失问题

## Impact
- Affected specs: 无其他 spec 受影响
- Affected code:
  - `package.json` - 依赖清理
  - `src/components/overlay/PracticeOverlay.tsx` - 竞态修复、错误处理、可选链修复
  - `src/hooks/useAutoCollapseBlocks.ts` - setTimeout 清理
  - `src/hooks/usePracticeData.tsx` - 错误处理
  - `src/hooks/useBlockInfo.tsx` - 错误处理
  - `src/hooks/useCachedData.ts` - 错误处理
  - `src/hooks/useSettings.ts` - 错误处理
  - `src/hooks/useLineByLineReview.ts` - 错误处理、依赖修复
  - `src/utils/testUtils.ts` - mock 补充
  - `src/utils/dom.ts` - 可能需要错误处理

## ADDED Requirements

### Requirement: 依赖清理
系统 SHALL 不包含未使用的依赖包。

#### Scenario: 移除未使用的 devDependencies
- **WHEN** `@emotion/babel-plugin` 在 package.json 中声明但 .babelrc.js 未配置使用
- **THEN** 从 devDependencies 中移除该包

#### Scenario: 移除未使用的 devDependencies
- **WHEN** `tailwindcss` 在 package.json 中声明但项目无 tailwind.config.js 且构建流程未使用
- **THEN** 从 devDependencies 中移除该包

### Requirement: 资源清理与内存泄漏防护
系统 SHALL 在组件/模块卸载时正确清理所有创建的资源。

#### Scenario: useEffect 中的 setTimeout 清理
- **WHEN** `useAutoCollapseBlocks.ts` 中 useEffect 内创建 setTimeout
- **THEN** 在 cleanup 函数中调用 clearTimeout 防止卸载后执行

#### Scenario: Promise 竞态条件防护
- **WHEN** PracticeOverlay.tsx 中 useEffect 发起 getChildSessionData 异步请求
- **THEN** 使用 cancelled 标志在 cleanup 中取消过期的 Promise resolve，防止数据错乱

#### Scenario: focusout 中的 setTimeout 清理
- **WHEN** PracticeOverlay.tsx 中 focusout 事件处理器创建 setTimeout
- **THEN** 保存 timer ID 并在适当时机清理（此为低优先级，已有 isMountedRef 基本保护）

### Requirement: 异步操作错误处理
系统 SHALL 对所有可能失败的异步操作提供 try/catch 错误处理，确保用户操作不会导致白屏或数据静默丢失。

#### Scenario: 数据加载错误处理
- **WHEN** usePracticeData、useBlockInfo、useCachedData、useSettings 中的异步初始化函数抛出异常
- **THEN** 错误被捕获并记录到控制台，组件不会进入不一致状态

#### Scenario: 用户评分操作错误处理
- **WHEN** useLineByLineReview 的 onLineByLineGrade 中 savePracticeData 或 updateParentNextDueDate 失败
- **THEN** 错误被捕获并记录，用户不会丢失学习记录而不自知

#### Scenario: 算法/交互切换错误处理
- **WHEN** PracticeOverlay 的 onSelectAlgorithm 或 onSelectInteraction 中 updateReviewConfig 失败
- **THEN** 错误被捕获并记录，UI 状态不会与实际数据不一致

#### Scenario: CardBlock 渲染错误处理
- **WHEN** CardBlock 的 renderBlock 中 roamAlphaAPI 调用失败
- **THEN** 错误被捕获并记录，组件不会崩溃

### Requirement: 可选链安全性
系统 SHALL 正确使用可选链操作符，不因误用导致运行时错误或静默吞没重要错误。

#### Scenario: document 可选链修复
- **WHEN** 代码使用 `document?.activeElement.blur()` 模式
- **THEN** 改为 `document.activeElement?.blur()` 防止 document 存在但 activeElement 为 null 时崩溃

### Requirement: React Hooks 依赖完整性
系统 SHALL 确保 useEffect 的依赖数组包含所有在 effect 内使用的外部变量，或有明确的 eslint-disable 注释说明理由。

#### Scenario: useLineByLineReview 依赖修复
- **WHEN** useEffect 内使用了 currentChildIsLblNext 但未列入依赖数组
- **THEN** 将 currentChildIsLblNext 加入依赖数组，或确认排除是安全的并补充注释说明

### Requirement: 测试修复
系统 SHALL 通过所有测试用例。

#### Scenario: PracticeOverlay 测试修复
- **WHEN** 运行 npm test
- **THEN** 所有 119 个测试通过，0 个失败

#### Scenario: Mock 补充 pull 方法
- **WHEN** fetchBlockInfo 在 parentChainInfo.length > 1 时调用 window.roamAlphaAPI.pull
- **THEN** testUtils.ts 的 generateMockRoamAlphaAPI 提供 pull 方法的 mock 实现

## MODIFIED Requirements

### Requirement: npm audit 安全性
系统 SHALL 通过 `npm audit fix` 修复可安全修复的依赖漏洞（不引入破坏性变更）。

#### Scenario: 安全修复依赖漏洞
- **WHEN** 运行 npm audit 发现 32 个漏洞（4 low, 9 moderate, 17 high, 2 critical）
- **THEN** 执行 `npm audit fix`（不带 --force）修复可安全修复的漏洞，不升级大版本

## REMOVED Requirements

无移除的需求。
