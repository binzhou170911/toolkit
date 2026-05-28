## Why

用户需要在桌面工具应用中添加计算器功能，这是日常工作中最常用的工具之一。目前应用已支持文档格式转换、JSON 处理、文本编解码等工具，但缺少计算相关的功能。添加计算器可以进一步提升工具的实用性，满足用户在不同场景下的计算需求。

## What Changes

添加计算器工具，支持以下功能模块：

**基础计算器**
- 加减乘除 (+, -, ×, ÷)
- 百分比 (%)
- 正负号 (±)
- 小数点
- 退格/清除
- 记忆功能 (M+, M-, MR, MC)

**科学计算器**
- 三角函数 (sin, cos, tan)
- 反三角函数 (asin, acos, atan)
- 对数 (log, ln)
- 幂运算 (x², x³, xⁿ)
- 根号 (√, ∛)
- 阶乘 (n!)
- 常数 (π, e)
- 弧度/角度切换

**程序员计算器**
- 进制转换 (BIN, OCT, DEC, HEX)
- 位运算 (AND, OR, XOR, NOT, LSH, RSH)
- 字节转换 (Byte, KB, MB, GB, TB)

**单位转换**
- 长度 (m, km, mile, inch, ft, cm, mm)
- 重量 (kg, lb, oz, g, ton)
- 温度 (°C, °F, K)
- 面积 (m², km², acre, ha)
- 体积 (L, mL, gal, m³)

**日期计算**
- 日期加减天数

**金融计算**
- 贷款月供计算
- 利息计算 (单利/复利)

## Capabilities

### New Capabilities

- `calculator`: 计算器工具，支持基础计算、科学计算、程序员计算、单位转换、日期计算、金融计算等功能

### Modified Capabilities

无

## Impact

- **新增组件**：CalculatorView, BasicCalculator, ScientificCalculator, ProgrammerCalculator, UnitConverter, DateCalculator, FinancialCalculator
- **新增工具函数**：math-utils.ts, unit-converter.ts, date-utils.ts, financial-utils.ts
- **无新增依赖**：使用纯 JavaScript/TypeScript 实现所有计算功能
- **界面设计**：采用标签切换方式，支持多种计算器模式
