## Context

Toolkit 的 JSON 处理工具目前有 6 个 action（格式化、压缩、验证、转 YAML、转 XML、提取 Keys）。现在需要新增"转 TypeScript"功能，将 JSON 转换为 TypeScript interface 定义。

## Goals / Non-Goals

**Goals:**
- 输入任意合法 JSON，生成可直接使用的 TypeScript interface 代码
- 嵌套对象自动提取为独立 interface，避免内联过长
- 数组元素是对象时，提取为独立 interface 并使用 `Type[]` 语法
- 类型推断覆盖常见场景（string、number、boolean、null、any、数组、嵌套对象）
- 复用现有 ToolView 组件，无需新增 UI

**Non-Goals:**
- 不支持联合类型（如 `string | number`）
- 不支持泛型推断
- 不支持从 JSON Schema 生成
- 不支持枚举类型推断
- 不支持注释生成

## Decisions

### 1. 类型推断策略

**选择：基于 `typeof` + `Array.isArray` 递归推断**

| JSON 值 | TypeScript 类型 |
|---------|----------------|
| `string` | `string` |
| `number` | `number` |
| `boolean` | `boolean` |
| `null` | `null` |
| `undefined` | `any` |
| `[]` (空数组) | `any[]` |
| `[1,2,3]` | `number[]` |
| `[{...}]` | `InterfaceName[]` |
| `{...}` (对象) | `InterfaceName` |

理由：简单直接，覆盖 90% 常见场景。联合类型和泛型增加复杂度但使用频率低。

### 2. Interface 命名策略

**选择：顶层 `RootObject`，子对象从 key 推断 PascalCase**

- 顶层对象：`RootObject`
- 嵌套对象：取父级 key 转 PascalCase，如 `address` → `Address`
- 数组元素对象：取数组 key 转 PascalCase，如 `scores` → `Scores`
- 重复结构：相同结构的对象只生成一个 interface
- key 冲突：添加数字后缀（`Address2`）

理由：从 key 推断的名称比 `Interface1`、`Interface2` 更具可读性。

### 3. 可选字段处理

**选择：数组中对象类型不一致时，缺失字段标记为可选**

例如：
```json
[{ "name": "A", "age": 25 }, { "name": "B" }]
```
生成：
```typescript
interface Item {
  name: string;
  age?: number;
}
```

理由：保持类型准确性，避免 `any` 滥用。

### 4. Interface 排列顺序

**选择：依赖的 interface 放在前面（拓扑排序）**

例如 `RootObject` 引用了 `Address`，则 `Address` 定义在前。

理由：TypeScript 不要求顺序，但按依赖排列更易读。

## Risks / Trade-offs

1. **复杂嵌套结构**
   - 风险：深度嵌套（>10 层）可能生成过多 interface
   - 缓解：当前实现不做深度限制，实际 JSON 很少超过 5 层

2. **混合类型数组**
   - 风险：`[1, "a", true]` 无法生成精确类型
   - 缓解：退化为 `any[]`，在输出中注明

3. **空值处理**
   - 风险：`null` 值无法推断具体类型
   - 缓解：标记为 `null` 类型，用户可手动修改
