# Bug 修复计划 — 权重输入框无法编辑 & 撤销自动填充补丁

## Bug 1: 牌组权重输入框无法修改数字 + 上下箭头遮挡

**根因分析**:
- `Blueprint.InputGroup` 放在 `Blueprint.MenuItem` 的 `text` 属性内部，MenuItem 会拦截输入框的交互事件（点击、聚焦等），导致输入框无法正常编辑
- `type="number"` 的原生上下箭头控件在 60px 窄宽度内遮挡数字显示

**修复方案**:
1. 将 `type="number"` 改为 `type="text"`，彻底去掉浏览器原生的数字上下箭头控件
2. 使用 `Blueprint.InputGroup` 的 `inputStyle` 设置宽度，让输入框和 `%` 后缀合理排列
3. 在 `onChange` 中手动过滤非数字字符，确保只接受数字输入
4. 关键：在 InputGroup 外层添加 `onClick={(e) => e.stopPropagation()}` 阻止事件冒泡到 MenuItem，解决输入框无法聚焦的根本问题

**修改文件**: `src/components/overlay/Header.tsx`

替换为：
```tsx
<div onClick={(e) => e.stopPropagation()}>
  <Blueprint.InputGroup
    type="text"
    value={String(tagDeckWeight)}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      const value = Math.min(100, Math.max(0, Number(raw) || 0));
      setDeckWeight(text, value, tagsList);
    }}
    rightElement={<span className="text-xs" style={{ lineHeight: '30px', paddingRight: '8px' }}>%</span>}
    style={{ width: '60px' }}
    small
  />
</div>
```

---

## Bug 2: 撤销自动填充补丁

**根因分析**:
- Safari 浏览器对 `autoComplete="off"` 支持不佳，仍会触发自动填充
- "Reinsert Forgot Cards" 和 "Reinsert LBL Next" 没有自动填充问题，说明该问题难以通过简单属性解决
- 用户要求撤销之前添加的 `autoComplete="off"` 补丁

**修复方案**:
- 撤销 `SettingsForm.tsx` 中 3 个 `<input>` 上添加的 `autoComplete="off"` 属性

**修改文件**: `src/components/SettingsForm.tsx`
