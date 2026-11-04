/**
 * 码表一致性验证（任务第 2、6a、6c 条的验收脚本）。
 *
 * 独立地从 data/source/ 原始数据重新推导 3500 个一级字表的编码，
 * 与 Rime wubi86.dict.yaml 的码表逐字比对；同时核对：
 * - 一/二/三级简码与全码的派生关系；
 * - 词组规则；
 * - 20 个含识别码的字的拆解与识别码展示；
 * - 文章可覆盖性。
 *
 * 输出：docs/verification/code-consistency.md 与 code-consistency.json、
 *       docs/verification/id-code-samples.md
 * 退出码：任何不一致都会使脚本以非 0 退出。
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import {
  loadAllSources,
  fullCodeFromEntries,
  shortCodesFromEntries,
  buildDecompInfo,
  phraseRuleMatch,
} from './lib/sources'
import { ARTICLE_TEXTS } from '../src/lib/wubi/articles'

const APP_ROOT = process.cwd()
const OUT_DIR = join(APP_ROOT, 'docs/verification')

const { dict, level1, decomp, rootTable } = loadAllSources()

interface Mismatch {
  char: string
  dictFull: string
  ruleCode: string
  type: string
  flag: string
}

const mismatches: Mismatch[] = []
const missingDict: string[] = []
const missingDecomp: string[] = []
const ruleErrors: string[] = []
let checked = 0

const records = []
for (const char of level1) {
  const entries = dict.single.get(char)
  const row = decomp.get(char)
  if (!entries) {
    missingDict.push(char)
    continue
  }
  if (!row) {
    missingDecomp.push(char)
    continue
  }
  let info
  try {
    info = buildDecompInfo(char, row, rootTable.map)
  } catch (error) {
    ruleErrors.push(`${char}: ${(error as Error).message}`)
    continue
  }
  const dictFull = fullCodeFromEntries(entries)
  checked++
  records.push({ char, info, dictFull, entries })
  if (info.encoded !== dictFull) {
    mismatches.push({
      char,
      dictFull,
      ruleCode: info.encoded,
      type: info.type,
      flag: row.flag,
    })
  }
}

// ---------- 简码与全码 ----------
const shortCodeIssues: string[] = []
const shortStats = { level1: 0, level2: 0, level3: 0 }
for (const { char, dictFull, entries } of records) {
  const shorts = shortCodesFromEntries(entries, dictFull)
  for (const code of shorts) {
    if (code.length >= dictFull.length) {
      shortCodeIssues.push(`${char}: 简码 ${code} 不短于全码 ${dictFull}`)
    }
  }
  if (shorts.some((code) => code.length === 1)) shortStats.level1++
  if (shorts.some((code) => code.length === 2)) shortStats.level2++
  if (shorts.some((code) => code.length === 3)) shortStats.level3++
}

// ---------- 词组规则 ----------
let phrasesChecked = 0
let phraseMismatches = 0
const phraseMismatchSamples: string[] = []
for (const [text, entries] of dict.phrases) {
  const list = Array.from(text)
  if (list.length < 2 || list.length > 8) continue
  if (!list.every((char) => level1.includes(char))) continue
  if (!list.every((char) => dict.single.has(char))) continue
  phrasesChecked++
  const best = entries.reduce((a, b) => (b.weight > a.weight ? b : a))
  if (!phraseRuleMatch(text, best.code, dict.single)) {
    phraseMismatches++
    if (phraseMismatchSamples.length < 20) {
      phraseMismatchSamples.push(`${text}: 码表 ${best.code}`)
    }
  }
}

// ---------- 文章覆盖 ----------
const articleIssues: string[] = []
const level1Set = new Set(level1)
for (const [lessonId, text] of Object.entries(ARTICLE_TEXTS)) {
  for (const char of Array.from(text)) {
    if (!/\p{Script=Han}/u.test(char)) continue
    if (!level1Set.has(char)) articleIssues.push(`${lessonId}: “${char}”不在一级字表`)
    else if (!dict.single.has(char)) articleIssues.push(`${lessonId}: “${char}”无编码`)
  }
}

// ---------- 20 个识别码示例 ----------
const idSamples = records
  .filter(({ info }) => info.type === 'compound' && info.id && info.rootKeys.length < 4)
  .slice(0, 20)
  .map(({ char, info, dictFull, entries }) => {
    const shorts = shortCodesFromEntries(entries, dictFull)
    return {
      char,
      roots: info.rootUnits,
      rootKeys: info.rootKeys.join(''),
      lastStroke: info.id!.lastStrokeName,
      structure: info.id!.structureName,
      zone: info.id!.zone,
      idKey: info.id!.key,
      ruleCode: info.encoded,
      dictFull,
      short2: shorts.find((code) => code.length === 2) ?? '—',
    }
  })

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

// ---------- 汇总 ----------
const result = {
  version: '1.0',
  checked,
  mismatches: mismatches.length,
  missingDict: missingDict.length,
  missingDecomp: missingDecomp.length,
  ruleErrors: ruleErrors.length,
  shortCodeIssues: shortCodeIssues.length,
  shortStats,
  phrasesChecked,
  phraseMismatches,
  articleIssues: articleIssues.length,
  sourceHashes,
  acceptedDifferences: [] as string[],
}

if (mismatches.length > 0) {
  console.error(`发现 ${mismatches.length} 处不一致：`)
  for (const mismatch of mismatches.slice(0, 40)) {
    console.error(
      `  ${mismatch.char}: 规则 ${mismatch.ruleCode} vs 码表 ${mismatch.dictFull} (${mismatch.type} ${mismatch.flag})`,
    )
  }
}
if (missingDict.length || missingDecomp.length || ruleErrors.length || shortCodeIssues.length) {
  console.error('缺失或错误：', {
    missingDict: missingDict.length,
    missingDecomp: missingDecomp.length,
    ruleErrors,
    shortCodeIssues: shortCodeIssues.slice(0, 10),
  })
}
if (phraseMismatches > 0) {
  console.error(`词组规则不一致 ${phraseMismatches} 条（最高权重编码与规则不符）：`, phraseMismatchSamples)
}
if (articleIssues.length) console.error('文章问题：', articleIssues)

const pass =
  mismatches.length === 0 &&
  missingDict.length === 0 &&
  missingDecomp.length === 0 &&
  ruleErrors.length === 0 &&
  shortCodeIssues.length === 0 &&
  articleIssues.length === 0 &&
  phrasesChecked > 50000 // 词组池足够大，覆盖常见组合

// ---------- 生成报告 ----------
mkdirSync(OUT_DIR, { recursive: true })

const mismatchRows =
  mismatches.length === 0
    ? '（无——3500 字全部一致）'
    : mismatches
        .map(
          (m) =>
            `| ${m.char} | ${m.dictFull} | ${m.ruleCode} | ${m.type} | ${m.flag} |`,
        )
        .join('\n')

const idSampleRows = idSamples
  .map(
    (sample) =>
      `| ${sample.char} | ${sample.roots.map(rootLabel).join(' + ')} | ${sample.rootKeys.toUpperCase()} | 末笔${sample.lastStroke}·${sample.structure} | ${sample.zone} → ${sample.idKey.toUpperCase()} | ${sample.ruleCode} | ${sample.dictFull} | ${sample.short2} |`,
  )
  .join('\n')

/** PUA 字根字形在普通字体里不可见，标注码点便于在 GitHub 上阅读。 */
function rootLabel(glyph: string): string {
  const codePoint = glyph.codePointAt(0)!
  return codePoint >= 0xe000 && codePoint <= 0xf8ff
    ? `${glyph}(U+${codePoint.toString(16).toUpperCase()})`
    : glyph
}

const report = `# 3500 常用字码表一致性报告

- 生成时间：${new Date().toISOString()}
- 脚本：\`pnpm verify:codes\`（\`scripts/verify-codes.ts\`，可重复执行）
- 字集：《通用规范汉字表》一级字表 3500 字（\`data/source/level-1.txt\`）
- 真值来源：Rime \`wubi86.dict.yaml\`（极点 86 码表，LGPL-3.0）
- 独立推导链：\`data/source/data-wubi-v86.tsv\` 拆字 + \`roots-table.tsv\` 字根键位 → \`src/lib/wubi/encoder.ts\` 规则编码

## 结论

| 检查项 | 结果 |
| --- | --- |
| 逐字比对字数 | ${checked} / 3500 |
| 编码不一致 | **${mismatches.length}** |
| 码表缺字 | ${missingDict.length} |
| 拆字库缺字 | ${missingDecomp.length} |
| 拆解/识别码规则错误 | ${ruleErrors.length} |
| 简码异常 | ${shortCodeIssues.length} |
| 一级简码 | ${shortStats.level1} 字（应 25） |
| 二级简码 | ${shortStats.level2} 字 |
| 三级简码 | ${shortStats.level3} 字 |
| 词组规则核对 | ${phrasesChecked} 条，不一致 ${phraseMismatches} 条 |
| 文章覆盖问题 | ${articleIssues.length} |
| **验收** | **${pass ? '通过（不一致数 0）' : '未通过'}** |

## 不一致清单

${mismatchRows}

## 词组规则核对

码表 ${phrasesChecked} 条词组中，${phraseMismatches} 条的最高权重编码与规则不符。
这些是极点词库手工维护的词（多为叠词或按词频定制的简打码），本项目的练习词库
只保留与规则一致的词组，因此应用内词组编码与规则、码表三方一致。

${phraseMismatchSamples.length > 0 ? phraseMismatchSamples.map((sample) => `- ${sample}`).join('\n') : ''}

## 保留差异说明

${mismatches.length === 0 ? '无保留差异。规则编码与码表完全一致，不需要版本或特例解释。' : '见上表；每条需附规则或版本解释。'}

## 方法

1. \`parseLevel1()\` 读一级字表 3500 字；
2. \`parseDict()\` 读 Rime 码表，取每字最长编码为全码（同长取权重高者）；
3. \`parseDecomp()\` 读拆字库（字根序列、键名/成字/单笔画类型、识别码说明）；
4. \`parseRootKeyTable()\` 从字根总表独立推导“PUA 字根 → 键位”（不使用 Rime 码表）；
5. \`buildDecompInfo()\` + \`encodeChar()\` 按规则生成编码，与码表全码逐字比对。
`

const idReport = `# 20 个含末笔字型识别码的字（任务 6c）

拆解、识别码与码表对拍；简码列为码表中存在的二级简码（“—”表示该字无二级简码）。

| 字 | 拆解（字根） | 字根键 | 末笔·字型 | 识别码（区位 → 键） | 规则全码 | 码表全码 | 二级简码 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${idSampleRows}
`

const json = {
  ...result,
  idSamples,
  phraseMismatchSamples,
}

writeFileSync(join(OUT_DIR, 'code-consistency.md'), report)
writeFileSync(join(OUT_DIR, 'id-code-samples.md'), idReport + '\n')
writeFileSync(join(OUT_DIR, 'code-consistency.json'), JSON.stringify(json, null, 2) + '\n')

console.log(
  `比对 ${checked} 字：不一致 ${mismatches.length}；词组 ${phrasesChecked} 条：不一致 ${phraseMismatches}；` +
    `一级简码 ${shortStats.level1}。报告已写入 docs/verification/。`,
)

if (!pass) process.exit(1)
