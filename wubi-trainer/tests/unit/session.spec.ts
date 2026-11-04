import { describe, expect, it } from 'vitest'
import {
  applyBackspace,
  applyLetter,
  computeMetrics,
  createSession,
  errorEntries,
  expectedKey,
  skipItem,
  type SessionMetrics,
} from '../../src/lib/trainer/session'
import type { LessonItem } from '../../src/lib/wubi/data'

const T0 = 1_000_000

function item(id: string, display: string, code: string): LessonItem {
  return { id, lessonId: 'test', display, code, codeKind: 'full' }
}

function type(session: ReturnType<typeof createSession>, keys: string[], stepMs = 1000) {
  let now = T0
  for (const key of keys) {
    now += stepMs
    applyLetter(session, key, now)
  }
  return session
}

describe('createSession / expectedKey', () => {
  it('空会话直接完成', () => {
    const session = createSession([])
    expect(session.finished).toBe(true)
  })

  it('expectedKey 按缓冲推进', () => {
    const session = createSession([item('a', '汉', 'icy')])
    expect(expectedKey(session)).toBe('i')
    applyLetter(session, 'i', T0)
    expect(expectedKey(session)).toBe('c')
    applyLetter(session, 'c', T0)
    expect(expectedKey(session)).toBe('y')
  })
})

describe('固定击键序列的计分（可独立复算）', () => {
  it('全对：3 条一级简码 g/h/i', () => {
    const session = createSession([
      item('1', '一', 'g'),
      item('2', '上', 'h'),
      item('3', '不', 'i'),
    ])
    type(session, ['g', 'h', 'i'], 1000)
    expect(session.stats).toEqual({
      keystrokes: 3,
      correctKeystrokes: 3,
      wrongKeystrokes: 0,
      backspaces: 0,
      commits: 3,
      completed: 3,
      failed: 0,
    })
    expect(session.finished).toBe(true)
    expect(session.startedAt).toBe(T0 + 1000)
    expect(session.endedAt).toBe(T0 + 3000)
    const metrics = computeMetrics(session, T0 + 3000)
    // 3 字 / (2000ms) → 90 字/分；3 键 / 2000ms → 90 键/分；码长 1
    expect(metrics.cpm).toBeCloseTo(90, 5)
    expect(metrics.kpm).toBeCloseTo(90, 5)
    expect(metrics.codeLength).toBe(1)
    expect(metrics.backspaceRate).toBe(0)
    expect(metrics.accuracy).toBe(1)
    expect(metrics.elapsedMs).toBe(2000)
  })

  it('含错误与退格：h(错) g(对) → 一；i(对) → 上 的前半段', () => {
    const session = createSession([item('1', '一', 'g'), item('2', '上', 'hhgg')])
    // h 对第二条是合法首键，但对第一条错 → 错 1 次并清空
    type(session, ['h', 'g', 'h', 'h', 'g', 'g'], 1000)
    expect(session.stats.keystrokes).toBe(6)
    expect(session.stats.correctKeystrokes).toBe(5)
    expect(session.stats.wrongKeystrokes).toBe(1)
    expect(session.stats.completed).toBe(2)
    expect(session.stats.failed).toBe(1)
    expect(session.finished).toBe(true)
    const metrics = computeMetrics(session, T0 + 6000)
    expect(metrics.accuracy).toBeCloseTo(5 / 6, 5)
    // 2 字 / 5000ms → 24 字/分
    expect(metrics.cpm).toBeCloseTo(24, 5)
  })

  it('退格计入 backspaces 且减少缓冲', () => {
    const session = createSession([item('1', '上', 'hhgg')])
    type(session, ['h', 'h'], 1000)
    applyBackspace(session)
    expect(session.states[0].buffer).toBe('h')
    expect(session.stats.backspaces).toBe(1)
    const metrics = computeMetrics(session, T0 + 4000)
    // 击键 2，退格 1 → 退格率 0.5
    expect(metrics.backspaceRate).toBe(0.5)
    applyLetter(session, 'h', T0 + 5000)
    applyLetter(session, 'g', T0 + 6000)
    applyLetter(session, 'g', T0 + 7000)
    expect(session.finished).toBe(true)
  })

  it('错后重打：错误清空缓冲，重打从首键开始', () => {
    const session = createSession([item('1', '国', 'lgyi')])
    // x 在第 3 键敲错 → 缓冲清空 → 重新 l g y i
    type(session, ['l', 'g', 'x', 'l', 'g', 'y', 'i'], 1000)
    expect(session.stats.wrongKeystrokes).toBe(1)
    expect(session.stats.correctKeystrokes).toBe(6)
    expect(session.stats.keystrokes).toBe(7)
    expect(session.stats.completed).toBe(1)
    expect(session.stats.failed).toBe(1)
    expect(session.states[0].hadError).toBe(true)
  })

  it('一次不错的条目 firstTry 保持 true', () => {
    const session = createSession([item('1', '汉', 'icy')])
    type(session, ['i', 'c', 'y'], 1000)
    expect(session.states[0].firstTry).toBe(true)
    expect(errorEntries(session)).toHaveLength(0)
  })

  it('错误键会清空缓冲', () => {
    const session = createSession([item('1', '国', 'lgyi')])
    type(session, ['l', 'g', 'x'], 1000)
    expect(session.states[0].buffer).toBe('')
    expect(session.lastWrongKey).toBe('x')
  })

  it('skipItem 跳过但不计完成', () => {
    const session = createSession([item('1', '一', 'g'), item('2', '上', 'h')])
    skipItem(session)
    expect(session.cursor).toBe(1)
    expect(session.stats.completed).toBe(0)
    applyLetter(session, 'h', T0)
    expect(session.finished).toBe(true)
  })

  it('完成后继续按键无效', () => {
    const session = createSession([item('1', '一', 'g')])
    type(session, ['g', 'g'], 1000)
    expect(session.stats.keystrokes).toBe(1)
  })
})

describe('computeMetrics 边界', () => {
  it('未开始时全部为 0', () => {
    const session = createSession([item('1', '一', 'g')])
    const metrics = computeMetrics(session, T0)
    expect(metrics).toEqual({
      cpm: 0,
      kpm: 0,
      codeLength: null,
      backspaceRate: 0,
      accuracy: 1,
      completed: 0,
      total: 1,
      elapsedMs: 0,
    } satisfies SessionMetrics)
  })

  it('进行中的计时以 now 为准', () => {
    const session = createSession([item('1', '一', 'g'), item('2', '上', 'h')])
    applyLetter(session, 'g', T0)
    const metrics = computeMetrics(session, T0 + 30_000)
    expect(metrics.completed).toBe(1)
    expect(metrics.cpm).toBeCloseTo(2, 5) // 1 字 / 0.5 分
  })
})
