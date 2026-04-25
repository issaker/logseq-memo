# 项目全面优化总指挥 Spec

## Why

项目已历经多轮功能迭代和部分优化（性能优化、架构审查已完成），但存在**从未执行的代码质量修复计划**（code-quality-audit-fix spec 全部未勾选）、**2 个持续失败的测试用例**、**33 个依赖漏洞**、以及**未使用的依赖包**。需要以总指挥视角统筹六个优化子任务，基于项目真实状况做出取舍决策，避免过度优化。

## 项目诊断结论

### 已完成的优化（无需重复执行）
- ✅ **性能优化**（scientific-performance-optimization）：Context useMemo、React.memo、数据层并行化、懒加载、内存泄漏修复等全部完成
- ✅ **架构审查与重构**（systematic-review-refactor）：文档精简、注释翻译、命名规范、数据迁移审查等全部完成

### 当前问题清单

| 维度 | 状态 | 具体问题 |
|------|------|----------|
| 代码质量 | ⚠️ 需修复 | 2 个测试失败（roamAlphaAPI.updateBlock 未 mock）；`@emotion/babel-plugin` 和 `tailwindcss` 未使用依赖未清理；33 个依赖漏洞（含 2 critical） |
| 开发体验 | ⚠️ 轻微 | 缺少 `.vscode/extensions.json`；`.gitignore` 包含大量无关模板内容 |
| 性能表现 | ✅ 已优化 | 上一轮性能优化已全面完成 |
| 架构健康度 | ✅ 良好 | 上一轮架构审查已全面完成；代码组织清晰，SchedulingAlgorithm × InteractionStyle 正交架构 |
| 测试现状 | ⚠️ 需修复 | 2/119 测试失败；测试质量需审查 |
| 冗余程度 | ⚠️ 轻微 | 构建产物 3.46 MiB 偏大（webpack 警告）；可能存在可清理的冗余资产 |

## What Changes

### 必须执行的任务

1. **代码质量检查与修复**（code-quality-check）
   - 移除未使用依赖 `@emotion/babel-plugin` 和 `tailwindcss`
   - 修复 2 个失败测试（mock 缺失问题）
   - 执行 `npm audit fix` 修复可安全修复的漏洞
   - 补充异步操作 try/catch 错误处理
   - 修复可选链安全性问题
   - 修复 React Hooks 依赖问题

2. **测试补强与回归防护**（test-coverage-hardening，有限范围）
   - 修复失败测试
   - 审查测试质量（假阳性、过度依赖实现细节）
   - 确认 CI 配置正确运行

3. **终态清理与精简**（final-cleanup）
   - 清理死代码与冗余逻辑
   - 文件系统瘦身（临时文件、冗余文档）
   - 注释压缩提纯
   - 全局复查验证

### 可选但建议执行的任务

4. **开发体验与可维护性审查**（dx-maintainability-audit，轻量级）
   - 创建 `.vscode/extensions.json`
   - 精简 `.gitignore`
   - 确认脚本工作流清晰度

### 暂不执行的任务（附理由）

5. ~~**性能优化**（performance-optimization）~~ — 已在 `scientific-performance-optimization` spec 中全面完成，无需重复
6. ~~**架构审查与重构**（architecture-review-refactor）~~ — 已在 `systematic-review-refactor` spec 中全面完成，无需重复

## Impact

- Affected specs: `code-quality-audit-fix`（未执行，将合并入本次）、`scientific-performance-optimization`（已完成，跳过）、`systematic-review-refactor`（已完成，跳过）
- Affected code: `src/utils/testUtils.ts`、`src/hooks/useAutoCollapseBlocks.ts`、`src/hooks/usePracticeData.tsx`、`src/hooks/useBlockInfo.tsx`、`src/hooks/useCachedData.ts`、`src/hooks/useSettings.ts`、`src/hooks/useLineByLineReview.ts`、`src/components/overlay/PracticeOverlay.tsx`、`src/components/overlay/CardBlock.tsx`、`package.json`
- Affected config: `.vscode/extensions.json`（新建）、`.gitignore`（精简）

## ADDED Requirements

### Requirement: 代码质量修复
系统 SHALL 通过所有自动化检查（tsc、eslint、test、build），零错误零警告。

#### Scenario: 测试全部通过
- **WHEN** 运行 `npm test`
- **THEN** 所有测试通过，0 failed

#### Scenario: 依赖清洁
- **WHEN** 检查 package.json
- **THEN** 不存在未使用的依赖包

### Requirement: 终态清理
系统 SHALL 不包含死代码、冗余文件或过时文档。

#### Scenario: 零死代码
- **WHEN** 运行 ESLint no-unused-vars 规则
- **THEN** 零未使用变量/导入警告

#### Scenario: 文件系统精简
- **WHEN** 检查项目根目录
- **THEN** 不存在临时脚本、过时文档、未引用资源

### Requirement: 开发体验基线
系统 SHALL 提供开箱即用的开发环境配置。

#### Scenario: VSCode 推荐插件
- **WHEN** 新成员用 VSCode 打开项目
- **THEN** 自动提示安装推荐插件（ESLint、Prettier）

## MODIFIED Requirements

### Requirement: 异步操作错误处理
所有异步操作（数据获取、设置初始化、评分操作）SHALL 包含 try/catch 错误处理，防止未捕获异常导致白屏。

## REMOVED Requirements

### Requirement: 性能优化（渲染效率、数据层并行化、资源加载、内存泄漏修复）
**Reason**: 已在 `scientific-performance-optimization` spec 中全面完成
**Migration**: 无需迁移，已实现

### Requirement: 架构重构（文档精简、注释翻译、命名规范、数据迁移审查）
**Reason**: 已在 `systematic-review-refactor` spec 中全面完成
**Migration**: 无需迁移，已实现
