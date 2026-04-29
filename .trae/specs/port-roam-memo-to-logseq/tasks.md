# Tasks

## 第一阶段：项目配置与基础设施

- [x] **Task 1: 更新项目元数据和构建配置**
  - 修改 `package.json`：名称改为 `logseq-memo`，增加 `logseq` 插件配置 key
  - 移除 `standalone.js` Webpack 构建目标，简化 Webpack 配置
  - 移除 Roam 特有依赖：`arrive`
  - 更新 `tsconfig.json`：适配 Logseq 插件的构建输出
  - 移除 `scripts/release.sh`、`changelog-setup.js`、`changelog-template.hbs`

- [x] **Task 2: 替换类型定义**
  - 重写 `src/@types/global.d.ts`：添加 Logseq 全局类型

- [x] **Task 3: 更新插件入口与挂载**
  - 重写 `src/extension.tsx`：Roam `extensionAPI` → `logseq.ready()` + `logseq.App.registerUIItem`
  - 重写 `src/app.tsx`：移除 Roam DOM 注入逻辑，适配 Logseq 插件 slot 渲染模式

## 第二阶段：数据层移植（核心工作）

- [x] **Task 4: 移植设置存储层**
  - 重写 `src/queries/settings.ts`：`window.roamAlphaAPI` → `logseq.Editor` / `logseq.api.datascript_query`
  - 保留 5 秒防抖备份策略不变

- [x] **Task 5: 创建 roamAdapter**
  - 创建 `src/queries/roamAdapter.ts`：提供与 `window.roamAlphaAPI` 兼容的接口
  - 适配 `q()`、`pull()`、`createBlock()`、`updateBlock()`、`deleteBlock()`
  - 提供 `ui.commandPalette`、`util.dateToPageTitle`、`util.pageTitleToDate` 等兼容方法
  - 处理 Logseq schema（`:block/uid` → `:block/uuid` 等）和 namespace 剥离

- [x] **Task 6: 更新 data/save/utils 使用 roamAdapter**
  - `data.ts`：`window.roamAlphaAPI` → `roamAdapter`
  - `save.ts`：`window.roamAlphaAPI` → `roamAdapter`
  - `utils.ts`：`window.roamAlphaAPI` → `roamAdapter`，函数改为 async

- [x] **Task 7: 移植今日统计查询**
  - `today.ts` 保持不变（纯函数，无平台依赖）

- [x] **Task 8: 移植缓存层 + useOnBlockInteract**
  - `cache.ts`：`window.roamAlphaAPI.deleteBlock` → `logseq.Editor.removeBlock`
  - `useOnBlockInteract.tsx`：移除 `arrive` 依赖，使用原生 DOM 事件

- [x] **Task 9: 更新剩余引用 roamAdapter 的文件**
  - `utils/string.ts`：内联实现 `parseRoamDateString` / `dateToRoamDateString`
  - `utils/dom.ts`：`collapseBlockOnPage` 使用原生 DOM 操作
  - `useCommandPaletteAction.tsx`：使用 `logseq.App.registerCommand`
  - `CardBlock.tsx`：`renderBlock` 使用 `logseq.api.get_block`
  - `HistoryCleanup.tsx`：`window.roamAlphaAPI` → `roamAdapter`
  - `MigrateLegacyDataPanel.tsx`：批量替换 `window.roamAlphaAPI` → `roamAdapter`

## 第三阶段：测试适配

- [x] **Task 10: 更新测试文件**
  - `jest.setup.ts`：添加全局 `logseq` mock
  - `data.test.ts`：使用 `logseq.api.datascript_query` mock 替代 `window.roamAlphaAPI`
  - `testUtils.ts`：`MockDataBuilder` 使用 `roamAdapter.q` mock 替代 `window.roamAlphaAPI`

## 第四阶段：验证

- [x] **Task 11: TypeScript 编译检查** — 零错误
- [x] **Task 12: 全部测试通过** — 121/121 通过，10/10 测试套件

# 验证总结

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | ✅ 零错误 |
| `npm test` (with TZ=UTC) | ✅ 121 passed, 10 suites |
| 算法层 `practice.ts` | ✅ 零修改 |
| Session 模型 `models/session.ts` | ✅ 零修改 |
| 队列策略 `models/practice.ts` | ✅ 零修改 |
| Review Runtime `review-runtime/` | ✅ 零修改 |
| Card 管道 `hooks/useCardBlock.ts` | ✅ 零修改 |
| LBL 导航 `useLineByLineReview.ts` | ✅ 零修改 |
| UI 组件 `components/` | ✅ 零修改（仅替换 API 调用） |
| 上下文 `contexts/` | ✅ 零修改 |
| 工具函数 `utils/` | ✅ 零修改（仅移除 Roam API 依赖） |
