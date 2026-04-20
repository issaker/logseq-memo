# 修复底部组件"下次复习"日期显示错误：Today → Tomorrow

## 问题描述

底部按钮组件显示"预期下次复习是 Today"，但实际 `nextDueDate` 是明天（如 `[[April 22nd, 2026]]`），应显示 "Tomorrow"。

## 根因分析

问题出在 `daysBetween` 函数（[date.ts:29-32](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/utils/date.ts#L29-L32)）：

```typescript
export const daysBetween = (d1, d2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((d1 - d2) / oneDay));
};
```

该函数直接用原始时间戳的毫秒差除以一天的毫秒数，再用 `Math.floor` 取整。问题在于：

1. `nextDueDate` 从 Roam 日期字符串（如 `"April 22nd, 2026"`）解析后，变成 **4月22日午夜 00:00:00**
2. `new Date()` 是当前时间，如 **4月21日下午 3:00 PM**
3. 两者差值约 9 小时 = 0.375 天
4. `Math.floor(0.375)` = **0** → `formatDaysFromNow` 返回 "Today"

正确做法应该基于**日历天数**比较，而非精确的毫秒差。

## 影响范围

`daysBetween` 被 3 处调用，全部受此 bug 影响：

| 调用位置 | 影响 |
|---|---|
| [Footer.tsx:18](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/Footer.tsx#L18) `formatDaysFromNow` | 按钮显示 "Today" 而非 "Tomorrow" |
| [PracticeOverlay.tsx:204](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/components/overlay/PracticeOverlay.tsx#L204) `isDueToday` | 明天到期的卡片被错误标记为 "dueToday" |
| [date.ts:39](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/utils/date.ts#L39) `customFromNow` | 范围判断可能偏差，但 dayjs 的 calendar() 显示本身正确 |

## 修复方案

修改 `daysBetween` 函数，在计算前将两个日期规范化为当天的午夜（00:00:00），确保比较基于日历天数：

```typescript
export const daysBetween = (d1, d2) => {
  const startOfD1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const startOfD2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((startOfD1 - startOfD2) / oneDay));
};
```

## 实施步骤

1. **修改 `daysBetween` 函数**（[date.ts:29-32](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/utils/date.ts#L29-L32)）
   - 在计算前将两个日期规范化为当天午夜

2. **更新现有测试**（[date.test.ts:52-73](file:///Users/a123/Documents/chengxu%20project/roam-memo-main/src/utils/date.test.ts#L52-L73)）
   - 现有 "Same day" 测试用例仍然会通过（同一天不同时间规范化后差值为 0）
   - 新增测试用例：验证"今天下午 vs 明天午夜"返回 1 而非 0

3. **运行测试验证**
   - 执行 `npm test` 或项目对应的测试命令，确保所有测试通过
