// Runs inside the pump.fun page: when the page itself loads the squads standings, hand a copy to the extension.
(() => {
  const isBoard = (j) => {
    const e = j && (j.leaderboard?.entries || j.entries)
    return Array.isArray(e) && e.length > 2 && e[0] && 'pnlUsd' in e[0] && (e[0].kind === undefined || e[0].kind === 'group')
  }
  const send = (j) => { if (isBoard(j)) window.postMessage({ __squadgp: j }, location.origin) }
  const f = window.fetch
  window.fetch = async function (...args) {
    const r = await f.apply(this, args)
    try {
      const u = String(args[0]?.url || args[0])
      if (/competition|leaderboard|squad/i.test(u)) r.clone().json().then(send).catch(() => {})
    } catch {}
    return r
  }
})()
