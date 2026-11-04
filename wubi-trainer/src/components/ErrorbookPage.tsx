import { useMemo, useState } from 'react'
import {
  clearErrorbook,
  dueEntries,
  loadErrorbook,
  removeEntry,
  saveErrorbook,
  type ErrorbookEntry,
} from '../lib/trainer/errorbook'
import { buildLessonPlan, itemFromErrorbookEntry, type LessonItem } from '../lib/wubi/data'
import LessonPage from './LessonPage'

export default function ErrorbookPage({ onExit }: { onExit: () => void }) {
  const [book, setBook] = useState(() => loadErrorbook())
  const [reviewItems, setReviewItems] = useState<LessonItem[] | null>(null)
  const [onlyDue, setOnlyDue] = useState(false)
  const entries = useMemo(() => {
    const list = Object.values(book.entries).sort((a, b) => a.sm2.dueAt - b.sm2.dueAt)
    return onlyDue ? dueEntries(book) : list
  }, [book, onlyDue])

  if (reviewItems) {
    const plan = buildLessonPlan('level1', reviewItems)
    return (
      <LessonPage
        plan={{ lesson: { ...plan.lesson, id: 'errorbook-review', title: '错题复习', order: 0 }, items: reviewItems }}
        onExit={() => {
          setReviewItems(null)
          setBook(loadErrorbook())
        }}
      />
    )
  }

  const startReview = (items: ErrorbookEntry[]) => {
    setReviewItems(items.map((entry) => itemFromErrorbookEntry(entry)))
  }

  return (
    <div className="errorbook" data-testid="errorbook">
      <header className="lesson-header">
        <button className="btn" onClick={onExit}>← 返回课程</button>
        <div>
          <h2>错题本</h2>
          <p className="lesson-desc">按 SM-2 间隔重复安排复习：错的越多，回来越快。</p>
        </div>
        <div className="lesson-actions">
          <button className="btn" onClick={() => setOnlyDue((value) => !value)}>
            {onlyDue ? '显示全部' : '只看到期'}
          </button>
          <button
            className="btn"
            data-testid="review-due"
            onClick={() => startReview(dueEntries(book))}
            disabled={dueEntries(book).length === 0}
          >
            复习到期（{dueEntries(book).length}）
          </button>
          <button
            className="btn"
            onClick={() => {
              const empty = clearErrorbook()
              setBook(empty)
              saveErrorbook(empty)
            }}
          >
            清空
          </button>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="muted">还没有错题。去关卡里练一练，出错的字会自动进这里。</p>
      ) : (
        <table className="errorbook-table" data-testid="errorbook-table">
          <thead>
            <tr>
              <th>条目</th>
              <th>编码</th>
              <th>来源关卡</th>
              <th>累计错误</th>
              <th>熟练度</th>
              <th>到期</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} data-due={entry.sm2.dueAt <= Date.now() ? 'yes' : 'no'}>
                <td className="errorbook-display">{entry.display}</td>
                <td className="errorbook-code">{entry.code.toUpperCase()}</td>
                <td>{entry.lessonId}</td>
                <td>{entry.errorCount}</td>
                <td>{entry.sm2.easiness.toFixed(2)}</td>
                <td>{new Date(entry.sm2.dueAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      const next = removeEntry(book, entry.id)
                      setBook(next)
                      saveErrorbook(next)
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
