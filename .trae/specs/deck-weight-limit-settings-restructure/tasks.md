# Tasks

## Phase 1: 数据模型与设置持久化（无 UI 依赖，可独立进行）

- [x] Task 1: 更新 Settings 类型与默认值
  - [x] 1.1: 在 `src/hooks/useSettings.ts` 中定义 `DeckConfig` 类型：`{ name: string; swapQA: boolean; weight: number }`
  - [x] 1.2: 在 `Settings` 类型中移除 `tagsListString`，新增 `deckConfigs: string`（JSON 字符串）
  - [x] 1.3: 更新 `defaultSettings`：移除 `tagsListString: 'memo'`，新增 `deckConfigs: '[{"name":"memo","swapQA":false,"weight":100}]'`
  - [x] 1.4: 更新 `SETTING_TYPES`：移除 `tagsListString`，新增 `deckConfigs: 'string'`
  - [x] 1.5: 更新 `SettingsFormSettings` 类型：移除 `tagsListString`，新增 `deckConfigs: string`

- [x] Task 2: 更新设置持久化逻辑
  - [x] 2.1: 在 `src/queries/settings.ts` 的 `saveSettingsToPage` 中移除 `tagsListString`，新增 `deckConfigs` 字段持久化
  - [x] 2.2: 在 `loadSettingsFromPage` 中移除 `tagsListString` 解析，新增 `deckConfigs` 解析
  - [x] 2.3: 在 `loadSettingsFromPage` 中添加迁移逻辑：若 `deckConfigs` 不存在但 `tagsListString` 存在，解析 `tagsListString` 生成等分权重的 `deckConfigs`，并写入 extensionAPI

- [x] Task 3: 更新 useTags 从 deckConfigs 解析牌组列表
  - [x] 3.1: 修改 `src/hooks/useTags.tsx`，接收 `deckConfigs` 参数替代 `tagsListString`
  - [x] 3.2: 解析 `deckConfigs` JSON 字符串为 `DeckConfig[]`，提取 `name` 列表作为 `tagsList`
  - [x] 3.3: 保留 DailyNote 追加逻辑（当 `dailynoteEnabled` 为 true 时追加 `DAILYNOTE_DECK_KEY`）
  - [x] 3.4: 更新 `src/app.tsx`，传递 `deckConfigs` 给 `useTags` 替代 `tagsListString`

## Phase 2: 权重分配算法（依赖 Phase 1）

- [x] Task 4: 实现权重重分配工具函数
  - [x] 4.1: 新建 `src/utils/deckWeight.ts`，实现 `redistributeWeights(decks, changedIndex, newWeight)` 函数
  - [x] 4.2: 算法逻辑：计算剩余百分比 = 100 - newWeight，按其他牌组原有权重比例分配剩余百分比
  - [x] 4.3: 取整逻辑：每个分配值使用 `Math.ceil` 向上取整
  - [x] 4.4: 误差修正：若取整后总和偏离 100%，修正差值到当前权重最大的牌组（相同则取列表最前的）
  - [x] 4.5: 实现 `equalizeWeights(deckCount)` 函数：均分 100% 并修正误差
  - [x] 4.6: 实现 `validateWeight(value)` 函数：确保值为 0-100 之间的有效数字

- [x] Task 5: 修改每日限额分配算法
  - [x] 5.1: 修改 `src/queries/data.ts` 的 `limitRemainingPracticeData` 函数签名，新增 `deckConfigs` 参数
  - [x] 5.2: 实现权重分配逻辑：每个牌组限额 = `Math.ceil(dailyLimit * (weight / 100))`
  - [x] 5.3: 每个牌组内部维持约 25% 新卡 / 75% 到期卡比例
  - [x] 5.4: DailyNote 牌组不参与权重分配，从加权牌组分配后的剩余配额获取
  - [x] 5.5: 更新 `getPracticeData` 调用处，传入 `deckConfigs` 参数
  - [x] 5.6: 更新 `src/hooks/usePracticeData.tsx`，传递 `deckConfigs` 给 `getPracticeData`

- [x] Task 6: 更新 initializeToday 读取 renderMode
  - [x] 6.1: 修改 `src/queries/today.ts` 的 `initializeToday`，接收 `deckConfigs` 参数
  - [x] 6.2: 从 `deckConfigs` 中查找对应牌组的 `swapQA` 字段设置 renderMode（swapQA=true → AnswerFirst，否则 Normal）
  - [x] 6.3: 若 deckConfigs 中无对应牌组数据（如 DailyNote），回退到 cachedData 中的 renderMode
  - [x] 6.4: 更新 `getPracticeData` 调用链，传递 `deckConfigs` 给 `initializeToday`

## Phase 3: UI 重构（依赖 Phase 1）

- [x] Task 7: 移除牌组下拉菜单齿轮图标
  - [x] 7.1: 在 `src/components/overlay/Header.tsx` 的 `TagSelectorItem` 中移除齿轮图标按钮（`<Blueprint.Button icon={...cog...}>`）
  - [x] 7.2: 移除 `showTagSettings` 状态和 `toggleTagSettings` 函数
  - [x] 7.3: 移除 `tagSettingsMenu` 变量（包含 Swap Q/A 开关的 Menu 组件）
  - [x] 7.4: 移除 `<Blueprint.Collapse>` 包裹的设置面板
  - [x] 7.5: 移除 `usePracticeSession` 中的 `setRenderMode` 和 `today` 引用（若仅用于齿轮弹窗）

- [x] Task 8: 构建 DeckConfigsTable 组件
  - [x] 8.1: 新建 `src/components/DeckConfigsTable.tsx` 组件
  - [x] 8.2: 实现 3 列表格：牌组名称（纯文本/新增时输入框）、Swap Q/A（Checkbox/Toggle）、权重百分比（number 输入框）
  - [x] 8.3: 实现行选择功能（点击行高亮，记录 selectedIndex 状态）
  - [x] 8.4: 实现操作栏按钮：添加行 (+)、删除行 (-)、上移 (↑)、下移 (↓)
  - [x] 8.5: 添加行逻辑：底部新增行，名称为可编辑输入框，所有牌组重新均分权重
  - [x] 8.6: 删除行逻辑：移除选中行，剩余牌组重新均分权重；仅 1 个牌组时禁止删除
  - [x] 8.7: 上移/下移逻辑：交换选中行与相邻行的位置
  - [x] 8.8: 权重编辑逻辑：修改某行权重时调用 `redistributeWeights` 自动重分配其他牌组权重
  - [x] 8.9: 仅 1 个牌组时权重输入框置灰，锁定为 100%
  - [x] 8.10: 权重输入验证：限制 0-100 范围，非数字输入回退为原值
  - [x] 8.11: 组件通过 props 接收 `deckConfigs` 字符串和 `onChange` 回调，内部管理解析后的状态

- [x] Task 9: 更新 SettingsForm 集成 DeckConfigsTable
  - [x] 9.1: 在 `src/components/SettingsForm.tsx` 中移除 "Tag Pages (Decks)" 板块的 `tagsListString` 文本输入
  - [x] 9.2: 在 "Tag Pages (Decks)" 板块中引入 `DeckConfigsTable` 组件
  - [x] 9.3: 将 `formSettings.deckConfigs` 传递给 `DeckConfigsTable`
  - [x] 9.4: `DeckConfigsTable` 的 `onChange` 回调更新 `formSettings.deckConfigs`
  - [x] 9.5: 移除 `formSettings` 中对 `tagsListString` 的引用

## Phase 4: 数据流整合与清理（依赖 Phase 2 和 Phase 3）

- [x] Task 10: 移除 setRenderMode 运行时函数
  - [x] 10.1: 从 `src/contexts/PracticeSessionContext.tsx` 中移除 `setRenderMode` 相关接口定义和 Provider props
  - [x] 10.2: 从 `src/app.tsx` 中移除 `setRenderMode` 函数定义和传递
  - [x] 10.3: 确认 Header.tsx 中不再引用 `setRenderMode`

- [x] Task 11: 更新 settingsPanelConfig 适配新接口
  - [x] 11.1: 确认 `src/settingsPanelConfig.tsx` 中 `SettingsForm` 正确使用 `deckConfigs` 替代 `tagsListString`
  - [x] 11.2: 确认 `SettingsFormSettings` 类型更新后 settingsPanelConfig 编译通过

- [x] Task 12: 清理 useSettings 中的 tagsListString 引用
  - [x] 12.1: 移除 `src/hooks/useSettings.ts` 中 `tagsListString` 为空时重置为默认值的 useEffect
  - [x] 12.2: 确认所有文件中不再引用 `tagsListString`（除迁移逻辑外）

## Phase 5: 验证（依赖 Phase 1-4）

- [x] Task 13: 运行测试与类型检查
  - [x] 13.1: 运行 `npx jest --no-coverage` 确保所有测试通过
  - [x] 13.2: 运行 `npm run typecheck` 确保类型检查通过
  - [x] 13.3: 修复任何测试或类型错误

# Task Dependencies

- Task 1 (Settings 类型) — 无依赖，可独立进行
- Task 2 (设置持久化) — 依赖 Task 1
- Task 3 (useTags 更新) — 依赖 Task 1
- Task 4 (权重工具函数) — 依赖 Task 1（使用 DeckConfig 类型）
- Task 5 (限额分配算法) — 依赖 Task 1 和 Task 4
- Task 6 (initializeToday) — 依赖 Task 1
- Task 7 (移除齿轮图标) — 无依赖，可与 Phase 1 并行
- Task 8 (DeckConfigsTable) — 依赖 Task 4（使用权重重分配函数）
- Task 9 (SettingsForm 集成) — 依赖 Task 8
- Task 10 (移除 setRenderMode) — 依赖 Task 7 和 Task 6
- Task 11 (settingsPanelConfig) — 依赖 Task 9
- Task 12 (清理引用) — 依赖 Task 3 和 Task 9
- Task 13 (验证) — 依赖所有前置 Task
