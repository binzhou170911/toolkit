<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ArrowLeft, Bot, Flag, RotateCcw, Undo2, Volume2, VolumeX } from 'lucide-vue-next'
import {
  BOARD_SIZE, createBoard, evaluateMove, getAiMove, loadPreferences, loadStats, otherStone,
  placeStone, savePreferences, saveStats, type AiDifficulty, type Cell, type GameMode,
  type GameResult, type GameStats, type Move, type Point, type Stone
} from '../tools/gomoku/game'

const emit = defineEmits<{ back: [] }>()
const board = ref<Cell[][]>(createBoard())
const moves = ref<Move[]>([])
const mode = ref<GameMode>('ai')
const humanStone = ref<Stone>('black')
const currentStone = ref<Stone>('black')
const result = ref<GameResult>({ status: 'playing' })
const isAiThinking = ref(false)
const stats = ref<GameStats>(loadStats())
const preferences = loadPreferences()
const soundEnabled = ref(preferences.soundEnabled)
const difficulty = ref<AiDifficulty>(preferences.difficulty)
let aiTimer: ReturnType<typeof setTimeout> | undefined

const aiStone = computed(() => otherStone(humanStone.value))
const isGameOver = computed(() => result.value.status !== 'playing')
const playerName = computed(() => currentStone.value === 'black' ? '黑方' : '白方')
const gameMessage = computed(() => {
  if (result.value.status === 'won') return `${result.value.winner === 'black' ? '黑方' : '白方'}获胜！`
  if (result.value.status === 'draw') return '棋盘已满，平局'
  if (result.value.status === 'resigned') return `${result.value.winner === 'black' ? '黑方' : '白方'}获胜（对方认输）`
  if (isAiThinking.value) return '电脑正在思考…'
  return `轮到${playerName.value}落子`
})

const boardLines = Array.from({ length: BOARD_SIZE }, (_, index) => 8 + index * 6)
const winningKeys = computed(() => new Set((result.value.winningPoints || []).map(point => `${point.row}-${point.col}`)))
const lastMove = computed(() => moves.value[moves.value.length - 1])
const canUndo = computed(() => mode.value === 'ai' ? moves.value.length >= 2 : moves.value.length > 0)
const selectedControlClass = 'border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card font-semibold shadow-md'
const unselectedControlClass = 'border-border bg-secondary text-secondary-foreground hover:border-primary/60 hover:bg-muted'

function playTone(frequency: number) {
  if (!soundEnabled.value) return
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.04, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)
  } catch { /* Audio is optional feedback. */ }
}

function recordResult(nextResult: GameResult) {
  if (nextResult.status === 'playing') return
  const nextStats = { ...stats.value }
  if (nextResult.status === 'draw') {
    nextStats.draws++
    nextStats.streak = 0
  } else {
    const playerWon = nextResult.winner === humanStone.value
    if (playerWon) {
      nextStats.wins++
      nextStats.streak++
    } else {
      nextStats.losses++
      nextStats.streak = 0
    }
  }
  stats.value = nextStats
  saveStats(nextStats)
}

function finishGame(nextResult: GameResult) {
  if (isGameOver.value) return
  result.value = nextResult
  recordResult(nextResult)
  playTone(nextResult.status === 'draw' ? 360 : 660)
}

function makeMove(point: Point, stone: Stone): boolean {
  const nextBoard = placeStone(board.value, point, stone)
  if (!nextBoard || isGameOver.value) return false
  board.value = nextBoard
  const move = { ...point, stone }
  moves.value = [...moves.value, move]
  playTone(stone === 'black' ? 440 : 520)
  const nextResult = evaluateMove(nextBoard, move)
  if (nextResult) finishGame(nextResult)
  else currentStone.value = otherStone(stone)
  return true
}

function scheduleAiMove() {
  if (mode.value !== 'ai' || currentStone.value !== aiStone.value || isGameOver.value) return
  isAiThinking.value = true
  aiTimer = setTimeout(() => {
    const point = getAiMove(board.value, aiStone.value, difficulty.value)
    isAiThinking.value = false
    if (point && !isGameOver.value) makeMove(point, aiStone.value)
  }, 280)
}

function selectPoint(point: Point) {
  if (isAiThinking.value || isGameOver.value) return
  if (mode.value === 'ai' && currentStone.value !== humanStone.value) return
  if (makeMove(point, currentStone.value)) scheduleAiMove()
}

function selectFromBoard(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  const col = Math.max(0, Math.min(BOARD_SIZE - 1, Math.round((x - 8) / 6)))
  const row = Math.max(0, Math.min(BOARD_SIZE - 1, Math.round((y - 8) / 6)))
  selectPoint({ row, col })
}

function restart() {
  if (aiTimer) clearTimeout(aiTimer)
  board.value = createBoard()
  moves.value = []
  currentStone.value = 'black'
  result.value = { status: 'playing' }
  isAiThinking.value = false
  if (mode.value === 'ai' && aiStone.value === 'black') scheduleAiMove()
}

function changeMode(nextMode: GameMode) {
  mode.value = nextMode
  restart()
}

function changeColor(stone: Stone) {
  humanStone.value = stone
  restart()
}

function changeDifficulty(nextDifficulty: AiDifficulty) {
  if (difficulty.value === nextDifficulty) return
  difficulty.value = nextDifficulty
  savePreferences({ soundEnabled: soundEnabled.value, difficulty: difficulty.value })
  restart()
}

function undo() {
  if (isAiThinking.value || !canUndo.value || isGameOver.value) return
  const removeCount = mode.value === 'ai' ? 2 : 1
  const keptMoves = moves.value.slice(0, -removeCount)
  let nextBoard = createBoard()
  for (const move of keptMoves) nextBoard = placeStone(nextBoard, move, move.stone) || nextBoard
  board.value = nextBoard
  moves.value = keptMoves
  currentStone.value = keptMoves.length % 2 === 0 ? 'black' : 'white'
}

function resign() {
  if (isGameOver.value || isAiThinking.value) return
  finishGame({ status: 'resigned', winner: otherStone(currentStone.value) })
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  savePreferences({ soundEnabled: soundEnabled.value, difficulty: difficulty.value })
}

onUnmounted(() => { if (aiTimer) clearTimeout(aiTimer) })
</script>

<template>
  <div class="flex h-full flex-col bg-background">
    <header class="flex items-center gap-2 border-b border-border bg-background/95 p-3">
      <button @click="emit('back')" class="rounded-lg p-2 transition-colors hover:bg-secondary" title="返回">
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-xl">⚫</span>
        <div class="text-sm font-medium">五子棋</div>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <button @click="toggleSound" class="rounded-lg p-2 transition-colors hover:bg-secondary" :title="soundEnabled ? '关闭音效' : '开启音效'">
          <Volume2 v-if="soundEnabled" class="h-4 w-4" /><VolumeX v-else class="h-4 w-4" />
        </button>
        <button @click="restart" class="flex items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-secondary">
          <RotateCcw class="h-4 w-4" />重新开始
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row">
      <section class="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-border bg-muted/30 p-3">
        <svg viewBox="0 0 100 100" class="aspect-square max-h-full w-full max-w-[620px] cursor-crosshair rounded-md bg-[#d9ae71] shadow-inner" role="img" aria-label="五子棋棋盘" @click="selectFromBoard">
          <g stroke="#8b5a2b" stroke-width="0.35">
            <line v-for="coordinate in boardLines" :key="`h-${coordinate}`" x1="8" x2="92" :y1="coordinate" :y2="coordinate" />
            <line v-for="coordinate in boardLines" :key="`v-${coordinate}`" y1="8" y2="92" :x1="coordinate" :x2="coordinate" />
          </g>
          <g fill="#6b4226">
            <circle v-for="point in [{ row: 3, col: 3 }, { row: 3, col: 11 }, { row: 7, col: 7 }, { row: 11, col: 3 }, { row: 11, col: 11 }]" :key="`star-${point.row}-${point.col}`" :cx="8 + point.col * 6" :cy="8 + point.row * 6" r="0.7" />
          </g>
          <g v-for="(row, rowIndex) in board" :key="rowIndex">
            <template v-for="(cell, colIndex) in row" :key="`${rowIndex}-${colIndex}`">
              <circle v-if="cell" :cx="8 + colIndex * 6" :cy="8 + rowIndex * 6" r="2.45" :fill="cell === 'black' ? '#171717' : '#fafafa'" :stroke="cell === 'black' ? '#050505' : '#c7c7c7'" stroke-width="0.35" />
              <circle v-if="cell && winningKeys.has(`${rowIndex}-${colIndex}`)" :cx="8 + colIndex * 6" :cy="8 + rowIndex * 6" r="2.8" fill="none" stroke="#ef4444" stroke-width="0.45" />
            </template>
          </g>
          <circle v-if="lastMove" :cx="8 + lastMove.col * 6" :cy="8 + lastMove.row * 6" r="0.55" :fill="lastMove.stone === 'black' ? '#fff' : '#111'" />
        </svg>
      </section>

      <aside class="w-full space-y-3 lg:w-64">
        <div class="rounded-xl border border-border bg-card p-3">
          <div class="text-xs text-muted-foreground">对局状态</div>
          <div class="mt-1 text-sm font-semibold">{{ gameMessage }}</div>
          <div class="mt-3 flex gap-2 text-xs">
            <span class="rounded bg-secondary px-2 py-1">第 {{ moves.length }} 手</span>
            <span v-if="mode === 'ai'" class="rounded bg-secondary px-2 py-1"><Bot class="mr-1 inline h-3 w-3" />人机</span>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-card p-3 space-y-3">
          <label class="block text-xs font-medium">游戏模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button @click="changeMode('ai')" :class="mode === 'ai' ? selectedControlClass : unselectedControlClass" class="border rounded-md px-2 py-1.5 text-xs transition-all">人机对战</button>
            <button @click="changeMode('local')" :class="mode === 'local' ? selectedControlClass : unselectedControlClass" class="border rounded-md px-2 py-1.5 text-xs transition-all">双人对战</button>
          </div>
          <template v-if="mode === 'ai'">
            <label class="block text-xs font-medium">难度</label>
            <div class="grid grid-cols-3 gap-1">
              <button v-for="option in [{ id: 'easy', label: '简单' }, { id: 'normal', label: '普通' }, { id: 'hard', label: '困难' }]" :key="option.id" @click="changeDifficulty(option.id as AiDifficulty)" :class="difficulty === option.id ? selectedControlClass : unselectedControlClass" class="border rounded-md px-1 py-1.5 text-xs transition-all">{{ option.label }}</button>
            </div>
            <label class="block text-xs font-medium">你执</label>
            <div class="grid grid-cols-2 gap-2">
              <button @click="changeColor('black')" :class="humanStone === 'black' ? 'bg-zinc-900 text-white' : 'bg-secondary'" class="rounded-md px-2 py-1.5 text-xs">● 黑棋</button>
              <button @click="changeColor('white')" :class="humanStone === 'white' ? 'bg-zinc-100 text-zinc-900 ring-1 ring-border' : 'bg-secondary'" class="rounded-md px-2 py-1.5 text-xs">○ 白棋</button>
            </div>
          </template>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button @click="undo" :disabled="!canUndo || isAiThinking || isGameOver" class="flex items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"><Undo2 class="h-3.5 w-3.5" />悔棋</button>
          <button @click="resign" :disabled="isGameOver || isAiThinking" class="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive disabled:cursor-not-allowed disabled:opacity-40"><Flag class="h-3.5 w-3.5" />认输</button>
        </div>

        <div class="rounded-xl border border-border bg-card p-3">
          <div class="text-xs font-medium">本地战绩</div>
          <div class="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
            <div><div class="text-base font-semibold">{{ stats.wins }}</div><div class="text-muted-foreground">胜</div></div>
            <div><div class="text-base font-semibold">{{ stats.losses }}</div><div class="text-muted-foreground">负</div></div>
            <div><div class="text-base font-semibold">{{ stats.draws }}</div><div class="text-muted-foreground">和</div></div>
            <div><div class="text-base font-semibold">{{ stats.streak }}</div><div class="text-muted-foreground">连胜</div></div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
