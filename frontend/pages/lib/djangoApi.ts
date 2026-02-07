type RequestHeaders = Record<string, string> | null

function trimOrigin(value: string) {
  return value.replace(/\/+$/, '')
}

function getRequestOrigin(headers: RequestHeaders) {
  if (!headers) return null
  const host = headers['x-forwarded-host'] || headers.host
  if (!host) return null
  const proto = (headers['x-forwarded-proto'] || 'https').split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`
}

function getCandidateOrigins(headers: RequestHeaders) {
  const candidates = [
    process.env.DJANGO_ORIGIN,
    getRequestOrigin(headers),
    'http://127.0.0.1:8000',
  ].filter((value): value is string => Boolean(value))

  return [...new Set(candidates.map(trimOrigin))]
}

export function buildDjangoUrl(pathname: string, origin: string) {
  return `${origin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

export function getForwardHeaders(headers: RequestHeaders): HeadersInit {
  const forwarded: Record<string, string> = {
    accept: 'application/json',
  }

  const cookie = headers?.cookie
  if (cookie) {
    forwarded.cookie = cookie
  }

  return forwarded
}

export async function fetchDjango(
  pathname: string,
  headers: RequestHeaders,
  init: RequestInit = {},
) {
  const origins = getCandidateOrigins(headers)
  let lastError: unknown = null

  for (const origin of origins) {
    try {
      return await fetch(buildDjangoUrl(pathname, origin), {
        ...init,
        headers: {
          ...getForwardHeaders(headers),
          ...(init.headers || {}),
        },
      })
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }
  throw new Error('No Django origin candidates available')
}
