// Squad GP standings store (Vercel function + Upstash Redis via the Vercel integration).
//   GET  /api/board          -> the latest standings (same shape as data/snapshot.json)
//   GET  /api/board?hist=1   -> compact history: [{ t, r: [[id, rank, pnl], ...top 30] }, ...] (oldest first)
//   POST /api/board          -> the pit-lane extension sends pump.fun's competition response here (header x-pit-key)
// Env: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN). The pit key itself is never stored here:
// only its SHA-256, so the repo can be public. (A PIT_KEY env var, if set, also works.)
const PIT_KEY_SHA256 = 'b7b2147118b246423004a81554342687468763f53359168934c9636bbcb46fe6'
const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
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
  const list = Array.isArray(lb.entries) ? lb.entries : Array.isArray(raw) ? raw : []
  const entries = list.slice(0, 100).map((e, i) => ({
    id: str(e.entryId || e.id || e.participantId || e.squadId || e.groupId || e.username || e.name || String(i), 64),
    rank: num(e.rank || e.position || e.place) || i + 1,
    name: str(e.username || e.name || e.squadName || e.groupName || e.displayName || e.title, 40) || 'Squad',
    img: url(e.profileImageUrl || e.imageUrl || e.image || e.avatarUrl || e.avatar),
    pnl: num(e.pnlUsd), realized: num(e.realizedPnlUsd), unrealized: num(e.unrealizedPnlUsd), spentSol: num(e.buySpendSol),
    members: num(e.memberCount || e.membersCount || e.members?.length), positions: num(e.positionsCount),
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
    const k = req.headers.get('x-pit-key') || ''
    if (!((process.env.PIT_KEY && k === process.env.PIT_KEY) || (await sha256(k)) === PIT_KEY_SHA256)) return json({ error: 'forbidden' }, 403)
    let raw; try { raw = await req.json() } catch { return json({ error: 'bad json' }, 400) }
    const b = compact(raw)
    const prevC = JSON.parse((await redis('GET', 'board:latest')) || 'null')?.competition
    if (!b.competition.endsAt && prevC) b.competition = prevC
    // keep a small sample of what arrived, so the format can be checked (GET /api/board?sample=1)
    const first = (Array.isArray(raw?.leaderboard?.entries) ? raw.leaderboard.entries : Array.isArray(raw?.entries) ? raw.entries : Array.isArray(raw) ? raw : [])[0]
    await redis('SET', 'board:sample', JSON.stringify({ at: Date.now(), topKeys: Object.keys(raw || {}).slice(0, 30), entryKeys: first ? Object.keys(first).slice(0, 40) : null, entry: first ? JSON.stringify(first).slice(0, 1500) : null, n: b.entries.length }))
    if (b.entries.length < 3) return json({ error: 'no standings in that response' }, 400)
    // only the competition table counts (entries carry an entryId / kind 'group'); the leaderboard tab's period table is refused
    const ok = raw?.periodType === undefined && first && (first.entryId || first.kind === 'group')
    if (!ok) return json({ error: 'that is the period leaderboard, open the competition page' }, 400)
    b.source = 'competition'
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
  if (u.searchParams.get('sample')) return json(JSON.parse((await redis('GET', 'board:sample')) || 'null'))
  if (u.searchParams.get('hist')) {
    const h = await redis('LRANGE', 'board:hist', 0, -1)
    return json(h.map((x) => JSON.parse(x)), 200, 'public, s-maxage=120, stale-while-revalidate=300')
  }
  const b = await redis('GET', 'board:latest')
  if (!b || !b.includes('"source":"competition"')) return json({ error: 'no standings yet' }, 404)
  return new Response(b, { headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=20, stale-while-revalidate=60', 'access-control-allow-origin': '*' } })
}
