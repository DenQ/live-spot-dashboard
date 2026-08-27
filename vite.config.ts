import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function githubPagesBase(): string {
  if (process.env.GITHUB_PAGES !== 'true') {
    return '/'
  }

  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  return repo ? `/${repo}/` : '/'
}

function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const indexHtml = fileURLToPath(new URL('./dist/index.html', import.meta.url))
      const notFoundHtml = fileURLToPath(new URL('./dist/404.html', import.meta.url))

      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, notFoundHtml)
      }
    },
  }
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [react(), spaFallback404()],
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
