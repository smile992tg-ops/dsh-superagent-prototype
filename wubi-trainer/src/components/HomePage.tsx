import { LESSONS } from '../lib/wubi/lessons'
import { WUBI_DATA } from '../lib/wubi/data'

interface HomePageProps {
  onStart: (lessonId: string) => void
  onErrorbook: () => void
  progress: Record<string, number>
}

export default function HomePage({ onStart, onErrorbook, progress }: HomePageProps) {
  const { meta } = WUBI_DATA
  return (
    <div className="home" data-testid="home">
      <header className="hero">
        <p className="eyebrow">五笔 86 版 · 纯前端 · 浏览器直接打开</p>
        <h1>五笔打字练习</h1>
        <p className="lede">
          从字根到文章：{meta.characterCount} 个常用字（通用规范汉字表一级）、
          {' '}
          {Object.values(meta.phraseCounts).reduce((a, b) => a + b, 0)} 条词组，编码器与码表逐字比对一致。
        </p>
        <p className="hero-meta" data-testid="data-meta">
          数据版本 {meta.version} · 码表来源 Rime wubi86.dict.yaml（极点 86）· 3500 字比对 0 差异
        </p>
      </header>

      <section className="lesson-grid">
        {LESSONS.map((lesson) => (
          <button
            key={lesson.id}
            className="lesson-card"
            style={{ '--accent': lesson.accent } as React.CSSProperties}
            onClick={() => onStart(lesson.id)}
            data-testid={`lesson-${lesson.id}`}
          >
            <span className="lesson-order">第 {lesson.order} 关</span>
            <span className="lesson-title">{lesson.title}</span>
            <span className="lesson-subtitle">{lesson.subtitle}</span>
            <span className="lesson-count">
              {lesson.kind === 'article' ? '整段文章' : `${lesson.targetCount} 个条目`}
              {progress[lesson.id] ? ` · 已完成 ${progress[lesson.id]} 次` : ''}
            </span>
          </button>
        ))}
        <button className="lesson-card lesson-card-review" onClick={onErrorbook} data-testid="errorbook-entry">
          <span className="lesson-order">复习</span>
          <span className="lesson-title">错题本</span>
          <span className="lesson-subtitle">SM-2 间隔重复，定向复练薄弱字根</span>
          <span className="lesson-count">查看到期条目</span>
        </button>
      </section>

      <section className="home-notes">
        <p>
          练习时直接敲键盘即可：应用监听物理键位（event.code），不需要切换输入法；
          敲错的键会闪红，可在设置里打开提示音。关卡顺序按真实教学递进设计，
          零基础用户从第 1 关开始即可。
        </p>
      </section>
    </div>
  )
}
