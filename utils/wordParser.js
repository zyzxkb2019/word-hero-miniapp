function normalizeWord(word) {
  return String(word || '')
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function splitWordLine(item) {
  const raw = String(item || '').trim()
  const parts = raw.split(/\s*(?:\||\t| -- | - |：|:)\s*/).filter(Boolean)
  return {
    word: normalizeWord(parts[0] || raw),
    meaning: parts[1] || '',
    example: parts.slice(2).join(' - ')
  }
}

function looksLikeEnglishItem(item) {
  const value = normalizeWord(item)
  // 支持单词、短语、带连字符/撇号的英文；例如 thank you, thanks to, ice cream, don't worry, well-known。
  return /^[a-zA-Z][a-zA-Z\-' ]{0,79}$/.test(value) && /[a-zA-Z]/.test(value)
}

function splitByStrongSeparators(text) {
  return String(text || '')
    .split(/[\n\r,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitInputIntoItems(text) {
  const raw = String(text || '').trim()
  if (!raw) return []

  const hasLineBreak = /[\n\r]/.test(raw)
  const hasStrongSeparator = /[,，;；、]/.test(raw)

  // 有换行或逗号/分号时：每一行/每一段都视为一个“单词或短语”。
  // 这样 thanks to、look after、a lot of 不会被拆开。
  if (hasLineBreak || hasStrongSeparator) return splitByStrongSeparators(raw)

  // 没有换行也没有标点时：兼容老用法，允许直接粘贴 parrot apple orange 这种单词串。
  // 但短语建议一行一个或用逗号隔开，页面文案会明确提醒。
  return raw.split(/\s+/).map((item) => item.trim()).filter(Boolean)
}

function parseWordText(text, options = {}) {
  const maxWords = Number(options.maxWords || 50)
  const items = splitInputIntoItems(text)
  const words = []
  const errors = []
  const seen = {}
  let ignoredCount = 0

  items.forEach((item, index) => {
    const parsed = splitWordLine(item)
    const word = parsed.word
    if (!looksLikeEnglishItem(word)) {
      ignoredCount += 1
      if (errors.length < 6) errors.push({ line: index + 1, text: item, reason: `“${item}”不像英文单词或短语，已跳过` })
      return
    }

    if (seen[word]) return
    if (words.length >= maxWords) return

    seen[word] = true
    words.push({
      word,
      meaning: parsed.meaning,
      example: parsed.example,
      masteryScore: 0,
      rightCount: 0,
      wrongCount: 0,
      reviewedCount: 0,
      recognitionDates: [],
      consecutiveRecognizedDays: 0,
      recognitionPassed: false,
      spellingRightCount: 0,
      spellingWrongCount: 0,
      spellingPassed: false,
      lastReviewedAt: null,
      lastSpelledAt: null,
      memoryStatus: 'new',
      uploadAt: Date.now(),
      createdAt: Date.now()
    })
  })

  if (items.length > maxWords) {
    errors.push({ line: maxWords + 1, text: '', reason: `一次最多导入 ${maxWords} 个词或短语，后面的已暂时忽略` })
  }

  if (ignoredCount > 6) {
    errors.push({ line: 0, text: '', reason: `还有 ${ignoredCount - 6} 个非英文内容已自动跳过` })
  }

  return { words, errors }
}

module.exports = {
  parseWordText,
  normalizeWord,
  looksLikeEnglishItem
}
