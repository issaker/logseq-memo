# 牌组复习限额精细化及设置页重构 Spec

## Why

当前系统的每日复习限额 (`Daily Review Limit`) 是全局统一设置，所有牌组共享同一个限额，无法按牌组重要性分配不同的复习配额。需要将此功能精细化，允许用户为每个牌组设置基于权重的独立复习限额，同时将所有牌组相关配置（名称、Swap Q/A、权重）整合至一个统一的 Excel 风格管理界面中，取代原来分散的 `tagsListString` 文本输入和牌组下拉菜单中的齿轮图标弹窗。

## What Changes

- **BREAKING**：移除 `tagsListString` 设置项，替换为 `deckConfigs`（JSON 字符串，包含牌组名称、Swap Q/A 开关、权重百分比）
- 移除牌组下拉菜单中每个牌组名称旁的小齿轮设置图标及其触发的弹窗功能
- 新建 Excel 风格牌组管理表格组件（`DeckConfigsTable`），包含 3 列：牌组名称、Swap Q/A、权重百分比
- 表格操作栏：添加行 (+)、删除行 (-)、上移 (↑)、下移 (↓)
- 修改每日限额计算逻辑：从全局 round-robin 分配改为基于权重的独立限额分配
- Swap Q/A 设置从 cache 存储迁移至 `deckConfigs` 设置项
- 移除 `setRenderMode` 运行时函数，Swap Q/A 变更随 Apply & Restart 统一生效

## Impact

- Affected specs: Settings Architecture, Multi Deck Support, Daily Limit Algorithm, Cache Architecture
- Affected code:
  - `src/hooks/useSettings.ts` — Settings 类型变更（移除 `tagsListString`，新增 `deckConfigs`）
  - `src/hooks/useTags.tsx` — 从 `deckConfigs` 解析牌组列表，不再解析 `tagsListString`
  - `src/components/SettingsForm.tsx` — 替换 tagsListString 输入为 DeckConfigsTable 组件
  - `src/components/overlay/Header.tsx` — 移除 TagSelectorItem 中的齿轮图标和弹窗
  - `src/queries/data.ts` — `limitRemainingPracticeData` 改为权重分配算法
  - `src/queries/today.ts` — `initializeToday` 从 deckConfigs 读取 renderMode
  - `src/queries/settings.ts` — `saveSettingsToPage` / `loadSettingsFromPage` 适配新字段
  - `src/queries/cache.ts` — renderMode 不再写入 cache（保留读取用于迁移兼容）
  - `src/contexts/PracticeSessionContext.tsx` — 移除 `setRenderMode`
  - `src/app.tsx` — 适配新数据流，移除 setRenderMode 调用
  - `src/settingsPanelConfig.tsx` — 适配新 SettingsForm 接口
  - `src/constants.ts` — 新增 DeckConfig 相关常量

## ADDED Requirements

### Requirement: 牌组权重配置数据模型

系统 SHALL 提供 `deckConfigs` 设置项，存储每个牌组的名称、Swap Q/A 开关和权重百分比配置。

#### Scenario: 数据结构定义
- **WHEN** 查看 Settings 类型定义
- **THEN** 包含 `deckConfigs: string` 字段，值为 JSON.stringify(DeckConfig[])
- **AND** DeckConfig 类型定义为 `{ name: string; swapQA: boolean; weight: number }`
- **AND** `tagsListString` 字段已从 Settings 类型中移除

#### Scenario: 默认值
- **WHEN** 用户首次安装或重置设置
- **THEN** `deckConfigs` 默认为 `'[{"name":"memo","swapQA":false,"weight":100}]'`

#### Scenario: 从 tagsListString 迁移
- **GIVEN** 用户已有 `tagsListString` 设置但无 `deckConfigs`
- **WHEN** 系统加载设置
- **THEN** 自动从 `tagsListString` 解析牌组名称
- **AND** 为每个牌组生成等分权重（总和 100%）
- **AND** 所有牌组的 `swapQA` 默认为 `false`
- **AND** 生成的 `deckConfigs` 保存到 extensionAPI

### Requirement: 基于权重的每日复习限额分配

系统 SHALL 根据每个牌组的权重百分比计算其独立的每日复习卡片数量。

#### Scenario: 权重限额计算
- **GIVEN** 全局 `Daily Review Limit` 设置为 `N` 且 N > 0
- **WHEN** 系统计算单个牌组的每日复习卡片数量
- **THEN** 该牌组的限额为 `Math.ceil(N * (该牌组权重百分比 / 100))`

#### Scenario: 全局限额为 0
- **GIVEN** 全局 `Daily Review Limit` 设置为 0
- **WHEN** 系统计算复习限额
- **THEN** 不限制任何牌组的复习数量，权重设置暂时失效

#### Scenario: DailyNote 牌组的限额处理
- **GIVEN** DailyNote 牌组已启用且全局限额 N > 0
- **WHEN** 系统分配每日复习限额
- **THEN** DailyNote 不参与权重分配，从加权牌组分配后的剩余配额中获取卡片
- **AND** 若加权牌组已用完全局限额，DailyNote 获得 0 张卡片

#### Scenario: 每个牌组内的新卡/到期卡比例
- **GIVEN** 某牌组的权重限额为 L
- **WHEN** 系统分配该牌组的新卡和到期卡
- **THEN** 维持约 25% 新卡 / 75% 到期卡的比例（与现有逻辑一致）

### Requirement: 权重联动与自动重分配

系统 SHALL 确保所有牌组的权重之和始终等于 100%，并在用户修改任一牌组权重时自动重分配剩余权重。

#### Scenario: 修改单个牌组权重
- **GIVEN** 牌组 A (50%)、牌组 B (50%)，用户将 A 改为 30%
- **WHEN** 系统响应权重变更
- **THEN** 剩余额度为 70%，B 自动更新为 70%

#### Scenario: 多牌组按比例重分配
- **GIVEN** 牌组 A (33%)、B (33%)、C (34%)，用户将 A 改为 34%
- **WHEN** 系统响应权重变更
- **THEN** B、C 按原有比例（33:34）瓜分剩余的 66%
- **AND** 经向上取整和误差修正后得出最终数值

#### Scenario: 向上取整与误差修正
- **GIVEN** 重分配后出现小数
- **WHEN** 系统计算最终权重
- **THEN** 每个值采用 `Math.ceil` 向上取整
- **AND** 若取整后总和偏离 100%，自动修正差值
- **AND** 修正优先级：当前权重值最大的牌组优先；若存在多个最大权重相同的牌组，列表排序最靠前（第一行）的牌组优先

#### Scenario: 仅 1 个牌组时权重锁定
- **GIVEN** 牌组列表中只有 1 个牌组
- **WHEN** 显示权重输入框
- **THEN** 权重强制为 100% 且输入框置灰不可修改

#### Scenario: 新增牌组时权重均分
- **GIVEN** 当前有 N 个牌组，用户点击添加行
- **WHEN** 新牌组被添加
- **THEN** 所有牌组（包括新增的）重新均分 100%（即每个牌组权重为 `Math.ceil(100 / (N+1))` 或按比例分配，总和修正为 100%）

#### Scenario: 删除牌组时权重重分配
- **GIVEN** 当前有 N 个牌组，用户删除一个牌组
- **WHEN** 该牌组被移除
- **THEN** 剩余牌组重新均分 100%

#### Scenario: 权重输入验证
- **GIVEN** 用户在权重输入框中输入值
- **WHEN** 输入值不是 0-100 之间的有效数字
- **THEN** 系统拒绝无效输入，保持原值或限制在 0-100 范围内

### Requirement: Excel 风格牌组管理表格

系统 SHALL 在 Memo Settings 的 "Tag Pages (Decks)" 板块中提供一个 Excel 风格的动态表格，替代原有的 tagsListString 文本输入。

#### Scenario: 表格列定义
- **WHEN** 查看牌组管理表格
- **THEN** 表格包含 3 列：牌组名称 (Deck Name)、Swap Q/A 开关、权重百分比 (Weight %)

#### Scenario: 牌组名称列
- **WHEN** 查看已有牌组的名称列
- **THEN** 显示为纯文本（不可直接编辑）
- **AND** 新增行时，名称列为可编辑的文本输入框，设置后变为纯文本

#### Scenario: Swap Q/A 列
- **WHEN** 查看 Swap Q/A 列
- **THEN** 显示为布尔值控件（Toggle / Checkbox）
- **AND** 切换后状态暂存于表单本地状态，等待 Apply & Restart 统一提交

#### Scenario: 权重百分比列
- **WHEN** 查看权重百分比列
- **THEN** 显示为纯文本数字输入框（type="number"）
- **AND** 禁止使用滑块 (Slider) 或步进按钮 (Stepper)
- **AND** 输入值限制在 0-100 之间

#### Scenario: 表格操作栏
- **WHEN** 查看表格下方
- **THEN** 提供添加行 (+)、删除行 (-)、上移 (↑)、下移 (↓) 四个按钮

#### Scenario: 添加行操作
- **WHEN** 用户点击添加行 (+) 按钮
- **THEN** 在表格底部新增一行，名称列为可编辑输入框
- **AND** 所有牌组重新均分 100% 权重

#### Scenario: 删除行操作
- **WHEN** 用户选中某行并点击删除行 (-) 按钮
- **THEN** 该牌组从表格中移除
- **AND** 剩余牌组重新均分 100% 权重
- **AND** 若只剩 1 个牌组，禁止删除

#### Scenario: 上移/下移操作
- **WHEN** 用户选中某行并点击上移 (↑) 或下移 (↓) 按钮
- **THEN** 该行在表格中上移或下移一位
- **AND** 排序影响权重误差修正时的优先级判定

#### Scenario: 行选择
- **WHEN** 用户点击表格中的某一行
- **THEN** 该行被选中（高亮显示）
- **AND** 删除行、上移、下移操作作用于当前选中行

### Requirement: 移除牌组下拉菜单齿轮图标

系统 SHALL 移除牌组下拉菜单中每个牌组名称旁的小齿轮设置图标及其触发的弹窗功能。

#### Scenario: 下拉菜单仅保留切换功能
- **WHEN** 用户打开牌组下拉菜单
- **THEN** 每个牌组项仅显示牌组名称和 due/new 计数标签
- **AND** 不显示齿轮图标
- **AND** 不显示 Swap Q/A 弹窗

#### Scenario: 点击牌组项切换活动牌组
- **WHEN** 用户点击牌组下拉菜单中的某个牌组
- **THEN** 当前活动牌组切换为该牌组
- **AND** 下拉菜单关闭

## MODIFIED Requirements

### Requirement: Settings Architecture

原设置架构使用 `tagsListString` 存储牌组列表。修改为：

- 移除 `tagsListString` 设置项
- 新增 `deckConfigs` 设置项（JSON 字符串），包含牌组名称、Swap Q/A、权重
- `useTags` 从 `deckConfigs` 解析 `tagsList`，而非从 `tagsListString`
- 迁移逻辑：首次加载时若 `deckConfigs` 为空但 `tagsListString` 有值，自动生成 `deckConfigs`

### Requirement: Daily Limit Algorithm

原 `limitRemainingPracticeData` 使用全局 round-robin 方式在所有牌组间均匀分配每日限额。修改为：

- 每个牌组的限额基于权重计算：`Math.ceil(dailyLimit * (weight / 100))`
- 每个牌组内部仍维持约 25% 新卡 / 75% 到期卡的比例
- DailyNote 牌组不参与权重分配，从剩余配额获取卡片
- 函数签名新增 `deckConfigs` 参数以获取权重信息

### Requirement: RenderMode Storage

原 renderMode (Swap Q/A) 存储在 Roam 数据页的 cache 区域，通过 `setRenderMode` 运行时函数实时修改。修改为：

- renderMode 从 `deckConfigs` 中的 `swapQA` 字段读取
- `initializeToday` 从 settings 的 deckConfigs 获取 renderMode，而非从 cachedData
- 移除 `setRenderMode` 运行时函数
- Swap Q/A 变更随 Apply & Restart 统一生效
- 保留 cache 中 renderMode 的读取能力作为迁移兼容（当 deckConfigs 中无对应牌组数据时回退到 cache）

## REMOVED Requirements

### Requirement: tagsListString 设置项
**Reason**: 被 `deckConfigs` 替代，牌组列表现在由结构化数据驱动而非逗号分隔字符串
**Migration**: 首次加载时自动从 `tagsListString` 生成 `deckConfigs`，等分权重，swapQA 默认 false

### Requirement: 牌组下拉菜单齿轮图标设置
**Reason**: Swap Q/A 设置已整合至设置页的牌组管理表格中，无需在下拉菜单中重复提供
**Migration**: 用户需在 Memo Settings 的牌组管理表格中配置 Swap Q/A，而非在复习界面的下拉菜单中
