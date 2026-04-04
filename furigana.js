
const containsKanji = (str) => {
    return /[\u4E00-\u9FAF]/.test(str)
}

const addFurigana = (originalText, furiganaDetails) => {
    if (containsKanji(originalText) === false || furiganaDetails.length === 0) {
        return originalText
    }

    let result = ''
    let furiganaDetailsIndex = 0

    const applyFurigana = (textDetail) => {
        return `<ruby>${textDetail.text}<rt>${textDetail.ruby}</rt></ruby>`
    }

    for (let originalTextIndex = 0; originalTextIndex < originalText.length; originalTextIndex++) {
        if (furiganaDetailsIndex >= furiganaDetails.length) {
            result += originalText.substring(originalTextIndex)
            break
        }

        const furiganaDetail = furiganaDetails[furiganaDetailsIndex]
        const textForSearch = originalText.substring(originalTextIndex)

        if (textForSearch.startsWith(furiganaDetail.text)) {
            if (containsKanji(furiganaDetail.text) && furiganaDetail.ruby.length > 0) {
                result += applyFurigana(furiganaDetail)
            } else {
                result += furiganaDetail.text
            }
            originalTextIndex += furiganaDetail.text.length - 1 // Adjust index as `for` increments it
            furiganaDetailsIndex++
        } else {
            result += originalText[originalTextIndex]
        }
    }

    return result
}

const fetchFuriganaApi = async (textList) => {
    try {
        const response = await chrome.runtime.sendMessage({ msg: 'fetch-furigana', textList })
        return response ?? []
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error)
        return []
    }
}

const isExcludeTag = (element) =>
    element.tagName === 'SCRIPT' || element.tagName === 'R'

const isExcludeParentTag = (element) => {
    const parent = element.parentNode
    if (!parent) return false
    if (parent.tagName === 'RUBY') return true
    if (parent.tagName === 'STYLE') return true
    if (parent.tagName === 'NOSCRIPT') return true
    if (parent.tagName === 'R' && parent.className.includes('js-furigana')) return true
    return false
}

const encodeHtmlEntities = (text) => {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
}

const getTextNodes = (elements, stocks = []) => {
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
            getTextNodes(element.childNodes, stocks)
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
    if (typeof apiResponse[index].furiganaDetails === 'undefined') {
        return false
    }
    return true
}

const isValidElementForAddRubyTag = (element) =>
    !!element.parentNode

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

    if (Array.isArray(apiResponse) && apiResponse.length === 0) {
        return
    }

    for (const [index, element] of Array.from(textElements).entries()) {
        if (isValidApiResponseOnIndex(apiResponse, index) === false) {
            continue
        }
        const furiganaTag = addFurigana(apiResponse[index].originalText, apiResponse[index].furiganaDetails)
        if (isValidElementForAddRubyTag(element) === false) {
            continue
        }
        if (furiganaTag === element.parentNode.innerHTML) {
            continue
        }
        addFuriganaToNode(element, furiganaTag)
    }
}

const BATCH_SIZE = 50

const processNextBatch = (textElements, index) => {
    if (index >= textElements.length) return
    const batch = textElements.slice(index, index + BATCH_SIZE)
    addFuriganaToTextNodes(batch).then(() => {
        // イベントループに制御を返してUIのフリーズを防ぐ
        setTimeout(() => processNextBatch(textElements, index + BATCH_SIZE), 0)
    })
}

const isInViewport = (element) => {
    const target = element.nodeType === Node.TEXT_NODE ? element.parentElement : element
    if (!target) return false
    const rect = target.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom > 0
}

const main = () => {
    const bodyElements = document.getElementsByTagName('body')
    const textElements = getTextNodes(bodyElements)
    const inViewport = textElements.filter(el => isInViewport(el))    
    const outOfViewport = textElements.filter(el => !isInViewport(el))

    processNextBatch([...inViewport, ...outOfViewport], 0)
}

// MEMO: webページの変更を監視する MutationObserver周りの設定
const FgMutationObserver = {
    config: { attributes: true, childList: true, subtree: true },

    callback: async (mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                const textElements = getTextNodes(mutation.addedNodes)
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
    FgMutationObserver.observe(document.body)

    main()

    showFuriganaIfHide()
}

const furiganaSwitchOff = () => {
    hideFurigana()
}


const asyncPopupEventListener = async (request) => {
    if (request.msg === 'popup-furigana-on') {
        chrome.storage.local.set({furiganaMode: true})
        await furiganaSwitchOn()
        return true

    } else if (request.msg === 'popup-furigana-off') {
        chrome.storage.local.set({furiganaMode: false})
        await furiganaSwitchOff()
        return true
    }
    return false
}
// chrome拡張機能のポップアップ画面から「ふりがなON」「ふりがなOFF」の選択肢が変わったとき
const setPopupEventListener = () => {
    chrome.runtime.onMessage.addListener((request) => {
        asyncPopupEventListener(request)
        return true
    })
}


// ページが読み込まれたタイミングで実行される
chrome.storage.local.get(null, (options) => {
    setPopupEventListener()
    const furiganaMode = options.furiganaMode ?? true
    if (furiganaMode) {
        furiganaSwitchOn()
    } else {
        furiganaSwitchOff()
    }
})
