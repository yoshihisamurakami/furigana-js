
const FuriganaApiUrl = 'http://localhost:8080/furigana'

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
        })
    
    return data
}

const getTextNodes = async (elements, stocks) => {
    for (const element of Array.from(elements)) {
        if (element.tagName === 'SCRIPT') {
            continue // スクリプト要素はスキップ
        }
        if (element.tagName === 'R') {
            continue // R要素はスキップ
        }
        const parent = element.parentNode
        if (parent && parent.tagName === 'RUBY') {
            return
        }
        if (parent && parent.tagName === 'STYLE') {
            return
        }
        if (parent && parent.tagName === 'NOSCRIPT') {
            return
        }
        if (parent && parent.tagName === 'R' && parent.className.includes('js-furigana')) {
            return
        }
        if (element.nodeType === Node.TEXT_NODE) {
            const originalText = element.textContent.trim()
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
    let textList = textElements.map(element => element.textContent.trim())
    if (textList.length == 0) {
        return
    }
    const apiResponse = await fetchFuriganaApi(textList)

    for (const [index, element] of Array.from(textElements).entries()) {
        const original_text = apiResponse.text[index].original_text
        const text = apiResponse.text[index].text
        const textWithRuby = addFurigana(original_text, text)
        let newElement = document.createElement('r')
        if (typeof element.className === 'undefined') {
            newElement.className = 'js-furigana'
        } else {
            newElement.className = element.className + ' js-furigana'
        }
        
        newElement.innerHTML = textWithRuby
        const parent = element.parentNode
        if (parent) {
            parent.replaceChild(newElement, element)
        }
    }
}

const main = async () => {
    let stocks = []
    const elements = document.getElementsByTagName('body')
    const textElements = await getTextNodes(elements, stocks)
    await addFuriganaToTextNodes(textElements)
}

window.addEventListener("load", (_) => {
    setTimeout(async function() {
        await main()
    }, 0)
})

const config = { attributes: true, childList: true, subtree: true }

const callback = async (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            let stocks = []
            const textElements = await getTextNodes(mutation.addedNodes, stocks)
            await addFuriganaToTextNodes(textElements)
        }
    }
}

// コールバック関数に結びつけられたオブザーバーのインスタンスを生成
const observer = new MutationObserver(callback)

// 対象ノードの設定された変更の監視を開始
observer.observe(document.body, config)
