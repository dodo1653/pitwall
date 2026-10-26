const $ = (id) => document.getElementById(id)
chrome.storage.local.get(['site', 'key', 'lastStatus'], ({ site, key, lastStatus }) => {
  $('site').value = site || ''; $('key').value = key || ''
  $('st').textContent = lastStatus ? `${lastStatus.ok ? 'Last sent' : 'Last error'}: ${new Date(lastStatus.at).toLocaleTimeString()}${lastStatus.ok ? '' : ' - ' + lastStatus.error}` : 'Then open pump.fun/competitions/squad-invitiational and leave the tab open.'
})
$('save').onclick = () => chrome.storage.local.set({ site: $('site').value.trim(), key: $('key').value.trim() }, () => { $('st').textContent = 'Saved. Open pump.fun/competitions/squad-invitiational and leave the tab open.' })
