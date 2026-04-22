# 计划：roam-memo 插件四个问题的分析与修改

## 问题 1：cache block 的意义及是否可删除

### 分析结论
**cache block 有实际意义，不应删除。**

当前 cache block 在数据页 `roam/memo` 下存储了每个 tag（牌组）的 `renderMode` 配置（值为 `normal` 或 `answerFirst`）。数据流如下：

1. **写入**：用户在标签选择器中切换 "Swap Q/A" 时，通过 `saveCacheData()` 将 `renderMode` 写入数据页的 `cache` heading block 下
2. **读取**：`getPluginPageCachedData()` 从数据页读取 cache 数据，经 `mapPluginPageCachedData()` 解析后返回
3. **消费**：`initializeToday()` 从 `cachedData` 中读取每个 tag 的 `renderMode`，用于控制卡片是"先显示问题"还是"先显示答案"

涉及文件：
- [cache.ts](src/queries/cache.ts) — cache 的创建/写入/删除
- [data.ts](src/queries/data.ts) — cache 的读取
- [today.ts](src/queries/today.ts) — 消费 cache 中的 renderMode
- [useCachedData.ts](src/hooks/useCachedData.ts) — React Hook 封装
- [Header.tsx](src/components/overlay/Header.tsx) — UI 层切换 renderMode

**结论**：cache block 是持久化存储 tag 级别配置的机制，目前存储 `renderMode`。虽然目前只存了一个字段，但它是一个可扩展的缓存层设计，删除会导致 renderMode 设置无法持久化。**建议保留。**

---

## 问题 2：RTL 功能只实现了文字右对齐，未实现真正的从右到左阅读

### 分析结论
当前 RTL 实现仅在 [PracticeOverlay.tsx:677](src/components/overlay/PracticeOverlay.tsx#L677) 对 `DialogBody` 设置了 `dir="rtl"` 属性：

```tsx
<DialogBody
  className="bp3-dialog-body overflow-y-scroll m-0 pt-6 pb-8 px-4"
  dir={rtlEnabled ? 'rtl' : undefined}
>
```

**问题**：HTML `dir="rtl"` 属性确实会实现：
- ✅ 文本右对齐
- ✅ 块级元素的排列方向从右到左
- ✅ 内联文本的 bidi 算法（对于阿拉伯语、希伯来语等本身就是 RTL 的文字，会正确显示）

**但不会实现**：
- ❌ 将 LTR 文字（如英文、中文）的内容镜像为从右往左读的效果

**这是正确的行为**。`dir="rtl"` 的设计目的是为阿拉伯语、希伯来语等 RTL 语言提供正确的排版支持，而不是将 LTR 文字镜像翻转。如果用户使用的是中文/英文等 LTR 语言，`dir="rtl"` 只会改变布局方向（对齐、排列），不会改变文字本身的阅读方向。

**建议**：当前实现是标准的 RTL 支持方式，符合 HTML 规范。如果用户期望的是"将 LTR 文字内容镜像为从右往左读"，这本身不符合 RTL 的语义。但可以考虑在设置说明中更明确地说明 RTL 功能的适用场景（仅适用于阿拉伯语、希伯来语等 RTL 语言），避免用户误解。

### 修改计划
- 在 [SettingsForm.tsx](src/components/SettingsForm.tsx) 中更新 RTL 设置的描述文字，明确说明此功能适用于阿拉伯语、希伯来语等 RTL 语言，不会镜像 LTR 文字内容

---

## 问题 3：状态栏 L2/3 (2 due) 标记的含义及位置调整

### 含义解释
`L2/3 (2 due)` 标记仅在 LBL（Line by Line）模式下显示，含义为：
- **L**：Line by Line 模式的缩写
- **2/3**：当前正在复习第 2 个子块，共 3 个子块
- **(2 due)**：3 个子块中有 2 个到期需要复习

数据来源：
- `lineByLineCurrentIndex` = `lineByLineCurrentChildIndex + 1`（当前子块序号，1-based）
- `lineByLineTotal` = `childUidsList.length`（子块总数）
- `lineByLineDueCount` = `dueChildCount`（到期子块数）

### 当前位置
在 [Header.tsx:338-341](src/components/overlay/Header.tsx#L338-L341)，L2/3 标记位于状态栏右侧区域的**最左边**（在面包屑按钮、设置按钮、ModeBadge、StatusBadge 之前）：

当前顺序：`[L2/3] [👁] [⚙] [SM2][LBL] [New/Due Today/Past Due] [3/78] [✕]`

### 建议调整
用户建议将 L2/3 标记移到 LBL 标记的右侧、Due Today 的左侧，这在逻辑上更合理，因为 L2/3 是 LBL 模式的详细信息，应该紧跟在 LBL 标记后面。

调整后顺序：`[👁] [⚙] [SM2][LBL] [L2/3] [New/Due Today/Past Due] [3/78] [✕]`

### 修改计划
- 修改 [Header.tsx](src/components/overlay/Header.tsx) 中状态栏的元素排列顺序，将 L2/3 标记从当前位置移到 ModeBadge 之后、StatusBadge 之前

---

## 问题 4：队列数量超出总队列数的原因（如 87/78）

### 分析结论
**根本原因：卡片重新插入机制导致 `currentDisplayCount` 和 `remainingTodayCount` 使用了不同的数据源。**

计算公式（[Header.tsx:319-323](src/components/overlay/Header.tsx#L319-L323)）：

| 显示项 | 公式 | 数据源 |
|--------|------|--------|
| 当前位置（分子） | `completedTodayCount + currentIndex + 1` | `currentIndex` 基于 `cardQueue` 数组的实际索引 |
| 总数（分母） | `todaySelectedTag.due + todaySelectedTag.new` | 初始计算的 due + new 数量 |

**导致不一致的两种重新插入机制**：

1. **Forgot 重新插入**（[PracticeOverlay.tsx:424-431](src/components/overlay/PracticeOverlay.tsx#L424-L431)）：评分 0 时，当前卡片被重新插入到 `currentIndex + 1 + forgotReinsertOffset` 位置，`cardQueue` 长度增加
2. **LBL Read 重新插入**（[useLineByLineReview.ts:206-213](src/hooks/useLineByLineReview.ts#L206-L213)）：LBL 非评分模式下，当前 LBL 卡片被重新插入到 `currentIndex + 1 + lblNextReinsertOffset` 位置，`cardQueue` 长度增加

**每次重新插入都会使 `cardQueue` 增长**，`currentIndex` 可以超过初始的 `due + new` 总数，但 `remainingTodayCount` 始终是初始值，不会随重新插入而更新。

### 修改计划
修改 [Header.tsx](src/components/overlay/Header.tsx) 中的计数逻辑，使总数（分母）反映实际的队列长度而非初始的 due + new 数量：

- 将 `remainingTodayCount` 从 `todaySelectedTag.due + todaySelectedTag.new` 改为 `completedTodayCount + cardQueue.length`，这样分母会包含重新插入的卡片，确保分子不会超过分母
- 需要将 `cardQueue.length` 从 PracticeOverlay 通过 MainContext 传递到 Header，或者直接使用 `currentIndex` 所在的队列长度

具体实现：
1. 在 [PracticeOverlay.tsx](src/components/overlay/PracticeOverlay.tsx) 的 `mainContextValue` 中添加 `cardQueueLength: cardQueue.length`
2. 在 [MainContext](src/components/overlay/PracticeOverlay.tsx) 的类型定义中添加 `cardQueueLength`
3. 在 [Header.tsx](src/components/overlay/Header.tsx) 中从 MainContext 获取 `cardQueueLength`，将 `remainingTodayCount` 改为 `completedTodayCount + cardQueueLength`

---

## 实施步骤

1. **修改 SettingsForm.tsx** — 更新 RTL 设置的描述文字
2. **修改 Header.tsx** — 调整 L2/3 标记位置（移到 ModeBadge 之后、StatusBadge 之前）
3. **修改 PracticeOverlay.tsx** — 在 MainContext 中添加 `cardQueueLength`
4. **修改 Header.tsx** — 使用 `cardQueueLength` 修正队列总数显示
