const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["BLOBS"],
    justification: "Preload and host Kagome Go WASM in an offscreen document",
  });
}

async function preloadKagome() {
  await ensureOffscreenDocument();
  return await chrome.runtime.sendMessage({ type: "kagome-preload" });
}

// インストール時に warm up
chrome.runtime.onInstalled.addListener(() => {
  preloadKagome().catch(console.error);
});

// ブラウザ起動後にも warm up
chrome.runtime.onStartup.addListener(() => {
  preloadKagome().catch(console.error);
});

// 必要なら action クリックでも再 warm up
chrome.action?.onClicked?.addListener(() => {
  preloadKagome().catch(console.error);
});

// 他コンテキストから tokenize を依頼されたら offscreen に中継
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "kagome-tokenize-request") {
    (async () => {
      await ensureOffscreenDocument();
      const result = await chrome.runtime.sendMessage({
        type: "kagome-tokenize",
        text: msg.text ?? "",
      });
      sendResponse(result);
    })().catch((err) => {
      sendResponse({ ok: false, error: String(err) });
    });
    return true;
  }
});
