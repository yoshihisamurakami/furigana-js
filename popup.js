
const onChangeFuriganaOn = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const ret = chrome.tabs.sendMessage(tab.id, {"msg":"popup-furigana-on"})
  ret.then(() => {
  }).catch(() => {
    console.log('fail sendMessage.. FuriganaOn')
  })
}

const onChangeFuriganaOff = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const ret = chrome.tabs.sendMessage(tab.id, {"msg":"popup-furigana-off"})
  ret.then(() => {
  }).catch(() => {
    console.log('fail sendMessage.. FuriganaOff')
  })
}

window.addEventListener("DOMContentLoaded", async (_) => {
  chrome.storage.local.get(null, (options) => {
    const furiganaMode = typeof options.furiganaMode === 'undefined' ? true : options.furiganaMode
    if (furiganaMode) {
      document.querySelector('input[name="form_furigana"][value="on"]').checked = true
    } else {
      document.querySelector('input[name="form_furigana"][value="off"]').checked = true
    }
  })

  // 各ラジオボタンに対してイベントリスナーを設定
  const radios = document.querySelectorAll('input[name="form_furigana"]')
  radios[0].addEventListener('change', onChangeFuriganaOn)
  radios[1].addEventListener('change', onChangeFuriganaOff)
})
