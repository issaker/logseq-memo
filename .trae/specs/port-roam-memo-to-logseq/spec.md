# Port roam-memo to Logseq

## Why

将 Roam Research 上的间隔重复插件 `roam-memo` 完整移植到 Logseq，使用户能在 Logseq 中获得完全相同的复习体验。插件的前端交互、算法实现、架构设计保持不变，只替换与 Roam API 耦合的"数据管道"层。

## What Changes

### 保持不变的（抄作业，一字不改）

| 模块 | 路径 | 原因 |
|------|------|------|
| 调度算法 | `src/practice.ts` | 纯函数，SM2/Progressive/Fixed Time 数学逻辑，零平台依赖 |
| Session 模型 | `src/models/session.ts` | Session 数据结构、算法枚举、ReviewStatus、resolveBaseForCalculation |
| 队列策略 | `src/models/practice.ts` | urgency 排序、LBL 文档序扫描、deck 筛选 |
| Review Runtime | `src/review-runtime/` | types / selectors / useReviewRuntime / actions — 纯 React 状态管理 |
| Card Pipeline | `src/hooks/useCardBlock.ts` | 单卡片管道：blockInfo、cloze 守卫、showAnswers |
| LBL 导航 | `src/hooks/useLineByLineReview.ts` | Y 轴子卡片定位、渐进揭示 |
| 当前卡片数据 | `src/hooks/useCurrentCardData.tsx` | latestSession 别名 + optimistic cardMeta |
| UI 组件 | `src/components/` | CardBlock、Header、Footer、LineByLineView、SettingsDialog 等 React 组件 |
| 上下文 | `src/contexts/PracticeSessionContext.tsx` | React Context 定义 |
| 工具函数 | `src/utils/` | date、string、dom、async、deckWeight、mediaQueries |
| 常量 | `src/constants.ts` | 所有常量定义 |
| 测试 | `src/**/*.test.*` | 所有现有测试用例保持运行，为 Logseq 数据层新增对应测试 |

### 需要替换的（Logseq API 适配层）

| 模块 | 当前 Roam 实现 | Logseq 目标 |
|------|---------------|-------------|
| **数据查询** `src/queries/data.ts` | `window.roamAlphaAPI` + `roamBetaAPI` 读写 block | Logseq DB API: `logseq.api.datascript_query` + `logseq.api.get_block` + `logseq.api.get_page` |
| **数据写入** `src/queries/save.ts` | `roamAlphaAPI.updateBlock` / `createBlock` | Logseq API: `logseq.api.update_block` / `logseq.api.insert_block` |
| **今日统计** `src/queries/today.ts` | Roam 页面 session 扫描 + 累加器 | Logseq datascript 查询同等语义，计算结果格式保持一致 |
| **设置存储** `src/queries/settings.ts` | `extensionAPI.settings` + Roam 数据页面备份 | `logseq.settings` + Logseq 数据页面备份 |
| **缓存** `src/queries/cache.ts` | Roam 页面 cache headings | Logseq `logseq.api.set_block_contents` 或 namespace page |
| **插件入口** `src/extension.tsx` | Roam extensionAPI 生命周期 | Logseq plugin lifecycle: `logseq.ready()` / `logseq.App` / `logseq.UI` |
| **应用挂载** `src/app.tsx` | Roam DOM 注入 | Logseq `logseq.App.registerUIItem` / plugin slots |
| **主题系统** `src/theme.ts` | Roam CSS 变量 | Logseq CSS 变量 + plugin CSS 覆盖 |
| **构建配置** `webpack.config.js` | 输出 `extension.js` (ESM) + `standalone.js` (UMD) | 输出 Logseq 插件标准格式，移除 Roam 特有 externals |
| **package.json** | `roam-memo`, Roam 生态 | `logseq-memo`, Logseq 插件元数据（增加 `logseq` 配置 key） |
| **类型定义** `src/@types/global.d.ts` | Roam `extensionAPI` 类型 | Logseq 插件 API 类型 + `logseq` 全局类型 |

### 架构对比图（保持两层架构不变）

```
Roam 版本（现状）                          Logseq 版本（移植后）
┌─────────────────────────────┐           ┌─────────────────────────────┐
│  算法层 (practice.ts)        │   → 不变   │  算法层 (practice.ts)        │
│  Session 模型 (models/)     │   → 不变   │  Session 模型 (models/)     │
│  队列系统 (review-runtime/) │   → 不变   │  队列系统 (review-runtime/) │
│  Card 管道 (hooks/)         │   → 不变   │  Card 管道 (hooks/)         │
│  UI 组件 (components/)      │   → 不变   │  UI 组件 (components/)      │
├─────────────────────────────┤           ├─────────────────────────────┤
│  数据层 (queries/)          │   → 替换   │  数据层 (queries/)          │
│  Roam alphaAPI 调用         │            │  Logseq DB/Block API 调用   │
│  插件入口 (extension.tsx)    │   → 替换   │  插件入口 (extension.tsx)    │
│  Roam extensionAPI 生命周期  │            │  Logseq plugin 生命周期     │
└─────────────────────────────┘           └─────────────────────────────┘
```

### Logseq 数据模型映射

Roam 以 `roam/memo` 页面下的 block tree 存储所有数据。Logseq 中，使用等价的存储策略：

```
Roam 数据结构                              Logseq 映射
────────────────────────                  ────────────────────────
roam/memo (page)                          [[logseq-memo/data]] (page)
├── data (heading 3)                      ├── 根 block（容器）
│   └── ((cardUid))                       │   └── block (uuid = cardUid)
│       ├── [[Date]] 🟢                   │       ├── block 内容为日期字符串
│       │   ├── algorithm:: SM2           │       │   ├── property algorithm:: SM2
│       │   ├── interaction:: NORMAL      │       │   ├── property interaction:: NORMAL
│       │   ├── nextDueDate:: [[Date]]    │       │   ├── property nextDueDate:: 日期
│       │   └── sm2_grade:: 5             │       │   └── property sm2_grade:: 5
│       └── [[Date]] 🔴                   │       └── (同天 Forgot 记录保留)
├── cache (heading 3)                     ├── [[logseq-memo/cache]] (page)
└── settings (heading 3)                  └── [[logseq-memo/settings]] (page)
```

**关键映射原则**：
- Roam 的 `((uid))` 引用 → Logseq 的 `uuid` 属性：每个卡片 block 通过 `uuid` 属性与源 block 关联
- Roam 的 block 属性 → Logseq 的 property：`algorithm:: SM2` 在 Logseq 中直接作为 block property
- Roam 的页面引用 `[[Date]]` → Logseq 的 page reference：`nextDueDate:: [[Apr 30, 2026]]`
- Logseq datascript 原生支持按 property 查询，效率高于遍历 block tree

## Impact

- 受影响的规范: 所有插件规格不变，仅数据访问层适配新平台 API
- 受影响代码:
  - **替换**: `src/queries/`（data.ts, save.ts, today.ts, settings.ts, cache.ts, queries.ts, utils.ts）
  - **替换**: `src/extension.tsx`, `src/app.tsx`
  - **替换**: `webpack.config.js`, `package.json`, `tsconfig.json`
  - **移除**: `standalone.js` 构建目标（Roam roam/js 模式无对应）、`arrive` 依赖（Roam DOM 注入不需要）、`changelog-setup.js`、`changelog-template.hbs`、`scripts/release.sh`
  - **保持不变**: `src/practice.ts`, `src/models/`, `src/review-runtime/`, `src/hooks/`, `src/components/`, `src/contexts/`, `src/utils/`, `src/constants.ts`, `src/theme.ts`, `src/@types/`（global.d.ts 除外）
- 测试影响:
  - 现有 `src/**/*.test.*` 应全部继续通过
  - 新增 `src/queries/*.test.ts` 覆盖 Logseq 数据层
  - 需要增加 Logseq mock 环境来运行数据层测试

## ADDED Requirements

### Requirement: Logseq 数据层替换

The system SHALL 将所有 Roam alphaAPI 调用替换为等价的 Logseq API 调用，保持函数签名和返回值结构不变。

#### Scenario: 读取卡片 Session
- **GIVEN** Logseq 中存在 `[[logseq-memo/data]]` 页面下的复习数据
- **WHEN** `parseLatestSession(cardUid)` 被调用
- **THEN** 从 Logseq datascript 查询最新 session block，返回与 Roam 版本完全一致的 `SessionSnapshot` 结构

#### Scenario: 写入 Session 数据
- **GIVEN** 一次复习评分完成
- **WHEN** `savePracticeData(cardUid, sessionData)` 被调用
- **THEN** 在 `[[logseq-memo/data]]` 页面下创建新 block，写入 session property，与 Roam 版本字段命名一致

#### Scenario: 今日统计计算
- **GIVEN** 有多个 deck 的复习数据
- **WHEN** 计算 `today` 统计
- **THEN** 返回的数据结构与 Roam 版本完全一致（due/new/completed 数量）

#### Scenario: 设置存取
- **GIVEN** Logseq 插件已加载
- **WHEN** 读取或写入设置
- **THEN** 通过 `logseq.settings` 进行，同时在 `[[logseq-memo/settings]]` 页面中保存备份，保持 5 秒防抖

### Requirement: Logseq 插件生命周期

The system SHALL 适配 Logseq 插件生命周期，保持功能入口和交互方式。

#### Scenario: 插件加载
- **GIVEN** 用户启动 Logseq
- **WHEN** 插件被加载
- **THEN** 注册侧边栏入口（`logseq.App.registerUIItem`），监听块交互事件，初始化复习数据

#### Scenario: 打开复习面板
- **GIVEN** 插件已加载
- **WHEN** 用户点击侧边栏入口
- **THEN** 弹出 Practice Overlay 复习面板，UI 和交互与 Roam 版本完全一致

#### Scenario: 标记卡片
- **GIVEN** 用户编辑 Logseq block
- **WHEN** 在 block 中输入 `#memo` tag（或配置的 deck tag）
- **THEN** 该 block 被视为卡片，在复习时出现，行为与 Roam 版本完全一致

## MODIFIED Requirements

无。本移植项目不修改任何已有需求，仅增加 Logseq 平台的适配层。

## REMOVED Requirements

### Requirement: Roam roam/js 加载模式

**Reason**: Logseq 插件有自己固定的加载机制（marketplace 安装或 dev 模式加载），不需要通过 script 标签加载。
**Migration**: 移除 `standalone.js` 构建目标及其相关配置（UMD 格式、library.export、Blueprint CDN 等）。

### Requirement: Roam extensionAPI 兼容层

**Reason**: Logseq 有独立的插件 API（`logseq` 全局对象），不需要 Roam 的 `extensionAPI` 兼容。
**Migration**: 所有 `extensionAPI.settings` 调用替换为 `logseq.settings`，Roam 特有生命周期事件替换为 Logseq 等价事件。
