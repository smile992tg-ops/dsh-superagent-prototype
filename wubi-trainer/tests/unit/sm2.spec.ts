import { describe, expect, it } from 'vitest'
import {
  isDue,
  newSM2Record,
  qualityFromErrors,
  reviewSM2,
} from '../../src/lib/trainer/sm2'

const T0 = 1_000_000_000
const DAY = 24 * 60 * 60 * 1000

describe('SM-2', () => {
  it('新记录立即到期', () => {
    const record = newSM2Record(T0)
    expect(isDue(record, T0)).toBe(true)
    expect(record.easiness).toBe(2.5)
  })

  it('quality ≥3 时按间隔递增：1 → 6 → interval×EF', () => {
    let record = newSM2Record(T0)
    record = reviewSM2(record, 5, T0)
    expect(record.repetitions).toBe(1)
    expect(record.intervalDays).toBe(1)
    expect(record.dueAt).toBe(T0 + DAY)
    record = reviewSM2(record, 5, T0 + DAY)
    expect(record.repetitions).toBe(2)
    expect(record.intervalDays).toBe(6)
    record = reviewSM2(record, 4, T0 + 7 * DAY)
    expect(record.repetitions).toBe(3)
    // EF=2.5 起步，quality 4 → EF 降 0.14 → 2.36
    expect(record.intervalDays).toBe(Math.round(6 * record.easiness))
    expect(record.intervalDays).toBeGreaterThan(6)
  })

  it('quality <3 重置并立即到期，lapses 增加', () => {
    let record = newSM2Record(T0)
    record = reviewSM2(record, 5, T0)
    record = reviewSM2(record, 5, T0 + DAY)
    record = reviewSM2(record, 1, T0 + 7 * DAY)
    expect(record.repetitions).toBe(0)
    expect(record.intervalDays).toBe(0)
    expect(record.dueAt).toBe(T0 + 7 * DAY)
    expect(record.lapses).toBe(1)
  })

  it('easiness 有下限 1.3', () => {
    let record = newSM2Record(T0)
    for (let i = 0; i < 10; i++) {
      record = reviewSM2(record, 0, T0 + i * DAY)
    }
    expect(record.easiness).toBe(1.3)
  })

  it('quality 越低 EF 降得越多', () => {
    const a = reviewSM2(newSM2Record(T0), 5, T0)
    const b = reviewSM2(newSM2Record(T0), 3, T0)
    expect(a.easiness).toBeGreaterThan(b.easiness)
  })

  it('quality 非法时抛错', () => {
    expect(() => reviewSM2(newSM2Record(T0), 6, T0)).toThrow()
    expect(() => reviewSM2(newSM2Record(T0), -1, T0)).toThrow()
  })

  it('错误次数 → quality 映射', () => {
    expect(qualityFromErrors(0)).toBe(5)
    expect(qualityFromErrors(1)).toBe(4)
    expect(qualityFromErrors(2)).toBe(3)
    expect(qualityFromErrors(4)).toBe(2)
    expect(qualityFromErrors(5)).toBe(1)
  })
})
