import { beforeEach, describe, expect, it } from 'vitest'
import {
  dueEntries,
  emptyErrorbook,
  loadErrorbook,
  recordErrors,
  recordSuccesses,
  removeEntry,
  saveErrorbook,
  type ErrorbookData,
} from '../../src/lib/trainer/errorbook'
import { qualityFromErrors } from '../../src/lib/trainer/sm2'
import type { LessonItem } from '../../src/lib/wubi/data'

const T0 = 1_700_000_000_000
const DAY = 24 * 60 * 60 * 1000

function item(id: string, display: string, code: string): LessonItem {
  return { id, lessonId: 'level1', display, code, codeKind: 'short1' }
}

describe('错题本', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('记录错误条目并安排 SM-2 复习', () => {
    const book = recordErrors(emptyErrorbook(), [item('level1:地', '地', 'f')], new Map([['level1:地', 2]]), T0)
    const entry = book.entries['level1:地']
    expect(entry).toBeDefined()
    expect(entry.errorCount).toBe(2)
    expect(entry.sm2.repetitions).toBe(1)
    expect(entry.sm2.easiness).toBeCloseTo(2.5 - 0.14, 5) // quality 3
    expect(entry.sm2.dueAt).toBe(T0 + 1 * 24 * 60 * 60 * 1000)
  })

  it('再次出错累计错误次数并缩短复习间隔', () => {
    let book = recordErrors(emptyErrorbook(), [item('level1:地', '地', 'f')], new Map([['level1:地', 1]]), T0)
    book = recordErrors(book, [item('level1:地', '地', 'f')], new Map([['level1:地', 3]]), T0 + DAY)
    const entry = book.entries['level1:地']
    expect(entry.errorCount).toBe(4)
    expect(entry.sm2.repetitions).toBe(0) // quality 2 → 重置
    expect(entry.sm2.dueAt).toBe(T0 + DAY)
    expect(dueEntries(book, T0 + DAY)).toHaveLength(1)
  })

  it('成功复习（一次没错）推进到期时间', () => {
    let book = recordErrors(emptyErrorbook(), [item('level1:地', '地', 'f')], new Map([['level1:地', 1]]), T0)
    book = recordSuccesses(book, [item('level1:地', '地', 'f')], T0 + DAY)
    const entry = book.entries['level1:地']
    // 第一次记错 → quality 4 → rep1；成功 → quality 5 → rep2 → interval 6
    expect(entry.sm2.repetitions).toBe(2)
    expect(entry.sm2.intervalDays).toBe(6)
  })

  it('不在错题本的条目不因成功而新增', () => {
    const book = recordSuccesses(emptyErrorbook(), [item('level1:一', '一', 'g')], T0)
    expect(book.entries['level1:一']).toBeUndefined()
  })

  it('load/save 往返一致，损坏数据回退为空', () => {
    const book = recordErrors(emptyErrorbook(), [item('level1:地', '地', 'f')], new Map([['level1:地', 1]]), T0)
    saveErrorbook(book)
    expect(loadErrorbook().entries['level1:地'].code).toBe('f')
    localStorage.setItem(['wubi', 'trainer', 'errorbook', 'v1'].join('-'), 'not json')
    expect(loadErrorbook()).toEqual(emptyErrorbook())
  })

  it('删除单条', () => {
    let book: ErrorbookData = recordErrors(
      emptyErrorbook(),
      [item('level1:地', '地', 'f'), item('level1:在', '在', 'd')],
      new Map(),
      T0,
    )
    book = removeEntry(book, 'level1:地')
    expect(book.entries['level1:地']).toBeUndefined()
    expect(book.entries['level1:在']).toBeDefined()
  })
})
