
const FuriganaApiUrl = 'https://go-furigana-api-72715150088.asia-northeast1.run.app/furigana'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.msg === 'fetch-furigana') {
        callFuriganaApi(request.textList).then(sendResponse)
        return true // 非同期レスポンスのためチャネルを開いたままにする
    }
})

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
