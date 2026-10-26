// Sends the standings to the Squad GP site saved in the popup (site address + pit key).
importScripts('local.js')            // site + key, kept on this PC only (local.js is not in git)
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type !== 'board') return
  chrome.storage.local.get(['site', 'key'], async (saved) => {
    const site = saved.site || self.PITLANE?.site, key = saved.key || self.PITLANE?.key
    if (!site || !key) { reply({ ok: false, error: 'open the extension and enter your site + pit key' }); return }
    try {
      const r = await fetch(site.replace(/\/+$/, '') + '/api/board', { method: 'POST', headers: { 'content-type': 'application/json', 'x-pit-key': key }, body: JSON.stringify(msg.data) })
      const j = await r.json().catch(() => ({}))
      const res = r.ok ? { ok: true, ...j } : { ok: false, error: j.error || 'HTTP ' + r.status }
      chrome.storage.local.set({ lastStatus: { at: Date.now(), ...res } })
      chrome.action.setBadgeText({ text: res.ok ? 'ON' : 'ERR' }); chrome.action.setBadgeBackgroundColor({ color: res.ok ? '#1f8f4e' : '#b3261e' })
      reply(res)
    } catch (e) { reply({ ok: false, error: String(e.message || e) }) }
  })
  return true
})
