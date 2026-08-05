const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/[|]/g, '\n')
    .replace(/[；;，,]/g, '\n')
    .replace(/\s{2,}/g, '\n')
    .trim()
}

function extractTextFromOcrResult(ocrRes) {
  if (!ocrRes) return ''
  if (typeof ocrRes.text === 'string') return ocrRes.text
  const items = ocrRes.items || ocrRes.result || ocrRes.words_result || ocrRes.wordsResult || []
  if (!Array.isArray(items)) return ''
  return items
    .map((item) => item.text || item.words || item.content || item.word || '')
    .filter(Boolean)
    .join('\n')
}

async function callPrintedTextOcr(payload) {
  const ocr = cloud.openapi && cloud.openapi.ocr
  if (!ocr) return null
  const printedText = ocr.printedText || ocr.printedtext
  if (!printedText) return null
  return printedText(payload)
}

async function runOcr(fileID, tempUrl) {
  const attempts = []
  if (tempUrl) {
    attempts.push({ imgUrl: tempUrl })
    attempts.push({ img_url: tempUrl })
  }

  try {
    const downloadRes = await cloud.downloadFile({ fileID })
    if (downloadRes && downloadRes.fileContent) {
      attempts.push({ img: downloadRes.fileContent })
      attempts.push({ image: downloadRes.fileContent })
    }
  } catch (err) {}

  let lastError = null
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const result = await callPrintedTextOcr(attempts[i])
      const text = extractTextFromOcrResult(result)
      if (text) return text
    } catch (err) {
      lastError = err
    }
  }

  if (lastError) throw lastError
  return ''
}

exports.main = async (event) => {
  if (!event.fileID) return { success: false, text: '', message: '缺少图片文件' }

  try {
    const urlRes = await cloud.getTempFileURL({ fileList: [event.fileID] })
    const tempUrl = urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL
    const text = await runOcr(event.fileID, tempUrl)

    if (!text) {
      return { success: false, text: '', message: '没有识别到清晰英文，请换更清晰的图片，或在下方手动粘贴文字' }
    }
    return { success: true, text: normalizeOcrText(text) }
  } catch (err) {
    return {
      success: false,
      text: '',
      message: '图片识别通道暂未开通或图片不够清晰，可先在下方手动粘贴文字',
      errorMessage: err.message || String(err)
    }
  }
}