
const FuriganaApiUrl = 'http://localhost:8080/furigana'

const containsKanji = (str) => {
    return /[\u4E00-\u9FAF]/.test(str)
}

const addFurigana = (originalText, furiganaObj) => {
    let result = ''
    let currentIndex = 0

    let count = 0
    while (currentIndex < originalText.length) {
        count += 1
        if (count > 10000) {
            console.log('### addFurigana関数でループが異常')
            break
        }
        let found = false

        for (let i = 0; i < furiganaObj.length; i++) {
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

const updateElementText = async (element) => {
    const originalText = element.textContent.trim()
    if (originalText.length === 0 || !containsKanji(originalText)) {
        return
    }

    const parent = element.parentNode
    if (parent && parent.tagName === 'RUBY') {
        return
    }

    const apiResponse = await fetchFuriganaApi(originalText)
    if (!apiResponse || apiResponse.text.length == 0) {
        return
    }

    const textWithRuby = addFurigana(apiResponse.original_text, apiResponse.text)

    let newElement = document.createElement('span')
    newElement.innerHTML = textWithRuby
    if (parent) {
        console.log('### originalText = ' + originalText)
        console.log('### textWithRuby = ' + textWithRuby)
        parent.replaceChild(newElement, element)
    }
}

const getTextNodes = async (elements, stocks) => {
    for (const element of Array.from(elements)) {
        if (element.tagName === 'SCRIPT') {
            continue // スクリプト要素はスキップ
        }
        if (element.nodeType === Node.TEXT_NODE) {
            const originalText = element.textContent.trim()
            if (originalText.length !== 0) {
                console.log('### [getTextNodes] originalText = ' + originalText)
                stocks.push(element)
                // await updateElementText(element)
            }
        } else if (element.nodeType === Node.ELEMENT_NODE && element.hasChildNodes()) {
            await getTextNodes(element.childNodes, stocks)
        }
    }
    return stocks
}

const main = async () => {
    let stocks = []
    // const elements = document.getElementsByTagName('body')
    const elements = document.getElementsByTagName('h1')
    const textElements = await getTextNodes(elements, stocks)
    for (const element of Array.from(textElements)) {
        const originalText =  element.textContent.trim()
        console.log('### [main] originalText = ' + originalText)
    }
}

window.addEventListener("load", (_) => {
    // ページロード後にJavaScriptでコンテンツが読み込まれることがあるため、
    // 1秒後にルビ振り処理を開始する
    setTimeout(async function() {
        await main()

    }, 1000)
})
