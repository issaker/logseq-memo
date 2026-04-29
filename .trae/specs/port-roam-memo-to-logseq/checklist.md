# Checklist

## 项目配置

- [x] `package.json` 已更新为 Logseq 插件格式（名称、logseq key、scripts）
- [x] Webpack 配置已移除 standalone 构建目标
- [x] Roam 特有依赖（`arrive` 等）已移除
- [x] Logseq 类型定义已添加到 `src/@types/global.d.ts`
- [x] 插件入口 `extension.tsx` 使用 `logseq.ready()` 启动
- [x] 插件挂载 `app.tsx` 使用 Logseq registerUIItem 模式
- [x] `tsconfig.json` 构建配置正确
- [x] TypeScript 编译零错误通过

## 数据层 — 设置

- [x] 设置通过 `logseq.settings` 读写
- [x] 设置备份写入 `[[logseq-memo/settings]]` 页面
- [x] 5 秒防抖备份策略保留
- [x] 设置结构（deckConfigs、dataPageTitle、tagsList 等）保持不变

## 数据层 — 查询

- [x] `parseLatestSession(uid)` 返回与 Roam 版本完全一致的 `SessionSnapshot` 结构
- [x] `getBlockByUid(uid)` 使用 `logseq.api.get_block` 实现
- [x] 所有查询函数签名与 Roam 版本一致（通过适配器）

## 数据层 — 写入

- [x] `savePracticeData(uid, session)` 在 `[[logseq-memo/data]]` 下创建新 session block
- [x] session property 命名保持 `{owner}_{purpose}` 格式（`sm2_*`、`progressive_*`、`fixed_*`）

## 数据层 — 今日统计

- [x] `today` 返回结构与 Roam 版本一致（due/new/completed 数量）
- [x] round-robin 分布逻辑不变

## 数据层 — 缓存

- [x] `[[logseq-memo/cache]]` 页面存储缓存数据
- [x] 缓存读写逻辑与 Roam 版本一致

## 不变模块验证

- [x] `src/practice.ts` 所有调度算法（SM2/Progressive/Fixed Time）零修改
- [x] `src/models/session.ts` Session 模型零修改
- [x] `src/models/practice.ts` 队列策略零修改
- [x] `src/review-runtime/` types/selectors/useReviewRuntime/actions 零修改
- [x] `src/hooks/useCardBlock.ts` Card 管道零修改
- [x] `src/hooks/useLineByLineReview.ts` LBL 导航零修改
- [x] `src/hooks/useCurrentCardData.tsx` 零修改
- [x] `src/components/` 所有 UI 组件零修改（仅替换底层 API 调用）
- [x] `src/contexts/PracticeSessionContext.tsx` 零修改
- [x] `src/utils/` 所有工具函数零修改（仅移除 Roam API 依赖）
- [x] `src/constants.ts` 零修改
- [x] 所有原有测试用例通过（121/121）

## 构建验证

- [x] `npx tsc --noEmit` — 零错误
- [x] `TZ=UTC npx jest --runInBand` — 121 passed, 10 suites
