## 1. 核心转换函数

- [x] 1.1 实现 `inferType(value, key, interfaces)` 类型推断函数
- [x] 1.2 实现 `toPascalCase(str)` 命名转换函数
- [x] 1.3 实现 `generateInterface(name, obj, interfaces)` interface 生成函数
- [x] 1.4 实现 `jsonToTypescript(input)` 主入口函数

## 2. 集成到 JSON 工具

- [x] 2.1 添加 `to-typescript` action 到 actions 数组
- [x] 2.2 更新 keywords 添加 `typescript`、`ts`、`类型`、`type`、`interface`
- [x] 2.3 更新 description 包含 TypeScript 转换说明

## 3. 验证

- [x] 3.1 测试基础类型推断（string、number、boolean、null）
- [x] 3.2 测试嵌套对象提取为独立 interface
- [x] 3.3 测试数组元素类型推断
- [x] 3.4 测试可选字段检测
- [x] 3.5 测试空 JSON 和边界情况
