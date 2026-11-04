import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import {
  loadAllSources,
  fullCodeFromEntries,
  shortCodesFromEntries,
  shortCodeByLength,
  buildDecompInfo,
  phraseRuleMatch,
} from './lib/sources'
import { ARTICLE_TEXTS } from '../src/lib/wubi/articles'
import type { CharRecord, DataMeta, PhraseRecord } from '../src/lib/wubi/types'

const APP_ROOT = process.cwd()
const OUT_DIR = join(APP_ROOT, 'src/data')
const VERSION = '86-v1'

const TOP_PHRASES: Record<number, number> = { 2: 600, 3: 200, 4: 150, 5: 60 }

const { dict, level1, decomp, rootTable } = loadAllSources()
const errors: string[] = []

// ---------- 单字 ----------
const chars: CharRecord[] = []
for (const char of level1) {
  const entries = dict.single.get(char)
  const row = decomp.get(char)
  if (!entries || entries.length === 0) {
    errors.push(`${char}: Rime 码表中没有编码`)
    continue
  }
  if (!row) {
    errors.push(`${char}: 拆字库中没有条目`)
    continue
  }

  let info
  try {
    info = buildDecompInfo(char, row, rootTable.map)
  } catch (error) {
    errors.push(`${char}: ${(error as Error).message}`)
    continue
  }

  const full = fullCodeFromEntries(entries)
  if (info.encoded !== full) {
    errors.push(`${char}: 规则编码 ${info.encoded} 与码表全码 ${full} 不一致`)
    continue
  }

  const short = shortCodesFromEntries(entries, full)
  // 展示用：units 与 rootKeys 一一对应；识别码字形单独展示（见 Decomposition 组件）。
  const displayUnits =
    info.type === 'compound' ? info.rootUnits : info.type === 'char' ? info.row.units : [info.row.units[0]]
  chars.push({
    char,
    full,
    short,
    shortByLength: shortCodeByLength(short),
    type: info.type,
    key: info.key,
    rootKeys: info.rootKeys,
    unitKeys: info.unitKeys,
    units: displayUnits,
    id: info.id,
    rootCount: info.rootKeys.length,
  })
}

// ---------- 词组 ----------
const phrases: PhraseRecord[] = []
for (const [text, entries] of dict.phrases) {
  const list = Array.from(text)
  if (list.length < 2) continue
  if (!list.every((char) => level1.includes(char))) continue
  if (!list.every((char) => dict.single.has(char))) continue
  // 词内重复的字没有教学价值（整打提示与单字重复），只保留不同字组成的词。
  if (new Set(list).size !== list.length) continue
  const best = entries.reduce((a, b) => (b.weight > a.weight ? b : a))
  if (!phraseRuleMatch(text, best.code, dict.single)) continue
  const len = Math.min(list.length, 5)
  phrases.push({ text, code: best.code, weight: best.weight, ruleMatch: true })
}
const phrasesByLen = new Map<number, PhraseRecord[]>()
for (const phrase of phrases) {
  const len = Math.min(Array.from(phrase.text).length, 5)
  const list = phrasesByLen.get(len) ?? []
  list.push(phrase)
  phrasesByLen.set(len, list)
}
const keptPhrases: PhraseRecord[] = []
for (const [len, limit] of Object.entries(TOP_PHRASES)) {
  const list = phrasesByLen.get(Number(len)) ?? []
  list.sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text))
  keptPhrases.push(...list.slice(0, limit))
}
keptPhrases.sort(
  (a, b) => Array.from(a.text).length - Array.from(b.text).length || b.weight - a.weight,
)

// ---------- 文章校验 ----------
const level1Set = new Set(level1)
for (const [lessonId, text] of Object.entries(ARTICLE_TEXTS)) {
  // 标点与空白会在练习时跳过，只要求汉字落在一级字表内。
  for (const char of Array.from(text)) {
    if (!/\p{Script=Han}/u.test(char)) continue
    if (!level1Set.has(char)) {
      errors.push(`文章 ${lessonId} 中的“${char}”不在一级字表内`)
    }
  }
}

if (errors.length > 0) {
  console.error(`构建失败，共 ${errors.length} 个问题：`)
  for (const error of errors.slice(0, 50)) console.error(' - ' + error)
  process.exit(1)
}

// ---------- 元数据 ----------
const sourceHashes: Record<string, string> = {}
for (const name of [
  'wubi86.dict.yaml',
  'level-1.txt',
  'data-wubi-v86.tsv',
  'roots-table.tsv',
  'roots.md',
]) {
  sourceHashes[name] = createHash('sha256')
    .update(readFileSync(join(APP_ROOT, 'data/source', name)))
    .digest('hex')
}

const phraseCounts: Record<string, number> = {}
for (const phrase of keptPhrases) {
  const len = Math.min(Array.from(phrase.text).length, 5)
  phraseCounts[String(len)] = (phraseCounts[String(len)] ?? 0) + 1
}

const meta: DataMeta = {
  version: VERSION,
  generatedBy: 'scripts/build-data.ts',
  characterCount: chars.length,
  level1Count: level1.length,
  phraseCounts,
  sourceHashes,
  rules: [
    '键名字：所在键连打四次（王 = gggg）',
    '成字字根：报户口 + 首笔 + 次笔 + 末笔（五 = gghg，二 = fgg）',
    '五种单笔画：键名 + 键名 + ll（一 = ggll，乙 = nnll）',
    '合体字 ≥4 根：取一、二、三、末字根（攀 = sqqr）',
    '合体字 <4 根：字根 + 末笔字型识别码（汉 = icy：氵 又 + 捺·左右 41=Y）',
    '二字词：A1A2 B1B2（中国 = khlg）',
    '三字词：A1 B1 C1C2（共和国 = atlg）',
    '四字词：A1 B1 C1 D1（不如人意 = gvwu 类推）',
    '多字词：A1 B1 C1 Z1（中华人民共和国 = kwwl）',
  ],
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  join(OUT_DIR, 'wubi.json'),
  JSON.stringify({ meta, chars, phrases: keptPhrases }, null, 1) + '\n',
)

console.log(
  `已生成 src/data/wubi.json：${chars.length} 个单字，${keptPhrases.length} 条词组 ` +
    `(2 字 ${phraseCounts['2'] ?? 0} / 3 字 ${phraseCounts['3'] ?? 0} / 4 字 ${phraseCounts['4'] ?? 0} / 多字 ${phraseCounts['5'] ?? 0})`,
)
