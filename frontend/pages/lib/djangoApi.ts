export function getDjangoOrigin() {
  return (process.env.DJANGO_ORIGIN || 'http://127.0.0.1:8000').replace(/\/+$/, '')
}

export function buildDjangoUrl(pathname: string) {
  return `${getDjangoOrigin()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

export function getForwardHeaders(headers: Record<string, string> | null): HeadersInit {
  const forwarded: Record<string, string> = {
    accept: 'application/json',
  }

  const cookie = headers?.cookie
  if (cookie) {
    forwarded.cookie = cookie
  }

  return forwarded
}
