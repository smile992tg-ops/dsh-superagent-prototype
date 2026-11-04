import type { CharRecord, PhraseRecord } from '../lib/wubi/types'
import { KEY_INFO } from '../lib/wubi/roots'
import { phraseSegments } from '../lib/wubi/encoder'

interface DecompositionProps {
  record: CharRecord
}

/** 单字拆解面板：字根（PUA 字形 + 键位）与末笔字型识别码。 */
export default function Decomposition({ record }: DecompositionProps) {
  return (
    <div className="decomp" data-testid="decomposition">
      <div className="decomp-row">
        {record.units.map((unit, index) => {
          const key = record.rootKeys[index]
          return (
            <span className="decomp-unit" key={index}>
              <span className="decomp-glyph">{unit}</span>
              <span className="decomp-key">{key.toUpperCase()}</span>
            </span>
          )
        })}
        {record.id && (
          <span className="decomp-unit decomp-id">
            <span className="decomp-glyph" title={`末笔${record.id.lastStrokeName}·${record.id.structureName}`}>
              识别码
            </span>
            <span className="decomp-key">
              {record.id.key.toUpperCase()}
              <span className="decomp-zone">{record.id.zone}</span>
            </span>
          </span>
        )}
      </div>
      <div className="decomp-meta">
        <span>
          {record.type === 'key' && '键名字：连打四键'}
          {record.type === 'char' && '成字字根：报户口 + 首笔 + 次笔 + 末笔'}
          {record.type === 'stroke' && '单笔画：键名 ×2 + ll'}
          {record.type === 'compound' &&
            (record.id
              ? `合体字：${record.rootCount} 根 + 识别码（末笔${record.id.lastStrokeName}·${record.id.structureName} → ${record.id.zone}）`
              : `合体字：${record.rootCount} 根，取一/二/三/末`)}
        </span>
        <span className="decomp-mnemonic">
          首键 {record.key.toUpperCase()} · {KEY_INFO[record.key].mnemonic}
        </span>
      </div>
    </div>
  )
}

/** 词组取码分段展示（实现见 src/lib/wubi/encoder.ts）。 */
export { phraseSegments }

export function PhraseHint({ phrase }: { phrase: PhraseRecord }) {
  const segments = phraseSegments(phrase.text, phrase.code)
  return (
    <div className="decomp" data-testid="phrase-hint">
      <div className="decomp-row">
        {Array.from(phrase.text).map((char, index) => {
          const [start, end] = segments[index]
          return (
            <span className="decomp-unit" key={index}>
              <span className="decomp-glyph phrase-char">{char}</span>
              <span className="decomp-key">{phrase.code.slice(start, end)}</span>
            </span>
          )
        })}
      </div>
      <div className="decomp-meta">
        <span>词组码 {phrase.code.toUpperCase()}</span>
      </div>
    </div>
  )
}
