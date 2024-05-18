console.log('Start..')

// const getTextNodes = async (elements, deps) => {
//   if (typeof deps == 'undefined') {
//     deps = 1
//   }
//   // console.log('### elements length = ' + elements.length)
//   for (const element of Array.from(elements)) {
//     console.log('### [getTextNodes] deps = ' + deps)
//     console.log('### element = ' + element)
//     console.log('### element.className = ' + element.className)
//     console.log('### element.outerHTML = ' + element.outerHTML)

//     if (element.nodeType === Node.TEXT_NODE) {
//       console.log('### element is TEXT_NODE')
//     } else if (element.nodeType === Node.ELEMENT_NODE) {
//       console.log('### element is ELEMENT_NODE')

//       if (element.hasChildNodes()) {
//         console.log('### [getTextNodes] element.childNodes.length = ' + element.childNodes.length)
//         if (deps == 1) {
//             deps += 1
//             await getTextNodes(element.childNodes, deps)
//         }
//       }
//     } else {
//       console.log('### element is other NODE')
//     }
//   }
// }

function getTextNodes(node) {
  let textNodes = []
    // childNodesを使用して全ての子ノードを走査
    node.childNodes.forEach(childNode => {
        if (childNode.nodeType === Node.TEXT_NODE) {
            // TEXT_NODEだけを配列に追加
            textNodes.push(childNode)
        } else if (childNode.childNodes.length > 0) {
            // 再帰的に子ノードを探索
            textNodes = textNodes.concat(getTextNodes(childNode))
        }
    });
    return textNodes
}

window.onload = function() {
  const bodyElement = document.getElementsByTagName('body')[0]
  const tmp = getTextNodes(bodyElement)
  console.log(tmp)
  // var bodyElements = document.body.children; // bodyタグ以下のHTMLCollectionを取得
  // for (var i = 0; i < bodyElements.length; i++) {
  //   var element = bodyElements[i];
  //   console.log(element.outerHTML);  // 各ElementのinnerHTMLをログ出力
  // }

}
