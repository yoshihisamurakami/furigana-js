
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

// const addRubyToElement = (element, apiResponseText) => {
//     const original_text = apiResponseText.original_text
//     const text = apiResponseText.text
//     if (!containsKanji(original_text)) {
//         return
//     }

//     const textWithRuby = addFurigana(original_text, text)
//     let newElement = document.createElement('span')
//     newElement.innerHTML = textWithRuby
//     const parent = element.parentNode
//     if (parent) {
//         parent.replaceChild(newElement, element)
//     }
// }

// const updateElementText = async (element) => {
//     const originalText = element.textContent.trim()
//     if (originalText.length === 0 || !containsKanji(originalText)) {
//         return
//     }

//     const parent = element.parentNode
//     if (parent && parent.tagName === 'RUBY') {
//         return
//     }

//     const apiResponse = await fetchFuriganaApi(originalText)
//     if (!apiResponse || apiResponse.text.length == 0) {
//         return
//     }

//     const textWithRuby = addFurigana(apiResponse.original_text, apiResponse.text)

//     let newElement = document.createElement('span')
//     newElement.innerHTML = textWithRuby
//     if (parent) {
//         // console.log('### originalText = ' + originalText)
//         // console.log('### textWithRuby = ' + textWithRuby)
//         parent.replaceChild(newElement, element)
//     }
// }

const getTextNodes = async (elements, stocks) => {
    for (const element of Array.from(elements)) {
        if (element.tagName === 'SCRIPT') {
            continue // スクリプト要素はスキップ
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

const main = async () => {
    let stocks = []
    const elements = document.getElementsByTagName('body')
    const textElements = await getTextNodes(elements, stocks)
    let textList = textElements.map(element => element.textContent.trim())
    const apiResponse = await fetchFuriganaApi(textList)

    for (const [index, element] of Array.from(textElements).entries()) {
        const original_text = apiResponse.text[index].original_text
        const text = apiResponse.text[index].text
        const textWithRuby = addFurigana(original_text, text)
        let newElement = document.createElement('span')
        newElement.innerHTML = textWithRuby
        const parent = element.parentNode
        if (parent) {
            parent.replaceChild(newElement, element)
        }
    }
}

window.addEventListener("load", (_) => {
    // ページロード後にJavaScriptでコンテンツが読み込まれることがあるため、
    // 1秒後にルビ振り処理を開始する
    setTimeout(async function() {
        await main()
    }, 1000)
})
