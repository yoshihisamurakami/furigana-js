
const FuriganaApiUrl = 'http://localhost:8080/v2/furigana'

const containsKanji = (str) => {
    return /[\u4E00-\u9FAF]/.test(str)
}

const addFurigana = (originalText, furiganaObj) => {
    let result = ''
    let currentIndex = 0

    let count = 0
    let furiganaObjStartIndex = 0

    while (currentIndex < originalText.length) {
        count += 1
        if (count > 10000) {
            console.log('### addFurigana関数でループが異常')
            break
        }
        let found = false

        for (let i = furiganaObjStartIndex; i < furiganaObj.length; i++) {
            const obj = furiganaObj[i]
            if (obj.text == '') {
                continue
            }
            if (containsKanji(obj.text) === false) {
                continue
            }
            if (originalText.startsWith(obj.text, currentIndex)) {
                if (obj.ruby) {
                    result += `<ruby>${obj.text}<rt>${obj.ruby}</rt></ruby>`
                } else {
                    result += obj.text
                }
                currentIndex += obj.text.length
                found = true
                furiganaObjStartIndex = i + 1
                break
            }
        }

        if (!found) {
            result += originalText[currentIndex]
            currentIndex++
        }
    }
    return result
}

const fetchFuriganaApi = async (originalText) => {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText })
    }

    const data = await fetch(FuriganaApiUrl, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json()
        })
        .then(data => {
            return data
        })
        .catch(error => {
            console.log('There was a problem with the fetch operation: ')
            return {response: []}
        })
    
    return data
}

const isExcludeTag = (element) => {
    if (element.tagName === 'SCRIPT') {
        return true
    } else if (element.tagName === 'R') {
        return true
    }
    return false
}

const isExcludeParentTag = (element) => {
    const parent = element.parentNode
    if (parent && parent.tagName === 'RUBY') {
        return true
    }
    if (parent && parent.tagName === 'STYLE') {
        return true
    }
    if (parent && parent.tagName === 'NOSCRIPT') {
        return true
    }
    if (parent && parent.tagName === 'R' && parent.className.includes('js-furigana')) {
        return true
    }
    if (parent && parent.tagName === 'SPAN' && parent.className.includes('js-furigana')) {
        return true
    }
    return false
}

const encodeHtmlEntities = (text) => {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
}

const getTextNodes = async (elements, stocks = []) => {
    for (const element of Array.from(elements)) {
        if (isExcludeTag(element) === true) {
            continue
        }
        if (isExcludeParentTag(element) === true) {
            return
        }
        if (element.nodeType === Node.TEXT_NODE) {
            const originalText = encodeHtmlEntities(element.textContent).trim()
            if (originalText.length !== 0) {
                stocks.push(element)
            }
        } else if (element.nodeType === Node.ELEMENT_NODE && element.hasChildNodes()) {
            await getTextNodes(element.childNodes, stocks)
        }
    }
    return stocks
}

const addFuriganaToTextNodes = async (textElements) => {
    let textList = textElements.map(element => encodeHtmlEntities(element.textContent).trim())
    if (textList.length == 0) {
        return
    }

    const apiResponse = await fetchFuriganaApi(textList)
    const response  = apiResponse.response
    if (typeof response === 'undefined') {
        return
    }

    for (const [index, element] of Array.from(textElements).entries()) {
        if (typeof response[index] === 'undefined') {
            continue
        }
        const originalText = response[index].originalText
        if (typeof originalText === 'undefined') {
            continue
        }
        const text = response[index].text // API側で textList とするほうが適切かも
        if (typeof text === 'undefined') {
            continue
        }
        const textWithRuby = addFurigana(originalText, text)
        if (typeof element.parentNode === 'undefined') { continue }
        if (typeof element.parentNode.innerHTML === 'undefined') { continue }
        if (textWithRuby === element.parentNode.innerHTML) {
            continue
        }
        // MEMO: <span>タグを追加した場合、ページに設定されているスタイルを拾ってしまうことがあるため、<r>タグという非標準のタグを使う
        let newElement = document.createElement('r')
        newElement.className = element.className ? element.className + ' js-furigana' : 'js-furigana';
        newElement.innerHTML = textWithRuby
        const parent = element.parentNode
        if (parent) {
            parent.replaceChild(newElement, element)
        }
    }
}

const main = async () => {
    const bodyElements = document.getElementsByTagName('body')
    const textElements = await getTextNodes(bodyElements)
    await addFuriganaToTextNodes(textElements)
}

const mutationObserverConfig = { attributes: true, childList: true, subtree: true }

const mutationObserverCallback = async (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            const textElements = await getTextNodes(mutation.addedNodes)
            await addFuriganaToTextNodes(textElements)
        }
    }
}

// コールバック関数に結びつけられたオブザーバーのインスタンスを生成
const observer = new MutationObserver(mutationObserverCallback)

const furiganaSwitchOn = async () => {
    setTimeout(async function() {
        await main()

        // 対象ノードの設定された変更の監視を開始
        observer.observe(document.body, mutationObserverConfig)
    }, 0)

    const styleElement = document.getElementById('hide-furigana-style')
    if (styleElement) {
        styleElement.parentNode.removeChild(styleElement)
    }
}

const furiganaSwitchOff = async () => {
    const css = '.js-furigana rt { display: none; }'
    const style = document.createElement('style')
    style.id = 'hide-furigana-style'
    style.appendChild(document.createTextNode(css))
    document.getElementsByTagName('head')[0].appendChild(style)
}

// chrome拡張機能のポップアップ画面から「ふりがなON」「ふりがなOFF」の選択肢が変わったとき
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.msg === 'popup-furigana-on') {
        chrome.storage.local.set({furiganaMode: true})
        await furiganaSwitchOn()
    } else if (request.msg === 'popup-furigana-off') {
        chrome.storage.local.set({furiganaMode: false})
        await furiganaSwitchOff()
    }
})

// ページが読み込まれたタイミングで実行される
chrome.storage.local.get(null, (options) => {
    const furiganaMode = typeof options.furiganaMode === 'undefined' ? true : options.furiganaMode
    if (furiganaMode) {
        furiganaSwitchOn()
    } else {
        furiganaSwitchOff()
    }
})
