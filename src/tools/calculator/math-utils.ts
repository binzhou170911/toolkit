// Basic arithmetic operations
export function add(a: number, b: number): number {
  return a + b
}

export function subtract(a: number, b: number): number {
  return a - b
}

export function multiply(a: number, b: number): number {
  return a * b
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}

export function percentage(value: number, percent: number): number {
  return value * (percent / 100)
}

export function negate(value: number): number {
  return -value
}

// Scientific functions
export function sin(x: number, isDegree: boolean): number {
  return Math.sin(isDegree ? (x * Math.PI) / 180 : x)
}

export function cos(x: number, isDegree: boolean): number {
  return Math.cos(isDegree ? (x * Math.PI) / 180 : x)
}

export function tan(x: number, isDegree: boolean): number {
  return Math.tan(isDegree ? (x * Math.PI) / 180 : x)
}

export function asin(x: number, isDegree: boolean): number {
  const result = Math.asin(x)
  return isDegree ? (result * 180) / Math.PI : result
}

export function acos(x: number, isDegree: boolean): number {
  const result = Math.acos(x)
  return isDegree ? (result * 180) / Math.PI : result
}

export function atan(x: number, isDegree: boolean): number {
  const result = Math.atan(x)
  return isDegree ? (result * 180) / Math.PI : result
}

export function log(x: number): number {
  return Math.log10(x)
}

export function ln(x: number): number {
  return Math.log(x)
}

export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent)
}

export function square(x: number): number {
  return x * x
}

export function cube(x: number): number {
  return x * x * x
}

export function sqrt(x: number): number {
  return Math.sqrt(x)
}

export function cbrt(x: number): number {
  return Math.cbrt(x)
}

export function factorial(n: number): number {
  if (n < 0) throw new Error('Factorial of negative number')
  if (n === 0 || n === 1) return 1
  if (n > 170) throw new Error('Number too large')
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  return result
}

export const PI = Math.PI
export const E = Math.E

// Programmer functions
export function toBinary(n: number): string {
  return (n >>> 0).toString(2)
}

export function toOctal(n: number): string {
  return (n >>> 0).toString(8)
}

export function toHex(n: number): string {
  return (n >>> 0).toString(16).toUpperCase()
}

export function fromBinary(s: string): number {
  return parseInt(s, 2)
}

export function fromOctal(s: string): number {
  return parseInt(s, 8)
}

export function fromHex(s: string): number {
  return parseInt(s, 16)
}

export function bitwiseAnd(a: number, b: number): number {
  return (a & b) >>> 0
}

export function bitwiseOr(a: number, b: number): number {
  return (a | b) >>> 0
}

export function bitwiseXor(a: number, b: number): number {
  return (a ^ b) >>> 0
}

export function bitwiseNot(a: number): number {
  return (~a) >>> 0
}

export function leftShift(a: number, b: number): number {
  return (a << b) >>> 0
}

export function rightShift(a: number, b: number): number {
  return (a >>> b) >>> 0
}

// Byte conversion
export function bytesToKB(bytes: number): number {
  return bytes / 1024
}

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024)
}

export function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

export function bytesToTB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024 * 1024)
}

export function kbToBytes(kb: number): number {
  return kb * 1024
}

export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024
}

export function gbToBytes(gb: number): number {
  return gb * 1024 * 1024 * 1024
}

export function tbToBytes(tb: number): number {
  return tb * 1024 * 1024 * 1024 * 1024
}
