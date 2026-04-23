# 牌组卡片数量限制精细化功能 — 实现计划

## 功能概述

在现有全局 Daily Review Limit 基础上，为每个牌组添加百分比权重设置，实现精细化数量限制。

**计算公式**: 牌组复习数量 = 全局N值 × 牌组X%权重值（向上取整）

---

## 实现步骤

### 步骤1: 数据模型 — 在 Today 类型中添加 deckWeight 字段

**文件**: [practice.ts](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/models/practice.ts)

在 `Today` 类型的每个 tag 结构中添加 `deckWeight: number` 字段：

```typescript
export type Today = {
  tags: {
    [tag: string]: {
      // ... 现有字段
      renderMode: RenderMode;
      deckWeight: number;  // 新增：牌组权重百分比（整数，如 50 表示 50%）
    };
  };
  // ...
};
```

---

### 步骤2: 缓存数据初始化 — 从 cache 读取 deckWeight

**文件**: [today.ts](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/queries/today.ts)

在 `initializeToday` 函数中，从 `cachedData` 读取 `deckWeight`，若不存在则默认为 0（0 表示未设置，后续由权重计算函数统一分配）：

```typescript
today.tags[tag] = {
  // ... 现有字段
  deckWeight: cachedTagData?.deckWeight || 0,
};
```

---

### 步骤3: 权重计算与分配工具函数

**新建工具函数**（添加到 [today.ts](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/queries/today.ts) 或 [practice.ts](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/models/practice.ts)）

实现两个核心函数：

1. **`distributeWeights(tagsList, currentWeights, changedTag, newWeight)`** — 当用户修改某个牌组权重时，按比例调整其他牌组权重，确保总和为 100%
   - 修改的牌组直接设为新值
   - 其他牌组按原有比例重新分配剩余百分比（100% - 新值）
   - 取整为整数百分比，差值补到权重最大的牌组上

2. **`getDefaultWeights(tagsList)`** — 新牌组加入时，均分权重
   - `Math.floor(100 / tagsList.length)` 为每个牌组的权重
   - 差值（100 - sum）补到第一个牌组

---

### 步骤4: 修改 `limitRemainingPracticeData` 核心逻辑

**文件**: [data.ts](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/queries/data.ts)

将现有的 round-robin 公平分配逻辑替换为**按权重分配**逻辑：

**原逻辑**: 所有牌组 round-robin 轮询，25% 新卡 / 75% 复习卡
**新逻辑**: 
1. 计算每个牌组的配额：`deckQuota = Math.ceil(remainingLimit * deckWeight / 100)`
2. 在每个牌组配额内，仍按 25%/75% 分配新卡/复习卡
3. 若某牌组待复习卡片不足其配额，剩余额度按权重分配给其他牌组
4. `dailyLimit = 0` 或 `isCramming` 时仍跳过限制

关键修改点：
- 函数签名不变，仍接收 `{ today, dailyLimit, tagsList, isCramming }`
- 从 `today.tags[tag].deckWeight` 读取每个牌组的权重
- 若所有 deckWeight 为 0（未设置），回退到均分逻辑（兼容初始状态）

---

### 步骤5: Context 层添加 `setDeckWeight` 方法

**文件**: [PracticeSessionContext.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/contexts/PracticeSessionContext.tsx)

在 `PracticeSessionContextValue` 接口中添加：

```typescript
setDeckWeight: (tag: string, weight: number, tagsList: string[]) => void;
```

**文件**: [app.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/app.tsx)

实现 `setDeckWeight`：
1. 调用 `distributeWeights` 计算所有牌组的新权重
2. 遍历所有牌组，调用 `saveCacheData({ deckWeight: newWeight }, { selectedTag: tag })` 保存每个牌组的权重
3. 调用 `fetchCacheData()` 刷新缓存

---

### 步骤6: UI — 在牌组设置菜单中添加权重设置

**文件**: [Header.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/overlay/Header.tsx)

在 `TagSelectorItem` 组件的 `tagSettingsMenu` 中，在 "Swap Q/A" 下方添加 "Deck Weight" 设置项：

```tsx
<Blueprint.MenuItem
  text={
    <div className="flex items-center justify-between">
      <span className="text-xs">Deck Weight</span>
      <div className="flex items-center">
        <Blueprint.Slider
          min={0}
          max={100}
          stepSize={1}
          labelRenderer={false}
          value={tagDeckWeight}
          onChange={(value) => handleDeckWeightChange(value)}
          style={{ width: '80px' }}
        />
        <span className="text-xs ml-1">{tagDeckWeight}%</span>
      </div>
    </div>
  }
  className="hover:bg-transparent hover:no-underline"
/>
```

交互逻辑：
- 仅当全局 `dailyLimit > 0` 时显示权重设置（`dailyLimit = 0` 时权重无意义）
- 修改权重时调用 `setDeckWeight(tag, newWeight, tagsList)`
- 从 `today.tags[text].deckWeight` 读取当前权重

---

### 步骤7: 更新 Daily Review Limit 设置说明

**文件**: [SettingsForm.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/components/SettingsForm.tsx)

更新 Daily Review Limit 的描述文字，说明权重分配逻辑：

```
Number of cards to review each day. 0 means no limit.
When set (>0), each deck's limit = this value × deck weight %.
Adjust deck weights in the deck settings (gear icon).
```

---

### 步骤8: 权重初始化与牌组变更联动

**文件**: [app.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/app.tsx) 或 [usePracticeData.tsx](file:///Users/a123/Documents/chengxu project/roam-memo-main/src/hooks/usePracticeData.tsx)

当 `tagsList` 变化时（新增/删除牌组），需要重新分配权重：
1. 新增牌组：从现有牌组按比例扣减权重给新牌组
2. 删除牌组：将删除牌组的权重按比例分配给剩余牌组
3. 在 `getPracticeData` 流程中，若检测到某牌组 `deckWeight === 0` 且 `dailyLimit > 0`，触发默认权重分配

---

## 涉及文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/models/practice.ts` | 修改 | Today 类型添加 deckWeight 字段 |
| `src/queries/today.ts` | 修改 | initializeToday 读取 deckWeight；新增权重计算工具函数 |
| `src/queries/data.ts` | 修改 | limitRemainingPracticeData 按权重分配 |
| `src/contexts/PracticeSessionContext.tsx` | 修改 | 接口添加 setDeckWeight |
| `src/app.tsx` | 修改 | 实现 setDeckWeight；tagsList 变更时重新分配权重 |
| `src/components/overlay/Header.tsx` | 修改 | 牌组设置菜单添加 Deck Weight 控件 |
| `src/components/SettingsForm.tsx` | 修改 | 更新 Daily Review Limit 说明文字 |

---

## 设计决策说明

1. **存储位置选择 cache 而非 settings**: deckWeight 是 per-tag 的设置，与 renderMode 同类，复用现有 cache 存储机制（`cache → [[tagName]] → deckWeight:: 50`），无需新建存储结构。

2. **权重取整策略**: 整数百分比，差值补到权重最大的牌组。避免小数点复杂性，用户体验更直观。

3. **dailyLimit=0 时隐藏权重**: 权重仅在有限额时才有意义，无限额时显示权重控件会造成用户困惑。

4. **不向后兼容**: 按需求说明，直接更新系统。deckWeight 默认为 0，首次使用时自动均分分配。

5. **权重联动采用按比例缩放**: 修改 A 牌组权重时，其他牌组按原有比例缩放剩余百分比，而非简单均分差值。这样更符合用户直觉——保持了其他牌组间的相对权重关系。
