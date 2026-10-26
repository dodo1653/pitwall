// local dev server on port 8792: static files (no /api, so the page uses data/snapshot.json)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), f = path.join(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname))
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
}).listen(8792, '127.0.0.1', () => console.log('http://127.0.0.1:8792'))
