
const sendFuriganaMessage = async (msg) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    await chrome.tabs.sendMessage(tab.id, { msg })
  } catch {
    console.log(`fail sendMessage.. ${msg}`)
  }
}

const onChangeFuriganaOn  = () => sendFuriganaMessage('popup-furigana-on')
const onChangeFuriganaOff = () => sendFuriganaMessage('popup-furigana-off')

window.addEventListener("DOMContentLoaded", async (_) => {
  const toggle = document.getElementById('furigana-toggle')

  chrome.storage.local.get(null, (options) => {
    toggle.checked = options.furiganaMode ?? true
  })

  toggle.addEventListener('change', () => {
    const msg = toggle.checked ? 'popup-furigana-on' : 'popup-furigana-off'
    sendFuriganaMessage(msg)
  })
})
