import { useData } from 'vike-react/useData'
import type { Data } from './+data'

function formatDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function Page() {
  const { stories } = useData<Data>()

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 md:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Open editor
          </a>
          <h1 className="mt-3 text-4xl md:text-5xl font-serif font-bold tracking-tight">Story Library</h1>
          <p className="mt-2 text-muted-foreground">Server-rendered story content pages powered by Vike.</p>
        </div>

        <div className="grid gap-4">
          {stories.map((story) => (
            <a
              key={story.uuid}
              href={`/stories/${story.uuid}`}
              className="block rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-serif font-semibold">{story.title || 'Untitled Story'}</h2>
              {story.tagline ? (
                <p className="mt-1 text-sm text-muted-foreground">{story.tagline}</p>
              ) : null}
              <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-3">
                <span>{formatDate(story.created_at)}</span>
                <span>{story.length} lines</span>
                <span>{story.author_name || 'Anonymous'}</span>
                <span>{story.like_count} likes</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
