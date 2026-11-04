import { describe, expect, it } from 'vitest'
import {
  computeIdCode,
  encodeChar,
  encodePhrase,
  idZone,
  parseIdFlag,
  ZONE_LETTERS,
} from '../../src/lib/wubi/encoder'

describe('识别码区位', () => {
  it('区号 = 末笔代号，位号 = 字型代号', () => {
    expect(idZone(1, 1)).toBe(11)
    expect(idZone(1, 3)).toBe(13)
    expect(idZone(4, 1)).toBe(41)
    expect(idZone(5, 3)).toBe(53)
  })

  it('识别码字母与 86 版键位一致', () => {
    expect(computeIdCode(4, 1)).toBe('y') // 捺·左右 41
    expect(computeIdCode(4, 2)).toBe('u') // 捺·上下 42
    expect(computeIdCode(4, 3)).toBe('i') // 捺·杂合 43
    expect(computeIdCode(1, 3)).toBe('d') // 横·杂合 13
    expect(computeIdCode(2, 3)).toBe('k') // 竖·杂合 23
    expect(computeIdCode(5, 1)).toBe('n') // 折·左右 51
    expect(computeIdCode(3, 2)).toBe('r') // 撇·上下 32
  })

  it('ZONE_LETTERS 覆盖 25 键且互不重复', () => {
    const values = Object.values(ZONE_LETTERS)
    expect(values).toHaveLength(25)
    expect(new Set(values).size).toBe(25)
  })

  it('parseIdFlag 解析拆字库的识别码说明', () => {
    expect(parseIdFlag('捺·左右〔丶 ⿰〕')?.key).toBe('y')
    expect(parseIdFlag('横·杂合〔一 ⿻〕')?.zone).toBe(13)
    expect(parseIdFlag('丿·上下〔丿 ⿱〕')?.key).toBe('r')
    expect(parseIdFlag('')).toBeNull()
    expect(parseIdFlag(null)).toBeNull()
  })
})

describe('encodeChar', () => {
  it('键名字：连打四键', () => {
    expect(encodeChar({ type: 'key', key: 'g' })).toBe('gggg') // 王
    expect(encodeChar({ type: 'key', key: 'j' })).toBe('jjjj') // 日
    expect(encodeChar({ type: 'key', key: 'x' })).toBe('xxxx') // 纟
  })

  it('单笔画：键名 ×2 + ll', () => {
    expect(encodeChar({ type: 'stroke', key: 'g' })).toBe('ggll') // 一
    expect(encodeChar({ type: 'stroke', key: 'n' })).toBe('nnll') // 乙
  })

  it('成字字根：报户口 + 首笔 + 次笔 + 末笔', () => {
    expect(encodeChar({ type: 'char', key: 'g', unitKeys: ['g', 'g', 'h', 'g'] })).toBe('gghg') // 五
    expect(encodeChar({ type: 'char', key: 'f', unitKeys: ['f', 'g', 'g'] })).toBe('fgg') // 二
    expect(encodeChar({ type: 'char', key: 'f', unitKeys: ['f', 'g', 'h', 'y'] })).toBe('fghy') // 寸
  })

  it('合体字 ≥4 根：一/二/三/末', () => {
    expect(
      encodeChar({ type: 'compound', key: 's', rootKeys: ['s', 'q', 'q', 'r'] }),
    ).toBe('sqqr') // 攀
  })

  it('合体字 <4 根：字根 + 识别码', () => {
    // 汉 = 氵(c) 又(c) + 捺·左右 41 y
    expect(
      encodeChar({
        type: 'compound',
        key: 'i',
        rootKeys: ['i', 'c'],
        id: { lastStroke: 4, structure: 1 },
      }),
    ).toBe('icy')
    // 国 = 囗(l) 王(g) 丶(y) + 捺·杂合 43 i
    expect(
      encodeChar({
        type: 'compound',
        key: 'l',
        rootKeys: ['l', 'g', 'y'],
        id: { lastStroke: 4, structure: 3 },
      }),
    ).toBe('lgyi')
    // 十 = 十(f) 一(g) 丨(h)（3 根成字，非合体分支，这里只验证合体分支的例子）
    expect(
      encodeChar({
        type: 'compound',
        key: 'a',
        rootKeys: ['a', 'v'],
        id: { lastStroke: 5, structure: 1 },
      }),
    ).toBe('avn') // 切 = 七(v) 刀(v) + 折·左右 51 n
  })

  it('缺少识别码时抛错', () => {
    expect(() => encodeChar({ type: 'compound', key: 'i', rootKeys: ['i', 'c'] })).toThrow(
      /识别码/,
    )
  })
})

describe('encodePhrase', () => {
  it('二字词：A1A2 B1B2', () => {
    // 中国 = 中 khk → kh；国 lgyi → lg
    expect(encodePhrase(['中', '国'], ['khk', 'lgyi'])).toBe('khlg')
  })

  it('三字词：A1 B1 C1C2', () => {
    // 共和国 = 共 awu → a；和 tkg → t；国 lgyi → lg（码表 atlg）
    expect(encodePhrase(['共', '和', '国'], ['awu', 'tkg', 'lgyi'])).toBe('atlg')
  })

  it('四字词：每字首码', () => {
    expect(encodePhrase(['中', '国', '人', '民'], ['khk', 'lgyi', 'wwww', 'nav'])).toBe('klwn')
  })

  it('多字词：前三字首码 + 末字首码', () => {
    expect(
      encodePhrase(
        ['中', '华', '人', '民', '共', '和', '国'],
        ['khk', 'wxfj', 'wwww', 'nav', 'au', 'tkg', 'lgyi'],
      ),
    ).toBe('kwwl')
  })

  it('参数不合法时抛错', () => {
    expect(() => encodePhrase(['中'], ['khk'])).toThrow()
    expect(() => encodePhrase(['中', '国'], ['khk', 'l'])).toThrow(/两码/)
  })
})
