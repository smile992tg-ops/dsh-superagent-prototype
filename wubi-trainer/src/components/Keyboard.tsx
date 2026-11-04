import { KEY_INFO, KEY_ROOT_TABLE, FINGER_COLORS } from '../lib/wubi/roots'
import type { WubiKey } from '../lib/wubi/types'

interface KeyboardProps {
  /** 高亮下一个要敲的键。 */
  nextKey: WubiKey | null
  /** 错误闪红的键。 */
  wrongKey: WubiKey | null
  /** 显示字根明细（默认开）。 */
  showRoots?: boolean
}

const ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]

/** 虚拟键盘：高亮下一键 + 指法分区色 + 字根。 */
export default function Keyboard({ nextKey, wrongKey, showRoots = true }: KeyboardProps) {
  return (
    <div className="keyboard" role="img" aria-label="五笔键盘">
      {ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {rowIndex === 2 && <div className="keyboard-spacer" />}
          {row.map((key) => {
            const info = KEY_INFO[key as WubiKey]
            const classes = ['key']
            if (!info) classes.push('key-unused')
            if (nextKey === key) classes.push('key-next')
            if (wrongKey === key) classes.push('key-wrong')
            return (
              <div
                key={key}
                className={classes.join(' ')}
                data-key={key}
                style={
                  { '--finger-color': info ? FINGER_COLORS[info.finger] : '#cbd5e1' } as React.CSSProperties
                }
              >
                <span className="key-letter">{key.toUpperCase()}</span>
                {info && <span className="key-name">{info.name}</span>}
                {showRoots && info && (
                  <span className="key-roots">{info.roots.slice(0, 5).join('')}</span>
                )}
                {info && <span className="key-zone">{info.zoneCode}</span>}
                {!info && <span className="key-zone">万能</span>}
              </div>
            )
          })}
          {rowIndex === 2 && <div className="key key-space">空格</div>}
        </div>
      ))}
      <div className="keyboard-fingers">
        {KEY_ROOT_TABLE.map((info) => (
          <span key={info.key} className="finger-chip" style={{ background: FINGER_COLORS[info.finger] }}>
            {info.key.toUpperCase()}·{zoneName(info.zoneCode)}
          </span>
        ))}
      </div>
    </div>
  )
}

function zoneName(zoneCode: number): string {
  const zone = Math.floor(zoneCode / 10)
  return ['横', '竖', '撇', '捺', '折'][zone - 1]
}
