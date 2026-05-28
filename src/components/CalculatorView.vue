<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { convertLength, convertWeight, convertTemperature, convertArea, convertVolume, getLengthUnits, getWeightUnits, getTemperatureUnits, getAreaUnits, getVolumeUnits } from '../tools/calculator/unit-converter'
import { addDays, subtractDays, getDayOfWeek, getToday } from '../tools/calculator/date-utils'
import { calculateMonthlyPayment, calculateSimpleInterest, calculateCompoundInterest } from '../tools/calculator/financial-utils'

const emit = defineEmits<{
  back: []
}>()

type CalculatorMode = 'basic' | 'scientific' | 'programmer' | 'unit' | 'date' | 'financial'

const currentMode = ref<CalculatorMode>('basic')
const display = ref('0')
const previousValue = ref<number | null>(null)
const operation = ref<string | null>(null)
const waitingForOperand = ref(false)
const memory = ref(0)
const isDegree = ref(true)

// Basic calculator functions
function inputDigit(digit: string) {
  if (waitingForOperand.value) {
    display.value = digit
    waitingForOperand.value = false
  } else {
    display.value = display.value === '0' ? digit : display.value + digit
  }
}

function inputDecimal() {
  if (waitingForOperand.value) {
    display.value = '0.'
    waitingForOperand.value = false
    return
  }

  if (!display.value.includes('.')) {
    display.value += '.'
  }
}

function clear() {
  display.value = '0'
  previousValue.value = null
  operation.value = null
  waitingForOperand.value = false
}

function backspace() {
  if (display.value.length > 1) {
    display.value = display.value.slice(0, -1)
  } else {
    display.value = '0'
  }
}

function toggleSign() {
  const value = parseFloat(display.value)
  display.value = String(-value)
}

function inputPercent() {
  const value = parseFloat(display.value)
  display.value = String(value / 100)
}

function performOperation(nextOperation: string) {
  const inputValue = parseFloat(display.value)

  if (previousValue.value === null) {
    previousValue.value = inputValue
  } else if (operation.value) {
    const currentValue = previousValue.value
    let result: number

    switch (operation.value) {
      case '+':
        result = currentValue + inputValue
        break
      case '-':
        result = currentValue - inputValue
        break
      case '×':
        result = currentValue * inputValue
        break
      case '÷':
        result = inputValue !== 0 ? currentValue / inputValue : NaN
        break
      default:
        result = inputValue
    }

    previousValue.value = result
    display.value = String(result)
  }

  waitingForOperand.value = true
  operation.value = nextOperation
}

function calculate() {
  if (operation.value && previousValue.value !== null) {
    performOperation('=')
    operation.value = null
    previousValue.value = null
    waitingForOperand.value = true
  }
}

// Memory functions
function memoryAdd() {
  memory.value += parseFloat(display.value)
}

function memorySubtract() {
  memory.value -= parseFloat(display.value)
}

function memoryRecall() {
  display.value = String(memory.value)
  waitingForOperand.value = true
}

function memoryClear() {
  memory.value = 0
}

// Scientific functions
function scientificOperation(op: string) {
  const value = parseFloat(display.value)
  let result: number

  switch (op) {
    case 'sin':
      result = Math.sin(isDegree.value ? (value * Math.PI) / 180 : value)
      break
    case 'cos':
      result = Math.cos(isDegree.value ? (value * Math.PI) / 180 : value)
      break
    case 'tan':
      result = Math.tan(isDegree.value ? (value * Math.PI) / 180 : value)
      break
    case 'asin':
      result = Math.asin(value)
      if (isDegree.value) result = (result * 180) / Math.PI
      break
    case 'acos':
      result = Math.acos(value)
      if (isDegree.value) result = (result * 180) / Math.PI
      break
    case 'atan':
      result = Math.atan(value)
      if (isDegree.value) result = (result * 180) / Math.PI
      break
    case 'log':
      result = Math.log10(value)
      break
    case 'ln':
      result = Math.log(value)
      break
    case 'x²':
      result = value * value
      break
    case 'x³':
      result = value * value * value
      break
    case '√':
      result = Math.sqrt(value)
      break
    case '∛':
      result = Math.cbrt(value)
      break
    case 'n!':
      result = factorial(value)
      break
    case '1/x':
      result = 1 / value
      break
    default:
      result = value
  }

  display.value = String(result)
  waitingForOperand.value = true
}

function factorial(n: number): number {
  if (n < 0) return NaN
  if (n === 0 || n === 1) return 1
  if (n > 170) return Infinity
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  return result
}

function inputConstant(constant: string) {
  switch (constant) {
    case 'π':
      display.value = String(Math.PI)
      break
    case 'e':
      display.value = String(Math.E)
      break
  }
  waitingForOperand.value = true
}

function toggleAngleMode() {
  isDegree.value = !isDegree.value
}

// Programmer functions
const currentBase = ref<'DEC' | 'HEX' | 'OCT' | 'BIN'>('DEC')

function convertBase(toBase: 'DEC' | 'HEX' | 'OCT' | 'BIN') {
  const value = parseInt(display.value)
  if (isNaN(value)) return

  switch (toBase) {
    case 'DEC':
      display.value = String(value)
      break
    case 'HEX':
      display.value = value.toString(16).toUpperCase()
      break
    case 'OCT':
      display.value = value.toString(8)
      break
    case 'BIN':
      display.value = value.toString(2)
      break
  }

  currentBase.value = toBase
}

function bitwiseOperation(op: string) {
  const value = parseInt(display.value)
  if (isNaN(value)) return

  // Store for next operand
  if (previousValue.value === null) {
    previousValue.value = value
    operation.value = op
    waitingForOperand.value = true
    return
  }

  const result = performBitwiseOp(previousValue.value, value, op)
  display.value = String(result)
  previousValue.value = null
  operation.value = null
  waitingForOperand.value = true
}

function performBitwiseOp(a: number, b: number, op: string): number {
  switch (op) {
    case 'AND':
      return (a & b) >>> 0
    case 'OR':
      return (a | b) >>> 0
    case 'XOR':
      return (a ^ b) >>> 0
    case 'LSH':
      return (a << b) >>> 0
    case 'RSH':
      return (a >>> b) >>> 0
    default:
      return b
  }
}

function bitwiseNot() {
  const value = parseInt(display.value)
  display.value = String((~value) >>> 0)
  waitingForOperand.value = true
}

// Keyboard support
function handleKeydown(event: KeyboardEvent) {
  const { key } = event

  if (key >= '0' && key <= '9') {
    event.preventDefault()
    inputDigit(key)
  } else if (key === '.') {
    event.preventDefault()
    inputDecimal()
  } else if (key === '+') {
    event.preventDefault()
    performOperation('+')
  } else if (key === '-') {
    event.preventDefault()
    performOperation('-')
  } else if (key === '*') {
    event.preventDefault()
    performOperation('×')
  } else if (key === '/') {
    event.preventDefault()
    performOperation('÷')
  } else if (key === 'Enter' || key === '=') {
    event.preventDefault()
    calculate()
  } else if (key === 'Escape') {
    event.preventDefault()
    clear()
  } else if (key === 'Backspace') {
    event.preventDefault()
    backspace()
  } else if (key === '%') {
    event.preventDefault()
    inputPercent()
  }
}

// Unit Converter state
const unitCategory = ref<'length' | 'weight' | 'temperature' | 'area' | 'volume'>('length')
const unitFrom = ref('')
const unitTo = ref('')
const unitInputValue = ref('1')
const unitResult = computed(() => {
  const value = parseFloat(unitInputValue.value)
  if (isNaN(value)) return ''

  try {
    let result: number
    switch (unitCategory.value) {
      case 'length':
        result = convertLength(value, unitFrom.value, unitTo.value)
        break
      case 'weight':
        result = convertWeight(value, unitFrom.value, unitTo.value)
        break
      case 'temperature':
        result = convertTemperature(value, unitFrom.value, unitTo.value)
        break
      case 'area':
        result = convertArea(value, unitFrom.value, unitTo.value)
        break
      case 'volume':
        result = convertVolume(value, unitFrom.value, unitTo.value)
        break
      default:
        return ''
    }
    return result.toFixed(6).replace(/\.?0+$/, '')
  } catch {
    return 'Error'
  }
})

const unitOptions = computed(() => {
  switch (unitCategory.value) {
    case 'length': return getLengthUnits()
    case 'weight': return getWeightUnits()
    case 'temperature': return getTemperatureUnits()
    case 'area': return getAreaUnits()
    case 'volume': return getVolumeUnits()
    default: return []
  }
})

function setUnitCategory(category: typeof unitCategory.value) {
  unitCategory.value = category
  const units = unitOptions.value
  unitFrom.value = units[0] || ''
  unitTo.value = units[1] || units[0] || ''
}

// Initialize unit defaults
setUnitCategory('length')

function swapUnits() {
  const temp = unitFrom.value
  unitFrom.value = unitTo.value
  unitTo.value = temp
}

// Date Calculator state
const dateMode = ref<'add' | 'subtract' | 'weekday'>('add')
const dateInput = ref(getToday())
const dateDays = ref('30')
const dateResult = computed(() => {
  if (!dateInput.value) return null

  try {
    if (dateMode.value === 'weekday') {
      return {
        dayOfWeek: getDayOfWeek(dateInput.value)
      }
    }

    const days = parseInt(dateDays.value)
    if (isNaN(days)) return null

    const resultDate = dateMode.value === 'add'
      ? addDays(dateInput.value, days)
      : subtractDays(dateInput.value, days)

    return {
      resultDate,
      dayOfWeek: getDayOfWeek(resultDate)
    }
  } catch {
    return null
  }
})

// Financial Calculator state
const financialMode = ref<'loan' | 'simple' | 'compound'>('loan')
const loanPrincipal = ref('100000')
const loanRate = ref('4.5')
const loanYears = ref('30')
const loanResult = computed(() => {
  const principal = parseFloat(loanPrincipal.value)
  const rate = parseFloat(loanRate.value)
  const years = parseInt(loanYears.value)
  if (isNaN(principal) || isNaN(rate) || isNaN(years)) return null
  return calculateMonthlyPayment(principal, rate, years)
})

const simplePrincipal = ref('10000')
const simpleRate = ref('5')
const simpleYears = ref('3')
const simpleResult = computed(() => {
  const principal = parseFloat(simplePrincipal.value)
  const rate = parseFloat(simpleRate.value)
  const years = parseInt(simpleYears.value)
  if (isNaN(principal) || isNaN(rate) || isNaN(years)) return null
  return calculateSimpleInterest(principal, rate, years)
})

const compoundPrincipal = ref('10000')
const compoundRate = ref('5')
const compoundYears = ref('3')
const compoundCompoundsPerYear = ref('12')
const compoundResult = computed(() => {
  const principal = parseFloat(compoundPrincipal.value)
  const rate = parseFloat(compoundRate.value)
  const years = parseInt(compoundYears.value)
  const compounds = parseInt(compoundCompoundsPerYear.value)
  if (isNaN(principal) || isNaN(rate) || isNaN(years) || isNaN(compounds)) return null
  return calculateCompoundInterest(principal, rate, years, compounds)
})

const modes = [
  { id: 'basic' as CalculatorMode, name: '基础', icon: '🔢' },
  { id: 'scientific' as CalculatorMode, name: '科学', icon: '🔬' },
  { id: 'programmer' as CalculatorMode, name: '程序员', icon: '💻' },
  { id: 'unit' as CalculatorMode, name: '单位', icon: '📏' },
  { id: 'date' as CalculatorMode, name: '日期', icon: '📅' },
  { id: 'financial' as CalculatorMode, name: '金融', icon: '💰' }
]
</script>

<template>
  <div
    class="flex flex-col h-full bg-background"
    @keydown="handleKeydown"
    tabindex="0"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/95 backdrop-blur z-10">
      <button
        @click="emit('back')"
        class="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-lg">🧮</span>
        <div class="text-sm font-medium whitespace-nowrap">计算器</div>
      </div>

      <!-- Mode Selector -->
      <div class="flex items-center gap-3 flex-1 overflow-x-auto min-w-0 scrollbar-none pl-2">
        <button
          v-for="mode in modes"
          :key="mode.id"
          @click="currentMode = mode.id"
          :class="[
            'whitespace-nowrap flex-shrink-0 transition-all duration-200',
            currentMode === mode.id
              ? 'text-sm font-bold text-foreground'
              : 'text-xs text-muted-foreground hover:text-foreground hover:font-medium'
          ]"
        >
          {{ mode.name }}
        </button>
      </div>
    </div>

    <!-- Display -->
    <div class="px-3 py-2 border-b border-border">
      <div class="text-right">
        <div class="text-xs text-muted-foreground h-4">
          {{ operation ? `${previousValue} ${operation}` : '' }}
        </div>
        <div class="text-2xl font-mono font-medium truncate">
          {{ display }}
        </div>
      </div>
    </div>

    <!-- Calculator Content -->
    <div class="flex-1 overflow-hidden p-1.5 flex flex-col">
      <!-- Basic Calculator -->
      <div v-if="currentMode === 'basic'" class="flex-1 grid grid-cols-5 grid-rows-6 gap-0.5">
        <!-- Memory Row -->
        <button @click="memoryClear" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">MC</button>
        <button @click="memoryRecall" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">MR</button>
        <button @click="memoryAdd" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">M+</button>
        <button @click="memorySubtract" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">M-</button>
        <button @click="toggleSign" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">±</button>

        <!-- Row 1 -->
        <button @click="clear" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">C</button>
        <button @click="backspace" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">←</button>
        <button @click="inputPercent" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">%</button>
        <button @click="performOperation('÷')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">÷</button>
        <button @click="scientificOperation('√')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">√</button>

        <!-- Row 2 -->
        <button @click="inputDigit('7')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">7</button>
        <button @click="inputDigit('8')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">8</button>
        <button @click="inputDigit('9')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">9</button>
        <button @click="performOperation('×')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">×</button>
        <button @click="scientificOperation('x²')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">x²</button>

        <!-- Row 3 -->
        <button @click="inputDigit('4')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">4</button>
        <button @click="inputDigit('5')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">5</button>
        <button @click="inputDigit('6')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">6</button>
        <button @click="performOperation('-')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">-</button>
        <button @click="scientificOperation('1/x')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">1/x</button>

        <!-- Row 4 -->
        <button @click="inputDigit('1')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">1</button>
        <button @click="inputDigit('2')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">2</button>
        <button @click="inputDigit('3')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">3</button>
        <button @click="performOperation('+')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">+</button>
        <button @click="calculate" class="rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-base font-medium row-span-2 flex items-center justify-center">=</button>

        <!-- Row 5 -->
        <button @click="inputDigit('0')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium col-span-2 flex items-center justify-center">0</button>
        <button @click="inputDecimal" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">.</button>
      </div>

      <!-- Scientific Calculator -->
      <div v-if="currentMode === 'scientific'" class="flex-1 grid grid-cols-6 grid-rows-7 gap-0.5">
        <!-- Row 1: Angle mode and constants -->
        <button @click="toggleAngleMode" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">
          {{ isDegree ? 'Deg' : 'Rad' }}
        </button>
        <button @click="inputConstant('π')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">π</button>
        <button @click="inputConstant('e')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">e</button>
        <button @click="scientificOperation('n!')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">n!</button>
        <button @click="clear" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">C</button>
        <button @click="backspace" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">←</button>

        <!-- Row 2: Trig functions -->
        <button @click="scientificOperation('sin')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">sin</button>
        <button @click="scientificOperation('cos')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">cos</button>
        <button @click="scientificOperation('tan')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">tan</button>
        <button @click="scientificOperation('asin')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">asin</button>
        <button @click="scientificOperation('acos')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">acos</button>
        <button @click="scientificOperation('atan')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">atan</button>

        <!-- Row 3: Log and power -->
        <button @click="scientificOperation('log')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">log</button>
        <button @click="scientificOperation('ln')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">ln</button>
        <button @click="scientificOperation('x²')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">x²</button>
        <button @click="scientificOperation('x³')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">x³</button>
        <button @click="scientificOperation('√')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">√</button>
        <button @click="scientificOperation('∛')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">∛</button>

        <!-- Row 4 -->
        <button @click="inputDigit('7')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">7</button>
        <button @click="inputDigit('8')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">8</button>
        <button @click="inputDigit('9')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">9</button>
        <button @click="performOperation('÷')" class="px-1 py-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary">÷</button>
        <button @click="inputPercent" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">%</button>
        <button @click="scientificOperation('1/x')" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">1/x</button>

        <!-- Row 5 -->
        <button @click="inputDigit('4')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">4</button>
        <button @click="inputDigit('5')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">5</button>
        <button @click="inputDigit('6')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">6</button>
        <button @click="performOperation('×')" class="px-1 py-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary">×</button>
        <button @click="performOperation('-')" class="px-1 py-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary">-</button>
        <button @click="toggleSign" class="px-1 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">±</button>

        <!-- Row 6 -->
        <button @click="inputDigit('1')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">1</button>
        <button @click="inputDigit('2')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">2</button>
        <button @click="inputDigit('3')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">3</button>
        <button @click="performOperation('+')" class="px-1 py-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary">+</button>
        <button @click="calculate" class="px-1 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-base font-medium row-span-2">=</button>
        <button @click="inputDecimal" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">.</button>

        <!-- Row 7 -->
        <button @click="inputDigit('0')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium col-span-2 flex items-center justify-center">0</button>
        <button @click="inputDigit('00')" class="px-1 py-2 rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium">00</button>
        <button @click="performOperation('^')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">xⁿ</button>
      </div>

      <!-- Programmer Calculator -->
      <div v-if="currentMode === 'programmer'" class="flex-1 flex flex-col gap-0.5">
        <!-- Base display -->
        <div class="grid grid-cols-4 gap-0.5 text-xs font-mono">
          <div class="p-1 bg-muted rounded">
            <div class="text-muted-foreground text-xs">HEX</div>
            <div class="truncate">{{ parseInt(display).toString(16).toUpperCase() }}</div>
          </div>
          <div class="p-1 bg-muted rounded">
            <div class="text-muted-foreground text-xs">DEC</div>
            <div class="truncate">{{ display }}</div>
          </div>
          <div class="p-1 bg-muted rounded">
            <div class="text-muted-foreground text-xs">OCT</div>
            <div class="truncate">{{ parseInt(display).toString(8) }}</div>
          </div>
          <div class="p-1 bg-muted rounded">
            <div class="text-muted-foreground text-xs">BIN</div>
            <div class="truncate">{{ parseInt(display).toString(2) }}</div>
          </div>
        </div>

        <!-- Base selector -->
        <div class="grid grid-cols-4 gap-0.5">
          <button
            @click="convertBase('HEX')"
            :class="[
              'rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center',
              currentBase === 'HEX' && 'bg-primary text-primary-foreground'
            ]"
          >HEX</button>
          <button
            @click="convertBase('DEC')"
            :class="[
              'rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center',
              currentBase === 'DEC' && 'bg-primary text-primary-foreground'
            ]"
          >DEC</button>
          <button
            @click="convertBase('OCT')"
            :class="[
              'rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center',
              currentBase === 'OCT' && 'bg-primary text-primary-foreground'
            ]"
          >OCT</button>
          <button
            @click="convertBase('BIN')"
            :class="[
              'rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center',
              currentBase === 'BIN' && 'bg-primary text-primary-foreground'
            ]"
          >BIN</button>
        </div>

        <!-- Bitwise operations -->
        <div class="grid grid-cols-6 gap-0.5">
          <button @click="bitwiseOperation('AND')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">AND</button>
          <button @click="bitwiseOperation('OR')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">OR</button>
          <button @click="bitwiseOperation('XOR')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">XOR</button>
          <button @click="bitwiseNot" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">NOT</button>
          <button @click="bitwiseOperation('LSH')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">LSH</button>
          <button @click="bitwiseOperation('RSH')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-xs flex items-center justify-center">RSH</button>
        </div>

        <!-- Hex digits -->
        <div class="grid grid-cols-6 gap-0.5">
          <button @click="inputDigit('A')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">A</button>
          <button @click="inputDigit('B')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">B</button>
          <button @click="inputDigit('C')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">C</button>
          <button @click="inputDigit('D')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">D</button>
          <button @click="inputDigit('E')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">E</button>
          <button @click="inputDigit('F')" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">F</button>
        </div>

        <!-- Number pad -->
        <div class="flex-1 grid grid-cols-5 grid-rows-5 gap-0.5">
          <button @click="clear" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">C</button>
          <button @click="backspace" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">←</button>
          <button @click="performOperation('÷')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">÷</button>
          <button @click="performOperation('×')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">×</button>
          <button @click="performOperation('-')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">-</button>

          <button @click="inputDigit('7')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">7</button>
          <button @click="inputDigit('8')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">8</button>
          <button @click="inputDigit('9')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">9</button>
          <button @click="performOperation('+')" class="rounded bg-primary/10 hover:bg-primary/20 transition-colors text-base font-medium text-primary flex items-center justify-center">+</button>
          <button @click="calculate" class="rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-base font-medium row-span-2 flex items-center justify-center">=</button>

          <button @click="inputDigit('4')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">4</button>
          <button @click="inputDigit('5')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">5</button>
          <button @click="inputDigit('6')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">6</button>
          <button @click="toggleSign" class="rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center">±</button>

          <button @click="inputDigit('1')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">1</button>
          <button @click="inputDigit('2')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">2</button>
          <button @click="inputDigit('3')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">3</button>
          <button @click="inputDecimal" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">.</button>

          <button @click="inputDigit('0')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium col-span-2 flex items-center justify-center">0</button>
          <button @click="inputDigit('00')" class="rounded bg-background border border-border hover:bg-secondary transition-colors text-base font-medium flex items-center justify-center">00</button>
        </div>
      </div>

      <!-- Unit Converter -->
      <div v-if="currentMode === 'unit'" class="space-y-2">
        <!-- Category selector -->
        <div class="flex gap-0.5 flex-wrap">
          <button
            v-for="cat in [
              { id: 'length', name: '长度' },
              { id: 'weight', name: '重量' },
              { id: 'temperature', name: '温度' },
              { id: 'area', name: '面积' },
              { id: 'volume', name: '体积' }
            ]"
            :key="cat.id"
            @click="setUnitCategory(cat.id as typeof unitCategory)"
            :class="[
              'px-2 py-1 rounded text-xs transition-colors',
              unitCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Input -->
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">输入值</label>
          <div class="flex gap-1">
            <input
              v-model="unitInputValue"
              type="number"
              class="flex-1 px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              placeholder="输入数值"
            />
            <select
              v-model="unitFrom"
              class="px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
            </select>
          </div>
        </div>

        <!-- Swap button -->
        <div class="flex justify-center">
          <button
            @click="swapUnits"
            class="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            ⇅
          </button>
        </div>

        <!-- Output -->
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">转换结果</label>
          <div class="flex gap-1">
            <div class="flex-1 px-2 py-1.5 rounded bg-muted font-mono text-sm">
              {{ unitResult }}
            </div>
            <select
              v-model="unitTo"
              class="px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Date Calculator -->
      <div v-if="currentMode === 'date'" class="space-y-2">
        <!-- Mode selector -->
        <div class="flex gap-0.5">
          <button
            @click="dateMode = 'add'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              dateMode === 'add'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            日期加天数
          </button>
          <button
            @click="dateMode = 'subtract'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              dateMode === 'subtract'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            日期减天数
          </button>
          <button
            @click="dateMode = 'weekday'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              dateMode === 'weekday'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            查看星期
          </button>
        </div>

        <!-- Date input -->
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">选择日期</label>
          <input
            v-model="dateInput"
            type="date"
            class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>

        <!-- Days input (only for add/subtract) -->
        <div v-if="dateMode !== 'weekday'" class="space-y-1">
          <label class="text-xs text-muted-foreground">天数</label>
          <input
            v-model="dateDays"
            type="number"
            class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            placeholder="输入天数"
          />
        </div>

        <!-- Result -->
        <div v-if="dateResult" class="p-2 bg-muted rounded">
          <div v-if="dateMode === 'weekday'" class="text-center">
            <div class="text-xs text-muted-foreground">{{ dateInput }}</div>
            <div class="text-lg font-medium">{{ dateResult.dayOfWeek }}</div>
          </div>
          <div v-else class="text-center">
            <div class="text-xs text-muted-foreground">
              {{ dateInput }} {{ dateMode === 'add' ? '+' : '-' }} {{ dateDays }} 天 =
            </div>
            <div class="text-lg font-medium">{{ dateResult.resultDate }}</div>
            <div class="text-xs text-muted-foreground">{{ dateResult.dayOfWeek }}</div>
          </div>
        </div>
      </div>

      <!-- Financial Calculator -->
      <div v-if="currentMode === 'financial'" class="space-y-2">
        <!-- Mode selector -->
        <div class="flex gap-0.5">
          <button
            @click="financialMode = 'loan'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              financialMode === 'loan'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            贷款计算
          </button>
          <button
            @click="financialMode = 'simple'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              financialMode === 'simple'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            单利计算
          </button>
          <button
            @click="financialMode = 'compound'"
            :class="[
              'flex-1 px-2 py-1 rounded text-xs transition-colors',
              financialMode === 'compound'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            ]"
          >
            复利计算
          </button>
        </div>

        <!-- Loan Calculator -->
        <div v-if="financialMode === 'loan'" class="space-y-1.5">
          <div class="space-y-0.5">
            <label class="text-xs text-muted-foreground">贷款总额 (元)</label>
            <input
              v-model="loanPrincipal"
              type="number"
              class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">年利率 (%)</label>
              <input
                v-model="loanRate"
                type="number"
                step="0.1"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">贷款年限</label>
              <input
                v-model="loanYears"
                type="number"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>
          <div v-if="loanResult" class="p-2 bg-muted rounded text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">每月月供</span>
              <span class="font-medium">¥{{ loanResult.monthlyPayment.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">支付利息</span>
              <span class="font-medium">¥{{ loanResult.totalInterest.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">还款总额</span>
              <span class="font-medium">¥{{ loanResult.totalPayment.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Simple Interest -->
        <div v-if="financialMode === 'simple'" class="space-y-1.5">
          <div class="space-y-0.5">
            <label class="text-xs text-muted-foreground">本金 (元)</label>
            <input
              v-model="simplePrincipal"
              type="number"
              class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">年利率 (%)</label>
              <input
                v-model="simpleRate"
                type="number"
                step="0.1"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">投资年限</label>
              <input
                v-model="simpleYears"
                type="number"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>
          <div v-if="simpleResult" class="p-2 bg-muted rounded text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">利息收入</span>
              <span class="font-medium">¥{{ simpleResult.interest.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">本息合计</span>
              <span class="font-medium">¥{{ simpleResult.totalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Compound Interest -->
        <div v-if="financialMode === 'compound'" class="space-y-1.5">
          <div class="space-y-0.5">
            <label class="text-xs text-muted-foreground">本金 (元)</label>
            <input
              v-model="compoundPrincipal"
              type="number"
              class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">年利率 (%)</label>
              <input
                v-model="compoundRate"
                type="number"
                step="0.1"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div class="space-y-0.5">
              <label class="text-xs text-muted-foreground">投资年限</label>
              <input
                v-model="compoundYears"
                type="number"
                class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>
          <div class="space-y-0.5">
            <label class="text-xs text-muted-foreground">每年复利次数</label>
            <select
              v-model="compoundCompoundsPerYear"
              class="w-full px-2 py-1.5 rounded bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="1">每年 (1次)</option>
              <option value="2">每半年 (2次)</option>
              <option value="4">每季度 (4次)</option>
              <option value="12">每月 (12次)</option>
              <option value="365">每天 (365次)</option>
            </select>
          </div>
          <div v-if="compoundResult" class="p-2 bg-muted rounded text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">利息收入</span>
              <span class="font-medium">¥{{ compoundResult.interest.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">本息合计</span>
              <span class="font-medium">¥{{ compoundResult.totalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

