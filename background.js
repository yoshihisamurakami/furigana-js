
const FuriganaApiUrl = 'https://go-furigana-api-72715150088.asia-northeast1.run.app/furigana'
const CACHE_PREFIX = 'fg_cache_'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.msg === 'fetch-furigana') {
        handleFuriganaRequest(request.textList).then(sendResponse)
        return true // 非同期レスポンスのためチャネルを開いたままにする
    }
})

const handleFuriganaRequest = async (textList) => {
    const cacheKeys = textList.map(text => CACHE_PREFIX + text)
    const cached = await chrome.storage.local.get(cacheKeys)

    const results = new Array(textList.length).fill(undefined)
    const uncachedIndices = []
    const uncachedTexts = []

    for (let i = 0; i < textList.length; i++) {
        const cachedValue = cached[cacheKeys[i]]
        if (cachedValue !== undefined) {
            results[i] = cachedValue
        } else {
            uncachedIndices.push(i)
            uncachedTexts.push(textList[i])
        }
    }

    if (uncachedTexts.length > 0) {
        const apiResponse = await callFuriganaApi(uncachedTexts)
        const newCache = {}
        for (let j = 0; j < uncachedIndices.length; j++) {
            const originalIndex = uncachedIndices[j]
            if (apiResponse[j] !== undefined) {
                results[originalIndex] = apiResponse[j]
                newCache[cacheKeys[originalIndex]] = apiResponse[j]
            }
        }
        if (Object.keys(newCache).length > 0) {
            await chrome.storage.local.set(newCache)
        }
    }

    return results
}

const callFuriganaApi = async (textList) => {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textList })
    }
    try {
        const response = await fetch(FuriganaApiUrl, requestOptions)
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        const data = await response.json()
        return data.response
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error)
        return []
    }
}
