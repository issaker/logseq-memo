# Checklist

## 数据模型与设置持久化

- [x] `DeckConfig` 类型定义在 `src/hooks/useSettings.ts` 中：`{ name: string; swapQA: boolean; weight: number }`
- [x] `Settings` 类型中 `tagsListString` 已移除，`deckConfigs: string` 已添加
- [x] `defaultSettings` 中 `tagsListString` 已移除，`deckConfigs` 默认值为 `'[{"name":"memo","swapQA":false,"weight":100}]'`
- [x] `SETTING_TYPES` 中 `tagsListString` 已移除，`deckConfigs: 'string'` 已添加
- [x] `SettingsFormSettings` 类型中 `tagsListString` 已移除，`deckConfigs` 已添加
- [x] `saveSettingsToPage` 正确持久化 `deckConfigs` 字段
- [x] `loadSettingsFromPage` 正确解析 `deckConfigs` 字段
- [x] 迁移逻辑：`deckConfigs` 为空但 `tagsListString` 有值时，自动生成等分权重的 `deckConfigs`

## useTags 更新

- [x] `useTags` 接收 `deckConfigs` 参数替代 `tagsListString`
- [x] `useTags` 从 `deckConfigs` JSON 解析牌组名称列表
- [x] DailyNote 追加逻辑仍正常工作

## 权重分配算法

- [x] `src/utils/deckWeight.ts` 中 `redistributeWeights` 函数正确实现权重重分配
- [x] 重分配按其他牌组原有权重比例分配剩余百分比
- [x] 每个分配值使用 `Math.ceil` 向上取整
- [x] 误差修正：总和偏离 100% 时修正到权重最大的牌组（相同取最前的）
- [x] `equalizeWeights` 函数正确均分 100% 权重
- [x] `validateWeight` 函数正确验证 0-100 范围
- [x] `limitRemainingPracticeData` 使用权重分配：每牌组限额 = `Math.ceil(dailyLimit * (weight / 100))`
- [x] 每个牌组内部维持约 25% 新卡 / 75% 到期卡比例
- [x] DailyNote 牌组从剩余配额获取卡片
- [x] 全局 `dailyLimit` 为 0 时不限制任何牌组

## initializeToday 更新

- [x] `initializeToday` 从 `deckConfigs` 读取 `swapQA` 设置 renderMode
- [x] `swapQA=true` 对应 `RenderMode.AnswerFirst`，`swapQA=false` 对应 `RenderMode.Normal`
- [x] DailyNote 等不在 deckConfigs 中的牌组回退到 cachedData 的 renderMode

## UI 重构

- [x] Header.tsx 中 `TagSelectorItem` 不再显示齿轮图标
- [x] Header.tsx 中不再有 Swap Q/A 弹窗
- [x] 点击牌组项仅切换活动牌组
- [x] `DeckConfigsTable` 组件正确渲染 3 列表格
- [x] 牌组名称列：已有牌组为纯文本，新增行为可编辑输入框
- [x] Swap Q/A 列：布尔值控件（Checkbox/Toggle）
- [x] 权重百分比列：纯文本数字输入框，无滑块或步进按钮
- [x] 操作栏提供添加行 (+)、删除行 (-)、上移 (↑)、下移 (↓) 按钮
- [x] 添加行后所有牌组重新均分权重
- [x] 删除行后剩余牌组重新均分权重
- [x] 仅 1 个牌组时禁止删除
- [x] 上移/下移正确交换行位置
- [x] 修改权重时自动重分配其他牌组权重
- [x] 仅 1 个牌组时权重输入框置灰锁定为 100%
- [x] 权重输入验证：0-100 范围，无效输入回退
- [x] SettingsForm 中 "Tag Pages (Decks)" 板块使用 `DeckConfigsTable` 替代 `tagsListString` 输入

## 数据流整合与清理

- [x] `PracticeSessionContext` 中 `setRenderMode` 已移除
- [x] `app.tsx` 中 `setRenderMode` 函数已移除
- [x] `settingsPanelConfig.tsx` 正确使用 `deckConfigs` 替代 `tagsListString`
- [x] 所有文件中不再引用 `tagsListString`（迁移逻辑除外）

## 测试与类型检查

- [x] `npx jest --no-coverage` 全部通过
- [x] `npm run typecheck` 无错误
