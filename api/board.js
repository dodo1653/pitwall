// Squad GP standings store (Vercel function + Upstash Redis via the Vercel integration).
//   GET  /api/board          -> the latest standings (same shape as data/snapshot.json)
//   GET  /api/board?hist=1   -> compact history: [{ t, r: [[id, rank, pnl], ...top 30] }, ...] (oldest first)
//   POST /api/board          -> the pit-lane extension sends pump.fun's competition response here (header x-pit-key)
// Env: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN), PIT_KEY (a shared secret, set in Vercel).
export const config = { runtime: 'edge' }

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const redis = async (...cmd) => {
  const r = await fetch(URL_, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) })
  const j = await r.json()
  if (j.error) throw new Error(j.error)
  return j.result
}
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cache, 'access-control-allow-origin': '*' } })
const num = (v) => (Number.isFinite(+v) ? +v : 0)
const str = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : '')
const url = (v) => (typeof v === 'string' && /^https:\/\//.test(v) ? v.slice(0, 300) : null)

// pump.fun's competition response -> our compact standings (only the fields we show, all validated)
function compact(raw) {
  const c = raw.competition || {}, lb = raw.leaderboard || raw
  const entries = (Array.isArray(lb.entries) ? lb.entries : []).slice(0, 100).map((e) => ({
    id: str(e.entryId, 64), rank: num(e.rank), name: str(e.username, 40) || 'Squad', img: url(e.profileImageUrl),
    pnl: num(e.pnlUsd), realized: num(e.realizedPnlUsd), unrealized: num(e.unrealizedPnlUsd), spentSol: num(e.buySpendSol),
    members: num(e.memberCount), positions: num(e.positionsCount),
    top: (Array.isArray(e.topPositions) ? e.topPositions : []).slice(0, 5).map((p) => ({ mint: str(p.mint, 64), symbol: str(p.symbol, 20), name: str(p.name, 40), img: url(p.imageUri) })),
  })).filter((e) => e.id && e.rank > 0)
  return {
    competition: { title: str(c.title), prizeCopy: str(c.prizeCopy, 20), startsAt: str(c.startsAt, 40), endsAt: str(c.endsAt, 40), entriesCount: num(c.entriesCount), participants: num(c.participants), phase: str(c.phase, 20) },
    builtAtMs: num(lb.builtAtMs) || Date.now(), totalRanked: num(lb.totalRanked), receivedAt: Date.now(), entries,
  }
}

export default async function handler(req) {
  if (!URL_ || !TOKEN) return json({ error: 'storage not connected' }, 503)
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type, x-pit-key' } })
  if (req.method === 'POST') {
    if (!process.env.PIT_KEY || req.headers.get('x-pit-key') !== process.env.PIT_KEY) return json({ error: 'forbidden' }, 403)
    let raw; try { raw = await req.json() } catch { return json({ error: 'bad json' }, 400) }
    const b = compact(raw)
    const prevC = JSON.parse((await redis('GET', 'board:latest')) || 'null')?.competition
    if (!b.competition.endsAt && prevC) b.competition = prevC
    if (b.entries.length < 3) return json({ error: 'no standings in that response' }, 400)
    const prev = JSON.parse((await redis('GET', 'board:latest')) || 'null')
    if (prev && prev.builtAtMs >= b.builtAtMs) return json({ ok: true, unchanged: true })
    await redis('SET', 'board:latest', JSON.stringify(b))
    // history: one compact point every 5 minutes, two weeks' worth
    const last = num(await redis('GET', 'board:histAt'))
    if (b.builtAtMs - last >= 5 * 60e3) {
      await redis('RPUSH', 'board:hist', JSON.stringify({ t: b.builtAtMs, r: b.entries.slice(0, 30).map((e) => [e.id, e.rank, Math.round(e.pnl)]) }))
      await redis('LTRIM', 'board:hist', -4200, -1)
      await redis('SET', 'board:histAt', String(b.builtAtMs))
    }
    return json({ ok: true, squads: b.entries.length, builtAtMs: b.builtAtMs })
  }
  const u = new URL(req.url)
  if (u.searchParams.get('hist')) {
    const h = await redis('LRANGE', 'board:hist', 0, -1)
    return json(h.map((x) => JSON.parse(x)), 200, 'public, s-maxage=120, stale-while-revalidate=300')
  }
  const b = await redis('GET', 'board:latest')
  if (!b) return json({ error: 'no standings yet' }, 404)
  return new Response(b, { headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=20, stale-while-revalidate=60', 'access-control-allow-origin': '*' } })
}
