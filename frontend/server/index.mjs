import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { renderPage } from 'vike/server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 5173)
const djangoOrigin = process.env.DJANGO_ORIGIN || 'http://127.0.0.1:8000'

void startServer()

async function startServer() {
  const app = express()
  app.disable('x-powered-by')

  const djangoProxy = createProxyMiddleware({
    target: djangoOrigin,
    changeOrigin: true,
    xfwd: true,
    ws: true,
    logLevel: isProduction ? 'warn' : 'silent',
  })

  app.use(['/api', '/auth', '/admin'], djangoProxy)

  let viteDevServer = null

  if (isProduction) {
    app.use(express.static(path.join(rootDir, 'dist', 'client'), { index: false }))
  } else {
    const { createServer } = await import('vite')
    viteDevServer = await createServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(viteDevServer.middlewares)
  }

  app.use(async (req, res, next) => {
    try {
      const pageContext = await renderPage({
        urlOriginal: req.originalUrl,
        headersOriginal: req.headers,
      })
      const { httpResponse } = pageContext
      if (!httpResponse) {
        return next()
      }

      const { statusCode, headers } = httpResponse
      for (const [name, value] of headers) {
        res.setHeader(name, value)
      }

      const body = await httpResponse.getBody()
      res.status(statusCode).send(body)
    } catch (error) {
      if (viteDevServer) {
        viteDevServer.ssrFixStacktrace(error)
      }
      next(error)
    }
  })

  app.listen(port, () => {
    const env = isProduction ? 'production' : 'development'
    // eslint-disable-next-line no-console
    console.log(`[vike] ${env} server running on http://localhost:${port}`)
  })
}
