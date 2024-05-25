
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
            return data.response
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

const isValidApiResponseOnIndex = (apiResponse, index) => {
    if (typeof apiResponse[index] === 'undefined') {
        return false
    }
    if (typeof apiResponse[index].originalText === 'undefined') {
        return false
    }
    // API側で apiResponse[index].textList とするほうが適切かも)
    if (typeof apiResponse[index].text === 'undefined') {
        return false
    }
    return true
}

const isValidElementForAddRubyTag = (element) => {
    if (typeof element.parentNode === 'undefined') {
        return false
    }
    if (element.parentNode === null) {
        return false
    }
    if (typeof element.parentNode.innerHTML === 'undefined') {
        return false
    }
    return true
}

const addFuriganaToNode = (element, furiganaTag) => {
    // MEMO:
    // ふりがな挿入用のタグを <span class="js-furigana"> .. </span>
    // とした場合、素の<span>タグに何らかのスタイルが割り当てられているページに適用すると、
    // そのスタイルがふりがなタグ全体に適用されてしまいページ表示が崩れることがある。
    // その現象を防ぐため、<r>タグという非標準のタグを使った。
    let newElement = document.createElement('r')
    newElement.className = element.className ? element.className + ' js-furigana' : 'js-furigana';
    newElement.innerHTML = furiganaTag
    const parent = element.parentNode
    if (parent) {
        parent.replaceChild(newElement, element)
    }
}

const addFuriganaToTextNodes = async (textElements) => {
    let textList = textElements.map(element => encodeHtmlEntities(element.textContent).trim())
    if (textList.length === 0) {
        return
    }

    const apiResponse = await fetchFuriganaApi(textList)
    if (typeof apiResponse === 'undefined') {
        return
    }

    for (const [index, element] of Array.from(textElements).entries()) {
        if (isValidApiResponseOnIndex(apiResponse, index) === false) {
            continue
        }
        const furiganaTag = addFurigana(apiResponse[index].originalText, apiResponse[index].text)
        if (isValidElementForAddRubyTag(element) === false) {
            continue
        }
        if (furiganaTag === element.parentNode.innerHTML) {
            continue
        }
        addFuriganaToNode(element, furiganaTag)
    }
}

const main = async () => {
    const bodyElements = document.getElementsByTagName('body')
    const textElements = await getTextNodes(bodyElements)
    await addFuriganaToTextNodes(textElements)
}

// MEMO: webページの変更を監視する MutationObserver周りの設定
const FgMutationObserver = {
    config: { attributes: true, childList: true, subtree: true },

    callback: async (mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                const textElements = await getTextNodes(mutation.addedNodes)
                await addFuriganaToTextNodes(textElements)
            }
        }
    },

    observe: function(node = document.body) {
        // コールバック関数に結びつけられたオブザーバーのインスタンスを生成
        const observer = new MutationObserver(this.callback)
        // 対象ノードの設定された変更の監視を開始
        observer.observe(node, this.config)
    }
}

const showFuriganaIfHide = () => {
    const styleElement = document.getElementById('hide-furigana-style')
    if (styleElement) {
        styleElement.parentNode.removeChild(styleElement)
    }
}

const hideFurigana = () => {
    const css = '.js-furigana rt { display: none; }'
    const style = document.createElement('style')
    style.id = 'hide-furigana-style'
    style.appendChild(document.createTextNode(css))
    document.getElementsByTagName('head')[0].appendChild(style)
}

const furiganaSwitchOn = async () => {
    setTimeout(async function() {
        await main()

        FgMutationObserver.observe(document.body)
    }, 0)

    showFuriganaIfHide()
}

const furiganaSwitchOff = async () => {
    hideFurigana()
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
