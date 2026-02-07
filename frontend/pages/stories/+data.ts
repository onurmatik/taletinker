import type { PageContextServer } from 'vike/types'
import type { StorySummary } from '../../src/api'
import { buildDjangoUrl, getForwardHeaders } from '../lib/djangoApi'

export type Data = {
  stories: StorySummary[]
}

export async function data(pageContext: PageContextServer): Promise<Data> {
  const response = await fetch(buildDjangoUrl('/api/stories/'), {
    headers: getForwardHeaders(pageContext.headers),
  })

  if (!response.ok) {
    throw new Error(`Failed to load stories: ${response.status}`)
  }

  const stories = (await response.json()) as StorySummary[]
  return { stories }
}
