import { getStorage, setStorage } from '../../lib/storage'

export const BOARD_SIZE = 15
export type Stone = 'black' | 'white'
export type Cell = Stone | null
export type GameMode = 'local' | 'ai'
export type AiDifficulty = 'easy' | 'normal' | 'hard'
export type GameStatus = 'playing' | 'won' | 'draw' | 'resigned'

export interface Point { row: number; col: number }
export interface Move extends Point { stone: Stone }
export interface GameResult {
  status: GameStatus
  winner?: Stone
  winningPoints?: Point[]
}
export interface GameStats {
  wins: number
  losses: number
  draws: number
  streak: number
}
export interface GomokuPreferences {
  soundEnabled: boolean
  difficulty: AiDifficulty
}

const STATS_KEY = 'gomoku-stats'
const PREFERENCES_KEY = 'gomoku-preferences'
const DEFAULT_STATS: GameStats = { wins: 0, losses: 0, draws: 0, streak: 0 }
const DEFAULT_PREFERENCES: GomokuPreferences = { soundEnabled: true, difficulty: 'normal' }
const DIRECTIONS: Point[] = [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: -1 }]

export function createBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null))
}

export function otherStone(stone: Stone): Stone { return stone === 'black' ? 'white' : 'black' }
export function isInside({ row, col }: Point): boolean { return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE }
export function isEmpty(board: Cell[][], point: Point): boolean { return isInside(point) && board[point.row][point.col] === null }

export function placeStone(board: Cell[][], point: Point, stone: Stone): Cell[][] | null {
  if (!isEmpty(board, point)) return null
  const next = board.map(line => [...line])
  next[point.row][point.col] = stone
  return next
}

function run(board: Cell[][], point: Point, stone: Stone, direction: Point, reverse = false): Point[] {
  const points: Point[] = []
  const rowStep = reverse ? -direction.row : direction.row
  const colStep = reverse ? -direction.col : direction.col
  let row = point.row + rowStep
  let col = point.col + colStep
  while (isInside({ row, col }) && board[row][col] === stone) {
    points.push({ row, col })
    row += rowStep
    col += colStep
  }
  return points
}

export function winningLine(board: Cell[][], point: Point, stone: Stone): Point[] | undefined {
  for (const direction of DIRECTIONS) {
    const line = [...run(board, point, stone, direction, true).reverse(), point, ...run(board, point, stone, direction)]
    if (line.length >= 5) return line
  }
  return undefined
}

export function evaluateMove(board: Cell[][], move: Move): GameResult | undefined {
  const line = winningLine(board, move, move.stone)
  if (line) return { status: 'won', winner: move.stone, winningPoints: line }
  if (board.every(row => row.every(cell => cell !== null))) return { status: 'draw' }
  return undefined
}

function lineScore(length: number, openEnds: number): number {
  if (length >= 5) return 1_000_000
  if (length === 4) return openEnds === 2 ? 100_000 : 10_000
  if (length === 3) return openEnds === 2 ? 5_000 : 500
  if (length === 2) return openEnds === 2 ? 200 : 30
  return openEnds === 2 ? 10 : 1
}

function scorePoint(board: Cell[][], point: Point, stone: Stone): number {
  let score = 0
  for (const direction of DIRECTIONS) {
    const forward = run(board, point, stone, direction)
    const backward = run(board, point, stone, direction, true)
    const length = forward.length + backward.length + 1
    let openEnds = 0
    const before = { row: point.row - direction.row * (backward.length + 1), col: point.col - direction.col * (backward.length + 1) }
    const after = { row: point.row + direction.row * (forward.length + 1), col: point.col + direction.col * (forward.length + 1) }
    if (isEmpty(board, before)) openEnds++
    if (isEmpty(board, after)) openEnds++
    score += lineScore(length, openEnds)
    const cells: string[] = []
    for (let step = -4; step <= 4; step++) {
      const target = { row: point.row + direction.row * step, col: point.col + direction.col * step }
      cells.push(!isInside(target) ? 'O' : step === 0 ? 'X' : board[target.row][target.col] === stone ? 'X' : board[target.row][target.col] ? 'O' : '.')
    }
    const line = cells.join('')
    if (/\.XXXX\./.test(line)) score += 120_000
    else if (/XXXX\.|\.XXXX/.test(line)) score += 20_000
    else if (/\.XXX\.|\.XX\.X\.|\.X\.XX\./.test(line)) score += 8_000
    else if (/XXX\.|\.XXX|XX\.X|X\.XX/.test(line)) score += 1_200
    else if (/\.XX\.|\.X\.X\./.test(line)) score += 250
  }
  return score
}

function candidatePoints(board: Cell[][]): Point[] {
  const candidates = new Map<string, Point>()
  let hasStone = false
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    if (!board[row][col]) continue
    hasStone = true
    for (let rowDelta = -2; rowDelta <= 2; rowDelta++) for (let colDelta = -2; colDelta <= 2; colDelta++) {
      const point = { row: row + rowDelta, col: col + colDelta }
      if (isEmpty(board, point)) candidates.set(`${point.row}-${point.col}`, point)
    }
  }
  return hasStone ? [...candidates.values()] : [{ row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) }]
}

function immediateMove(candidates: Point[], board: Cell[][], stone: Stone): Point | undefined {
  return candidates.find(point => {
    const next = placeStone(board, point, stone)
    return next && Boolean(winningLine(next, point, stone))
  })
}

function normalScore(board: Cell[][], point: Point, aiStone: Stone): number {
  const playerStone = otherStone(aiStone)
  return scorePoint(board, point, aiStone) * 1.05 + scorePoint(board, point, playerStone)
}

function bestNormalMove(board: Cell[][], candidates: Point[], aiStone: Stone): Point | undefined {
  return candidates.reduce<Point | undefined>((best, point) =>
    !best || normalScore(board, point, aiStone) > normalScore(board, best, aiStone) ? point : best
  , undefined)
}

function evaluateBoard(board: Cell[][], aiStone: Stone): number {
  const candidates = candidatePoints(board)
  const opponent = otherStone(aiStone)
  const bestAttack = bestNormalMove(board, candidates, aiStone)
  const bestDefense = bestNormalMove(board, candidates, opponent)
  return (bestAttack ? normalScore(board, bestAttack, aiStone) : 0) - (bestDefense ? normalScore(board, bestDefense, opponent) : 0)
}

function rankedCandidates(board: Cell[][], stone: Stone, limit: number): Point[] {
  const ranked = candidatePoints(board)
    .map(point => ({ point, score: normalScore(board, point, stone) }))
    .sort((left, right) => right.score - left.score)
  const forcing = ranked.filter(item => item.score >= 8_000)
  return [...forcing, ...ranked.filter(item => item.score < 8_000)].slice(0, Math.max(limit, forcing.length)).map(item => item.point)
}

function boardKey(board: Cell[][], current: Stone, depth: number): string {
  return `${depth}${current === 'black' ? 'b' : 'w'}${board.map(row => row.map(cell => cell === 'black' ? 'b' : cell === 'white' ? 'w' : '.').join('')).join('')}`
}

function alphaBeta(board: Cell[][], depth: number, current: Stone, aiStone: Stone, alpha: number, beta: number, deadline: number, cache: Map<string, number>): number {
  if (performance.now() >= deadline) return evaluateBoard(board, aiStone)
  if (depth === 0) return evaluateBoard(board, aiStone)
  const key = boardKey(board, current, depth)
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const maximizing = current === aiStone
  let value = maximizing ? -Infinity : Infinity
  for (const point of rankedCandidates(board, current, 10)) {
    const next = placeStone(board, point, current)
    if (!next) continue
    const win = winningLine(next, point, current)
    const score = win ? (current === aiStone ? 10_000_000 + depth : -10_000_000 - depth) : alphaBeta(next, depth - 1, otherStone(current), aiStone, alpha, beta, deadline, cache)
    if (maximizing) { value = Math.max(value, score); alpha = Math.max(alpha, value) }
    else { value = Math.min(value, score); beta = Math.min(beta, value) }
    if (beta <= alpha) break
  }
  const result = value === Infinity || value === -Infinity ? evaluateBoard(board, aiStone) : value
  cache.set(key, result)
  return result
}

function hardMove(board: Cell[][], aiStone: Stone): Point | undefined {
  let best: Point | undefined
  const deadline = performance.now() + 1_500
  const cache = new Map<string, number>()
  const roots = rankedCandidates(board, aiStone, 16)
  for (const depth of [2, 4, 6]) {
    let roundBest: Point | undefined
    let roundScore = -Infinity
    let alpha = -Infinity
    for (const point of roots) {
      const next = placeStone(board, point, aiStone)
      if (!next) continue
      const score = winningLine(next, point, aiStone) ? 10_000_000 : alphaBeta(next, depth - 1, otherStone(aiStone), aiStone, alpha, Infinity, deadline, cache)
      if (score > roundScore) { roundBest = point; roundScore = score }
      alpha = Math.max(alpha, roundScore)
      if (performance.now() >= deadline) break
    }
    if (roundBest) best = roundBest
    if (performance.now() >= deadline) break
  }
  return best
}

function easyMove(board: Cell[][], candidates: Point[], aiStone: Stone): Point | undefined {
  const opponent = otherStone(aiStone)
  const ranked = [...candidates]
    .map(point => ({ point, score: scorePoint(board, point, aiStone) * 0.7 + scorePoint(board, point, opponent) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(5, candidates.length))
  if (ranked.length === 0) return undefined
  // Usually choose the strongest nearby tactical move, but vary among good options.
  if (Math.random() < 0.7) return ranked[0].point
  return ranked[Math.floor(Math.random() * ranked.length)].point
}

export function getAiMove(board: Cell[][], aiStone: Stone, difficulty: AiDifficulty = 'normal'): Point | undefined {
  const candidates = candidatePoints(board)
  const playerStone = otherStone(aiStone)
  for (const stone of [aiStone, playerStone]) {
    const winning = immediateMove(candidates, board, stone)
    if (winning) return winning
  }
  if (difficulty === 'easy') return easyMove(board, candidates, aiStone)
  if (difficulty === 'hard') return hardMove(board, aiStone)
  return bestNormalMove(board, candidates, aiStone)
}

export function loadStats(): GameStats {
  const stored = getStorage<GameStats>(STATS_KEY, DEFAULT_STATS)
  return ['wins', 'losses', 'draws', 'streak'].every(key => typeof stored[key as keyof GameStats] === 'number') ? stored : { ...DEFAULT_STATS }
}
export function saveStats(stats: GameStats): void { setStorage(STATS_KEY, stats) }
export function loadPreferences(): GomokuPreferences {
  const stored = getStorage<GomokuPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES)
  const difficulty = ['easy', 'normal', 'hard'].includes(stored.difficulty) ? stored.difficulty as AiDifficulty : 'normal'
  return typeof stored.soundEnabled === 'boolean' ? { soundEnabled: stored.soundEnabled, difficulty } : { ...DEFAULT_PREFERENCES }
}
export function savePreferences(preferences: GomokuPreferences): void { setStorage(PREFERENCES_KEY, preferences) }
