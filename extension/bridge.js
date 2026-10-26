// Content script: passes the standings to the background worker, refreshes the page once a minute,
// and shows a small status line so you can see it is working.
let last = 0, sentOk = null, info = { seen: 0, found: 0 }
window.addEventListener('message', (ev) => {
  if (ev.source === window && ev.data && ev.data.__squadgpStatus) { info = ev.data.__squadgpStatus; if (!sentOk) status(null) }
})
window.addEventListener('message', (ev) => {
  if (ev.source !== window || ev.origin !== location.origin || !ev.data || !ev.data.__squadgp) return
  if (Date.now() - last < 20000) return
  last = Date.now()
  chrome.runtime.sendMessage({ type: 'board', data: ev.data.__squadgp }, (res) => status(res))
})
function status(res) {
  let el = document.getElementById('squadgp-pitlane')
  if (!el) {
    el = document.createElement('div'); el.id = 'squadgp-pitlane'
    el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.75);color:#fff;font:12px system-ui;pointer-events:none'
    document.documentElement.appendChild(el)
  }
  if (res) sentOk = res
  const r = res || sentOk
  el.textContent = r && r.ok ? `Squad GP: standings sent ${new Date().toLocaleTimeString()}` : r ? `Squad GP: ${r.error}` : `Squad GP: watching (${info.seen} responses, ${info.found} with standings)`
}
setTimeout(() => status(null), 2500)
// refresh once a minute, like pressing F5 (only while the squads tab is showing)
setInterval(() => { if (/^\/competitions\//.test(location.pathname) || /tab=squads/.test(location.search)) location.reload() }, 60000)
