// Runs inside the pump.fun page. Whenever the page receives data, look for the squads standings in it
// (recognised by their content: a list of entries with pnlUsd), however the page loads them.
(() => {
  let seen = 0, found = 0, best = null, timer = 0
  const findBoard = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 6) return null
    if (Array.isArray(o)) {
      if (o.length > 2 && o[0] && typeof o[0] === 'object' && 'pnlUsd' in o[0] && (o[0].kind === undefined || o[0].kind === 'group')) return { entries: o }
      for (const x of o.slice(0, 50)) { const r = findBoard(x, depth + 1); if (r) return r }
      return null
    }
    if (Array.isArray(o.entries) && o.entries[0] && 'pnlUsd' in o.entries[0]) return o
    for (const k of Object.keys(o).slice(0, 60)) { const r = findBoard(o[k], depth + 1); if (r) return { ...r, __parent: o } }
    return null
  }
  const report = () => window.postMessage({ __squadgpStatus: { seen, found } }, location.origin)
  const inspect = (j) => {
    seen++
    const b = findBoard(j)
    if (b) {
      found++
      const lb = b.__parent?.leaderboard === b ? b.__parent.leaderboard : b
      const comp = j.competition || b.__parent?.competition || null
      // the page may load a small preview (the top 3) before the full board: keep the biggest, send it a few seconds later
      if (!best || b.entries.length > best.leaderboard.entries.length) best = { competition: comp, leaderboard: { entries: b.entries, builtAtMs: lb.builtAtMs || Date.now(), totalRanked: lb.totalRanked || 0 } }
      clearTimeout(timer); timer = setTimeout(() => window.postMessage({ __squadgp: best }, location.origin), 4000)
    }
    report()
  }
  const f = window.fetch
  window.fetch = async function (...args) {
    const r = await f.apply(this, args)
    try { if ((r.headers.get('content-type') || '').includes('json')) r.clone().json().then(inspect).catch(() => {}) } catch {}
    return r
  }
  const open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (...a) {
    this.addEventListener('load', () => { try { if ((this.getResponseHeader('content-type') || '').includes('json')) inspect(JSON.parse(this.responseText)) } catch {} })
    return open.apply(this, a)
  }
  // standings rendered into the page itself (server-side data)
  window.addEventListener('load', () => setTimeout(() => {
    for (const s of document.querySelectorAll('script')) {
      const t = s.textContent || ''
      if (!t.includes('pnlUsd')) continue
      try { if (s.type === 'application/json') inspect(JSON.parse(t)) } catch {}
      const i = t.indexOf('[{'), m = t.match(/\[\{[^\[\]]*"pnlUsd"/)
      if (m) {
        let st = t.indexOf(m[0]), depth = 0, end = -1
        for (let k = st; k < t.length; k++) { const c = t[k]; if (c === '[') depth++; else if (c === ']') { depth--; if (!depth) { end = k + 1; break } } }
        if (end > 0) { try { inspect({ entries: JSON.parse(t.slice(st, end).replace(/\\"/g, '"')) }) } catch {} }
      }
    }
    report()
  }, 1500))
})()
