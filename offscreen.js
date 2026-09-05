import "./wasm_exec.js";

let kagomeReadyPromise = null;

/**
 * wasm サンプルを起動して、
 * globalThis.kagome_tokenize が使える状態まで進める。
 */
async function ensureKagomeReady() {
  if (kagomeReadyPromise) return kagomeReadyPromise;

  kagomeReadyPromise = (async () => {
    const go = new Go();
    const wasmUrl = chrome.runtime.getURL("wasm/kagome.wasm");

    const result = await WebAssembly.instantiateStreaming(
      fetch(wasmUrl),
      go.importObject
    );

    // go.run() は通常 resolve しないので、待たずに起動する
    go.run(result.instance);

    // Zenn サンプル main.go は registerCallbacks() で
    // js.Global().Set("kagome_tokenize", js.FuncOf(tokenize))
    // を登録する
    await waitForGlobalFunction("kagome_tokenize", 15000);

    // 先読み: 1回ダミー呼び出し
    // main.go の tokenize() は毎回 tokenizer.New(...) するため、
    // ここでは「最初の1回を先に踏む」効果しかない
    try {
      globalThis.kagome_tokenize("");
    } catch (e) {
      console.warn("Initial warm-up tokenize failed:", e);
    }

    return true;
  })();

  return kagomeReadyPromise;
}

function waitForGlobalFunction(name, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (typeof globalThis[name] === "function") {
        resolve(globalThis[name]);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`${name} was not registered within ${timeoutMs} ms`));
        return;
      }
      setTimeout(tick, 20);
    };

    tick();
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "kagome-preload") {
    ensureKagomeReady()
      .then(() => {
        sendResponse({ success: true, warmed: true });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  if (msg?.type === "kagome-tokenize") {
    ensureKagomeReady()
      .then(() => {
        const text = String(msg.text ?? "");
        const response = globalThis.kagome_tokenize(text);
        sendResponse({ success: true, response });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }
});
