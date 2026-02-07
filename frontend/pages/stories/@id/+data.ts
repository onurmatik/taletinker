import { render } from 'vike/abort'
import type { PageContextServer } from 'vike/types'
import type { StoryData } from '../../../src/api'
import { fetchDjango } from '../../lib/djangoApi'

export type Data = {
  story: StoryData
}

export async function data(pageContext: PageContextServer): Promise<Data> {
  const id = pageContext.routeParams.id
  const response = await fetchDjango(`/api/stories/${encodeURIComponent(id)}`, pageContext.headers)

  if (response.status === 404) {
    throw render(404, 'Story not found')
  }

  if (!response.ok) {
    throw new Error(`Failed to load story: ${response.status}`)
  }

  const story = (await response.json()) as StoryData
  return { story }
}
