import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonPlan } from '../lib/wubi/data'
import type { WubiKey } from '../lib/wubi/types'
import {
  applyBackspace,
  applyLetter,
  computeMetrics,
  createSession,
  errorEntries,
  expectedKey,
  type Session,
} from '../lib/trainer/session'
import { recordErrors, recordSuccesses, loadErrorbook, saveErrorbook } from '../lib/trainer/errorbook'
import { useTypingInput } from '../lib/trainer/useTypingInput'
import { FINGER_BY_KEY, FINGER_COLORS, FINGER_LABELS } from '../lib/wubi/roots'
import Keyboard from './Keyboard'
import Decomposition, { PhraseHint } from './Decomposition'

interface LessonPageProps {
  plan: LessonPlan
  onExit: () => void
}

function playWrongBeep() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 220
    gain.gain.value = 0.04
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
    setTimeout(() => void ctx.close(), 300)
  } catch {
    // 没有音频设备时忽略
  }
}

export default function LessonPage({ plan, onExit }: LessonPageProps) {
  const [session, setSession] = useState<Session>(() => createSession(plan.items))
  const [soundOn, setSoundOn] = useState(false)

  // 重开：关卡切换或手动重置。
  useEffect(() => {
    setSession(createSession(plan.items))
  }, [plan])

  const state = session.states[session.cursor]
  const currentItem = state?.item
  const nextKey = expectedKey(session) as WubiKey | null
  const metrics = computeMetrics(session)

  // 每完成一条就同步错题本（不必等整关结束）：
  // 出错条目按错误次数记入并更新 SM-2；已在错题本的条目一次没错则记为成功复习。
  // state.recorded 保证 React StrictMode 双调用 effect 时不会重复记账。
  useEffect(() => {
    if (session.cursor === 0) return
    const done = session.states[session.cursor - 1]
    if (!done || !done.done || done.recorded) return
    done.recorded = true
    const book = loadErrorbook()
    let next = book
    if (done.hadError) {
      next = recordErrors(book, [done.item], new Map([[done.item.id, done.errorCount]]))
    } else if (book.entries[done.item.id]) {
      next = recordSuccesses(book, [done.item])
    }
    if (next !== book) saveErrorbook(next)
  }, [session.cursor])

  // StrictMode 会双调用 setState 更新器，而 applyLetter 有副作用，
  // 因此用 ref 持有当前会话，在更新器外完成状态转移，保证每次按键只处理一次。
  const sessionRef = useRef(session)
  sessionRef.current = session

  const onLetter = useCallback(
    (letter: string) => {
      const prev = sessionRef.current
      if (prev.finished) return
      const result = applyLetter(prev, letter)
      sessionRef.current = result.session
      if (!result.event.correct && soundOn) playWrongBeep()
      setSession({ ...result.session })
    },
    [soundOn],
  )

  const onBackspace = useCallback(() => {
    const result = applyBackspace(sessionRef.current)
    sessionRef.current = result.session
    setSession({ ...result.session })
  }, [])

  useTypingInput({
    enabled: !session.finished,
    onLetter,
    onBackspace,
    onEscape: onExit,
  })

  useTitleTimer(metrics)

  const restart = () => {
    setSession(createSession(plan.items))
  }

  if (!currentItem) {
    return (
      <div className="lesson-page" data-testid="lesson-summary">
        <header className="lesson-header">
          <button className="btn" onClick={onExit}>← 返回课程</button>
          <h2>{plan.lesson.title}</h2>
        </header>
        <SummaryPanel session={session} metrics={metrics} onRestart={restart} />
      </div>
    )
  }

  const codeChars = currentItem.code.split('')
  const articleMode = plan.lesson.kind === 'article'

  return (
    <div className="lesson-page" data-testid="lesson-page" data-lesson={plan.lesson.id}>
      <header className="lesson-header">
        <button className="btn" onClick={onExit}>← 返回课程</button>
        <div>
          <h2>{plan.lesson.title}</h2>
          <p className="lesson-desc">{plan.lesson.description}</p>
        </div>
        <div className="lesson-actions">
          <button className="btn" onClick={() => setSoundOn((value) => !value)}>
            {soundOn ? '🔊 提示音开' : '🔇 提示音关'}
          </button>
          <button className="btn" onClick={restart}>重新开始</button>
        </div>
      </header>

      <div className="progress-line" data-testid="progress">
        <div
          className="progress-fill"
          style={{ width: `${(metrics.completed / Math.max(metrics.total, 1)) * 100}%` }}
        />
        <span className="progress-text">
          {metrics.completed} / {metrics.total}
        </span>
      </div>

      {articleMode && <ArticleText plan={plan} session={session} />}

      <section className="target-panel">
        <div className="target-main">
          <div className={`target-display ${session.lastWrongKey ? 'target-error' : ''}`} data-testid="target">
            {currentItem.display}
          </div>
          <div className="code-line" data-testid="code-line">
            {codeChars.map((char, index) => (
              <span
                key={index}
                className={`code-char ${
                  index < state.buffer.length
                    ? 'code-done'
                    : index === state.buffer.length
                      ? 'code-next'
                      : ''
                }`}
              >
                {char}
              </span>
            ))}
            {state.buffer.length > codeChars.length && <span className="code-overflow" />}
          </div>
          {currentItem.hint && <p className="target-hint">{currentItem.hint}</p>}
        </div>
        <div className="target-side">
          {currentItem.char && <Decomposition record={currentItem.char} />}
          {currentItem.phrase && (
            <PhraseHint phrase={{ ...currentItem.phrase, weight: 0, ruleMatch: true }} />
          )}
          {nextKey && (
            <div className="finger-tip" data-testid="finger-tip">
              下一个键
              <span
                className="finger-key"
                style={{ background: FINGER_COLORS[FINGER_BY_KEY[nextKey]] }}
              >
                {nextKey.toUpperCase()}
              </span>
              用{FINGER_LABELS[FINGER_BY_KEY[nextKey]]}
            </div>
          )}
        </div>
      </section>

      <Keyboard nextKey={nextKey} wrongKey={(session.lastWrongKey as WubiKey) ?? null} />

      <StatsBar metrics={metrics} session={session} />
    </div>
  )
}

/** 文章模式：把整段文字按条目进度着色（已完成/当前/未到）。 */
function ArticleText({ plan, session }: { plan: LessonPlan; session: Session }) {
  const spans: React.ReactNode[] = []
  plan.items.forEach((item, itemIndex) => {
    const chars = Array.from(item.display)
    const status =
      itemIndex < session.cursor ? 'art-done' : itemIndex === session.cursor ? 'art-current' : 'art-pending'
    chars.forEach((char, charIndex) => {
      spans.push(
        <span key={`${item.id}-${charIndex}`} className={`art-char ${status}`}>
          {char}
        </span>,
      )
    })
  })
  return (
    <div className="article-text" data-testid="article-text">
      {spans}
    </div>
  )
}

function StatsBar({ metrics, session }: { metrics: ReturnType<typeof computeMetrics>; session: Session }) {
  return (
    <div className="stats-bar" data-testid="stats">
      <Stat label="CPM 正确字/分" value={metrics.cpm.toFixed(1)} />
      <Stat label="KPM 击键/分" value={metrics.kpm.toFixed(1)} />
      <Stat label="码长" value={metrics.codeLength ? metrics.codeLength.toFixed(2) : '—'} />
      <Stat label="退格率" value={`${(metrics.backspaceRate * 100).toFixed(1)}%`} />
      <Stat label="准确率" value={`${(metrics.accuracy * 100).toFixed(1)}%`} />
      <Stat label="击键" value={String(session.stats.keystrokes)} />
      <Stat label="错误键" value={String(session.stats.wrongKeystrokes)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function SummaryPanel({
  session,
  metrics,
  onRestart,
}: {
  session: Session
  metrics: ReturnType<typeof computeMetrics>
  onRestart: () => void
}) {
  const errors = errorEntries(session)
  return (
    <div className="summary">
      <h3>本关完成 🎉</h3>
      <div className="stats-bar">
        <Stat label="CPM" value={metrics.cpm.toFixed(1)} />
        <Stat label="KPM" value={metrics.kpm.toFixed(1)} />
        <Stat label="码长" value={metrics.codeLength ? metrics.codeLength.toFixed(2) : '—'} />
        <Stat label="准确率" value={`${(metrics.accuracy * 100).toFixed(1)}%`} />
        <Stat label="用时" value={`${(metrics.elapsedMs / 1000).toFixed(0)} 秒`} />
      </div>
      <p className="muted">
        出错条目 {errors.length} 个，已加入错题本并按 SM-2 安排复习。
      </p>
      {errors.length > 0 && (
        <div className="summary-errors" data-testid="summary-errors">
          {errors.map((item) => (
            <span key={item.id} className="error-chip">
              {item.display} · {item.code}
            </span>
          ))}
        </div>
      )}
      <button className="btn btn-primary" onClick={onRestart}>再练一遍</button>
    </div>
  )
}

/** 页面标题里显示实时 CPM。 */
function useTitleTimer(metrics: { cpm: number }) {
  useEffect(() => {
    document.title =
      metrics.cpm > 0 ? `CPM ${metrics.cpm.toFixed(0)} · 五笔练习` : '五笔打字练习 · 86 版'
  }, [metrics.cpm])
}
