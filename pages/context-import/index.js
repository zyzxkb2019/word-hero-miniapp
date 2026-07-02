const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

const DEFAULT_TEXT = 'Paste one unit text here. The system will find the sentence where each word appears.'

function normalizeText(value) {
  return String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSentences(text) {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const parts = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) || []
  return parts
    .map((item) => item.trim())
    .filter((item) => /[a-zA-Z]/.test(item) && item.length >= 8)
    .slice(0, 300)
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getWordForms(word) {
  const base = String(word || '').trim().toLowerCase()
  if (!base || base.includes(' ')) return [base]
  const forms = new Set([base])
  if (base.endsWith('y')) forms.add(`${base.slice(0, -1)}ies`)
  if (base.endsWith('e')) {
    forms.add(`${base}s`)
    forms.add(`${base}d`)
  } else {
    forms.add(`${base}s`)
    forms.add(`${base}ed`)
    forms.add(`${base}ing`)
  }
  return Array.from(forms)
}

function sentenceHasWord(sentence, word) {
  const value = String(word || '').trim().toLowerCase()
  if (!value) return false
  const normalizedSentence = normalizeText(sentence).toLowerCase()
  if (value.includes(' ')) {
    return new RegExp(`(^|[^a-z])${escapeRegExp(value)}([^a-z]|$)`, 'i').test(normalizedSentence)
  }
  return getWordForms(value).some((form) => new RegExp(`(^|[^a-z])${escapeRegExp(form)}([^a-z]|$)`, 'i').test(normalizedSentence))
}

function scoreSentence(sentence, word) {
  const length = sentence.length
  let score = 100
  if (length < 28) score -= 10
  if (length > 150) score -= Math.min(40, Math.round((length - 150) / 8))
  if (/[,;:]/.test(sentence)) score += 4
  if (sentenceHasWord(sentence, word)) score += 50
  return score
}

function findBestSentence(word, sentences) {
  const candidates = sentences
    .filter((sentence) => sentenceHasWord(sentence, word))
    .map((sentence) => ({ sentence, score: scoreSentence(sentence, word) }))
    .sort((a, b) => b.score - a.score)
  return candidates[0] ? candidates[0].sentence : ''
}

function buildMatches(words, sentences, sourceText) {
  return (words || []).map((item) => {
    const example = findBestSentence(item.word, sentences)
    return {
      word: item.word,
      meaning: item.meaning || '',
      oldExample: item.example || '',
      example,
      sourceText,
      matched: !!example,
      selected: !!example
    }
  })
}

Page({
  data: {
    themeClass: theme.getThemeClass(),
    user: {},
    wordList: null,
    rawText: DEFAULT_TEXT,
    sourceText: '',
    imagePath: '',
    ocrBusy: false,
    matching: false,
    saving: false,
    sentences: [],
    matches: [],
    matchedCount: 0,
    selectedCount: 0
  },

  onLoad() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadData()
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
  },

  loadData() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()
    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }
    callFunction('getCurrentWordList', { userId, wordListId }, { showLoading: false })
      .then((res) => {
        const wordList = res.wordList
        if (!wordList || !wordList.words || !wordList.words.length) {
          wx.showToast({ title: '请先导入词表', icon: 'none' })
          wx.redirectTo({ url: '/pages/import/index' })
          return
        }
        storage.setCurrentWordListId(wordList._id)
        this.setData({ wordList })
      })
      .catch(() => wx.redirectTo({ url: '/pages/home/index' }))
  },

  onTextInput(e) {
    this.setData({ rawText: e.detail.value })
  },

  onSourceInput(e) {
    this.setData({ sourceText: e.detail.value })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (file) this.setData({ imagePath: file.tempFilePath })
      }
    })
  },

  recognizeImage() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择课文图片', icon: 'none' })
      return
    }
    this.setData({ ocrBusy: true })
    const cloudPath = `context/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
    wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.imagePath,
      success: (uploadRes) => {
        callFunction('ocrImageWords', { fileID: uploadRes.fileID }, { loadingTitle: '识别课文中...' })
          .then((res) => {
            const text = res.text || ''
            if (!text) {
              wx.showToast({ title: res.message || '没有识别到文字', icon: 'none' })
              return
            }
            this.setData({ rawText: text })
          })
          .catch(() => {})
          .then(() => this.setData({ ocrBusy: false }))
      },
      fail: () => {
        this.setData({ ocrBusy: false })
        wx.showToast({ title: '图片上传失败', icon: 'none' })
      }
    })
  },

  runMatch() {
    if (!this.data.wordList) return
    const sentences = splitSentences(this.data.rawText)
    if (!sentences.length) {
      wx.showToast({ title: '请先粘贴或识别课文英文内容', icon: 'none' })
      return
    }
    this.setData({ matching: true })
    const matches = buildMatches(this.data.wordList.words || [], sentences, this.data.sourceText)
    const matchedCount = matches.filter((item) => item.matched).length
    const selectedCount = matches.filter((item) => item.selected).length
    this.setData({ sentences, matches, matchedCount, selectedCount, matching: false })
    wx.showToast({ title: `匹配到 ${matchedCount} 个词`, icon: 'none' })
  },

  toggleSelect(e) {
    const index = Number(e.currentTarget.dataset.index)
    const next = [...this.data.matches]
    next[index] = { ...next[index], selected: !next[index].selected }
    this.setData({
      matches: next,
      selectedCount: next.filter((item) => item.selected).length
    })
  },

  editExample(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = e.detail.value
    const next = [...this.data.matches]
    next[index] = { ...next[index], example: value, matched: !!String(value || '').trim(), selected: !!String(value || '').trim() }
    this.setData({
      matches: next,
      matchedCount: next.filter((item) => item.matched).length,
      selectedCount: next.filter((item) => item.selected).length
    })
  },

  saveExamples() {
    const wordListId = storage.getCurrentWordListId()
    const examples = this.data.matches
      .filter((item) => item.selected && String(item.example || '').trim())
      .map((item) => ({
        word: item.word,
        example: item.example,
        sourceText: item.sourceText || this.data.sourceText,
        sourceType: 'textbook'
      }))

    if (!examples.length) {
      wx.showToast({ title: '请先选择要保存的原句', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    callFunction('updateWordExamples', { wordListId, examples }, { loadingTitle: '保存原句...' })
      .then((res) => {
        wx.showToast({ title: `已保存 ${res.updatedCount || examples.length} 条`, icon: 'success' })
        setTimeout(() => wx.redirectTo({ url: '/pages/study/index' }), 600)
      })
      .catch(() => {})
      .then(() => this.setData({ saving: false }))
  }
})
