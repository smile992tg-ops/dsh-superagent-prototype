import { describe, expect, it } from 'vitest'
import {
  CHAR_MAP,
  PHRASES,
  WUBI_DATA,
  articleText,
  buildArticleItems,
  buildLessonItems,
  longestPhraseAt,
} from '../../src/lib/wubi/data'
import { encodePhrase, phraseSegments } from '../../src/lib/wubi/encoder'
import { KEY_ROOT_TABLE } from '../../src/lib/wubi/roots'
import { LESSONS } from '../../src/lib/wubi/lessons'
import { ARTICLE_TEXTS } from '../../src/lib/wubi/articles'

describe('数据完整性', () => {
  it('3500 个一级字表汉字全部有编码与拆解', () => {
    expect(WUBI_DATA.meta.level1Count).toBe(3500)
    expect(WUBI_DATA.chars).toHaveLength(3500)
    const chars = WUBI_DATA.chars.map((record) => record.char)
    expect(new Set(chars).size).toBe(3500)
  })

  it('每个字的全码是 1–4 个合法五笔字母', () => {
    for (const record of WUBI_DATA.chars) {
      expect(record.full).toMatch(/^[a-y]{1,4}$/)
      expect(record.full.length).toBeGreaterThanOrEqual(1)
      expect(record.full.length).toBeLessThanOrEqual(4)
    }
  })

  it('一级简码恰好 25 个字', () => {
    const level1 = WUBI_DATA.chars.filter((record) => record.shortByLength['1'])
    expect(level1).toHaveLength(25)
  })

  it('合体字识别码信息完整且与全码末键一致', () => {
    for (const record of WUBI_DATA.chars) {
      if (record.type !== 'compound' || record.rootCount >= 4) continue
      expect(record.id, `“${record.char}”应带识别码`).not.toBeNull()
      expect(record.full.endsWith(record.id!.key)).toBe(true)
    }
  })

  it('成字字根/键名字的拆解键与全码一致', () => {
    for (const record of WUBI_DATA.chars) {
      if (record.type === 'key') {
        expect(record.full).toBe(record.key.repeat(4))
      }
      if (record.type === 'char') {
        expect(record.unitKeys).toHaveLength(record.units.length)
        expect(record.full).toBe(record.unitKeys.join(''))
      }
      if (record.type === 'stroke') {
        expect(record.full).toBe(`${record.key}${record.key}ll`)
      }
      if (record.type === 'compound') {
        const keys = record.rootKeys
        const expected =
          keys.length >= 4
            ? keys.slice(0, 3).join('') + keys[keys.length - 1]
            : keys.join('') + (record.id?.key ?? '')
        expect(record.full, `“${record.char}”`).toBe(expected)
      }
    }
  })

  it('词组编码符合词组规则', () => {
    for (const phrase of PHRASES) {
      const chars = Array.from(phrase.text)
      const fullCodes = chars.map((char) => CHAR_MAP.get(char)!.full)
      expect(encodePhrase(chars, fullCodes), `词组“${phrase.text}”`).toBe(phrase.code)
    }
  })

  it('词组按长度分布齐全（2/3/4/多字）', () => {
    expect(Object.keys(WUBI_DATA.meta.phraseCounts).sort()).toEqual(['2', '3', '4', '5'])
    expect(PHRASES.length).toBeGreaterThan(900)
  })

  it('文章全部落在 3500 字内', () => {
    for (const text of Object.values(ARTICLE_TEXTS)) {
      for (const char of Array.from(text)) {
        if (!/\p{Script=Han}/u.test(char)) continue
        expect(CHAR_MAP.has(char), `“${char}”不在一级字表`).toBe(true)
      }
    }
  })

  it('文章可完整切成条目：词组整打或单字全码', () => {
    for (const lessonId of Object.keys(ARTICLE_TEXTS)) {
      const items = buildArticleItems({ ...LESSONS[LESSONS.length - 1], id: lessonId })
      expect(items.length).toBeGreaterThan(20)
      for (const item of items) {
        expect(item.code).toMatch(/^[a-y]{1,4}$/)
      }
    }
  })

  it('文章里的词组提示与词库一致', () => {
    const chars = Array.from(articleText('article-daily')).filter((char) =>
      /\p{Script=Han}/u.test(char),
    )
    const run = longestPhraseAt(chars, 0)
    expect(run).not.toBeNull()
    expect(PHRASES.some((phrase) => phrase.text === run!.text)).toBe(true)
  })

  it('词组分段与编码规则一致', () => {
    for (const phrase of PHRASES.slice(0, 50)) {
      const segments = phraseSegments(phrase.text, phrase.code)
      expect(segments).toHaveLength(Array.from(phrase.text).length)
      const rebuilt = segments.map(([start, end]) => phrase.code.slice(start, end)).join('')
      expect(rebuilt).toBe(phrase.code)
    }
  })
})

describe('关卡构造', () => {
  it('全部关卡都能构造条目', () => {
    for (const lesson of LESSONS) {
      const items = buildLessonItems(lesson)
      expect(items.length, `关卡 ${lesson.id}`).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.code).toMatch(/^[a-y]{1,4}$/)
        expect(item.display.length).toBeGreaterThan(0)
      }
    }
  })

  it('字根关卡覆盖 25 键', () => {
    const items = buildLessonItems(LESSONS[0])
    expect(items.map((item) => item.code).sort()).toEqual(
      KEY_ROOT_TABLE.map((info) => info.key).sort(),
    )
  })

  it('一级简码关卡 25 条且码长 1', () => {
    const items = buildLessonItems(LESSONS[2])
    expect(items).toHaveLength(25)
    for (const item of items) expect(item.code).toHaveLength(1)
  })
})
