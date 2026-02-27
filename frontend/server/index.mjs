import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { renderPage } from 'vike/server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const isProduction = process.env.NODE_ENV === 'production'
const cliArgs = parseCliArgs(process.argv.slice(2))
const host = cliArgs.host || process.env.HOST || '127.0.0.1'
const port = Number(cliArgs.port || process.env.PORT || 5173)
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
    pathRewrite: (_path, req) => req.originalUrl || req.url,
  })

  app.use((req, res, next) => {
    const isDjangoRoute =
      req.url === '/api' ||
      req.url.startsWith('/api/') ||
      req.url === '/auth' ||
      req.url.startsWith('/auth/') ||
      req.url === '/admin' ||
      req.url.startsWith('/admin/')

    if (isDjangoRoute) {
      return djangoProxy(req, res, next)
    }
    return next()
  })

  let viteDevServer = null

  if (isProduction) {
    const distDir = path.join(rootDir, 'dist')
    const clientDistDir = path.join(distDir, 'client')
    const clientAssetsDir = path.join(clientDistDir, 'assets')
    const legacyAssetsDir = path.join(distDir, 'assets')
    const clientImagesDir = path.join(clientDistDir, 'images')
    const legacyImagesDir = path.join(distDir, 'images')

    app.use(express.static(clientDistDir, { index: false }))
    app.use('/assets', express.static(clientAssetsDir))
    app.use('/assets', express.static(legacyAssetsDir))
    app.use('/images', express.static(clientImagesDir))
    app.use('/images', express.static(legacyImagesDir))
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

  app.listen(port, host, () => {
    const env = isProduction ? 'production' : 'development'
    // eslint-disable-next-line no-console
    console.log(`[vike] ${env} server running on http://${host}:${port}`)
  })
}

function parseCliArgs(args) {
  const parsed = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--port' && args[i + 1]) {
      parsed.port = args[i + 1]
      i += 1
    } else if (arg.startsWith('--port=')) {
      parsed.port = arg.split('=')[1]
    } else if (arg === '--host' && args[i + 1]) {
      parsed.host = args[i + 1]
      i += 1
    } else if (arg.startsWith('--host=')) {
      parsed.host = arg.split('=')[1]
    }
  }
  return parsed
}
