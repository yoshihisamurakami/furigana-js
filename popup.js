
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
  chrome.storage.local.get(null, (options) => {
    const furiganaMode = options.furiganaMode ?? true
    if (furiganaMode) {
      document.querySelector('input[name="form_furigana"][value="on"]').checked = true
    } else {
      document.querySelector('input[name="form_furigana"][value="off"]').checked = true
    }
  })

  // 各ラジオボタンに対してイベントリスナーを設定
  const handlers = {
    on:  onChangeFuriganaOn,
    off: onChangeFuriganaOff,
  }
  const radios = document.querySelectorAll('input[name="form_furigana"]')
  radios.forEach(radio => {
    radio.addEventListener('change', handlers[radio.value])
  })
})
