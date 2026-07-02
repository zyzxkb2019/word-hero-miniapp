const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/[|]/g, '\n')
    .replace(/[，,；;]/g, '\n')
    .replace(/\s{2,}/g, '\n')
    .trim()
}

exports.main = async (event) => {
  if (!event.fileID) return { success: false, text: '', message: '缺少图片文件' }

  try {
    const urlRes = await cloud.getTempFileURL({ fileList: [event.fileID] })
    const tempUrl = urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL
    if (!tempUrl) return { success: false, text: '', message: '图片临时链接生成失败' }

    // 不同微信基础库的 OCR OpenAPI 名称可能不同，所以这里做多路尝试。
    // 如果你的后台暂未开通 OCR，会返回友好提示，前端仍可手动粘贴识别文字。
    let ocrRes = null
    if (cloud.openapi && cloud.openapi.ocr && cloud.openapi.ocr.printedText) {
      ocrRes = await cloud.openapi.ocr.printedText({ imgUrl: tempUrl })
    } else if (cloud.openapi && cloud.openapi.ocr && cloud.openapi.ocr.printedtext) {
      ocrRes = await cloud.openapi.ocr.printedtext({ imgUrl: tempUrl })
    }

    const items = (ocrRes && (ocrRes.items || ocrRes.result || ocrRes.words_result)) || []
    const text = Array.isArray(items)
      ? items.map((item) => item.text || item.words || item.content || '').filter(Boolean).join('\n')
      : ''

    if (!text) return { success: false, text: '', message: '没有识别到清晰英文，请手动粘贴或换一张更清楚的图片' }
    return { success: true, text: normalizeOcrText(text) }
  } catch (err) {
    return {
      success: false,
      text: '',
      message: '图片识别通道暂未开通或图片不够清晰，可先手动粘贴文字',
      errorMessage: err.message || String(err)
    }
  }
}
