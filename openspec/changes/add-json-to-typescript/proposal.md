## Why

开发者经常需要根据 JSON 数据手动编写 TypeScript 接口定义，这是一个重复性高且容易出错的过程。在 JSON 处理工具中添加"转 TypeScript"功能，可以一键将 JSON 转换为带类型推断的 TypeScript interface，提升开发效率。

## What Changes

在现有 `json-formatter` 工具中新增第 7 个 action：`to-typescript`。

**功能**：
- 输入 JSON，自动生成 TypeScript interface 定义
- 支持嵌套对象自动提取为独立 interface
- 支持数组元素类型推断
- 支持可选字段检测（数组元素类型不一致时标记 `?:`）
- 基础类型推断：string、number、boolean、null、any

**输出示例**：
```typescript
interface RootObject {
  name: string;
  age: number;
  tags: string[];
  address: Address;
  scores: Scores[];
}

interface Address {
  city: string;
  zip: string;
}

interface Scores {
  math: number;
  eng: number;
}
```

## Capabilities

### Modified Capabilities

- `json-formatter`: 新增 `to-typescript` action，keywords 添加 `typescript`、`ts`、`类型`、`type`、`interface`

## Impact

- **修改文件**：`src/tools/json-formatter/index.ts`
- **新增函数**：`jsonToTypescript()`、`generateInterface()`、`inferType()`
- **新增依赖**：无
- **UI 变更**：action tab 栏新增"转 TypeScript"标签
