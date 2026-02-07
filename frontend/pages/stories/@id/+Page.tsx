import { useData } from 'vike-react/useData'
import type { Data } from './+data'

function formatDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function Page() {
  const { story } = useData<Data>()

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 md:py-14">
      <article className="max-w-3xl mx-auto">
        <a href="/stories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to library
        </a>

        <header className="mt-6 pb-8 border-b border-border">
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
            {story.title || 'Untitled Story'}
          </h1>
          {story.tagline ? <p className="mt-3 text-lg text-muted-foreground">{story.tagline}</p> : null}
          <div className="mt-4 text-xs text-muted-foreground flex flex-wrap gap-3">
            <span>{formatDate(story.created_at)}</span>
            <span>{story.author_name || 'Anonymous'}</span>
            <span>{story.like_count} likes</span>
          </div>
        </header>

        <section className="py-8 space-y-6">
          {story.lines.map((line, index) => (
            <p key={line.id} className="text-lg md:text-xl leading-relaxed">
              <span className="mr-3 text-sm text-muted-foreground align-middle">{index + 1}.</span>
              {line.text}
            </p>
          ))}
        </section>
      </article>
    </main>
  )
}
