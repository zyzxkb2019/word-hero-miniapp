function normalizeWord(word) {
  return String(word || '')
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function stripLeadingIndex(value) {
  return String(value || '')
    .trim()
    .replace(/^\s*(?:\d+|[A-Za-z])[\.、\)]\s*/, '')
    .replace(/^\s*[（(]\s*\d+\s*[）)]\s*/, '')
    .trim()
}

function hasChinese(value) {
  return /[\u3400-\u9fff]/.test(String(value || ''))
}

function splitWordLine(item) {
  const raw = stripLeadingIndex(item)
  const explicitParts = raw.split(/\s*(?:\||\t| -- | - |:|：)\s*/).filter(Boolean)
  if (explicitParts.length > 1) {
    return {
      word: normalizeWord(explicitParts[0] || raw),
      meaning: explicitParts[1] || '',
      example: explicitParts.slice(2).join(' - ')
    }
  }

  const chineseIndex = raw.search(/[\u3400-\u9fff]/)
  if (chineseIndex > 0) {
    const wordPart = raw.slice(0, chineseIndex).replace(/[，,;；:：|]+$/g, '').trim()
    const meaningPart = raw.slice(chineseIndex).trim()
    return {
      word: normalizeWord(wordPart),
      meaning: meaningPart,
      example: ''
    }
  }

  return {
    word: normalizeWord(raw),
    meaning: '',
    example: ''
  }
}

function looksLikeEnglishItem(item) {
  const value = normalizeWord(item)
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

  if (hasLineBreak || hasStrongSeparator) return splitByStrongSeparators(raw)

  if (hasChinese(raw)) return [raw]

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