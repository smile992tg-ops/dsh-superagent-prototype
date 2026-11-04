import { useState } from 'react'
import HomePage from './components/HomePage'
import LessonPage from './components/LessonPage'
import ErrorbookPage from './components/ErrorbookPage'
import { buildLessonPlan } from './lib/wubi/data'

type View = { page: 'home' } | { page: 'lesson'; lessonId: string } | { page: 'errorbook' }

export default function App() {
  const [view, setView] = useState<View>({ page: 'home' })
  const [progress, setProgress] = useState<Record<string, number>>(() => loadProgress())

  if (view.page === 'lesson') {
    const plan = buildLessonPlan(view.lessonId)
    return (
      <LessonPage
        key={view.lessonId}
        plan={plan}
        onExit={() => {
          setProgress((prev) => {
            const next = { ...prev, [view.lessonId]: (prev[view.lessonId] ?? 0) + 1 }
            saveProgress(next)
            return next
          })
          setView({ page: 'home' })
        }}
      />
    )
  }
  if (view.page === 'errorbook') {
    return <ErrorbookPage onExit={() => setView({ page: 'home' })} />
  }
  return (
    <HomePage
      progress={progress}
      onStart={(lessonId) => setView({ page: 'lesson', lessonId })}
      onErrorbook={() => setView({ page: 'errorbook' })}
    />
  )
}

const PROGRESS_KEY = ['wubi', 'trainer', 'progress', 'v1'].join('-')

function loadProgress(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function saveProgress(progress: Record<string, number>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}
