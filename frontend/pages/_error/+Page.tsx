import { usePageContext } from 'vike-react/usePageContext'

export default function Page() {
  const pageContext = usePageContext()
  const statusCode = pageContext.abortStatusCode || (pageContext.is404 ? 404 : 500)
  const message = statusCode === 404 ? 'Page not found.' : 'Something went wrong.'

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-24">
      <div className="max-w-xl mx-auto text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{statusCode}</p>
        <h1 className="text-4xl font-serif font-bold">{message}</h1>
        <a
          href="/stories"
          className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Story Library
        </a>
      </div>
    </main>
  )
}
