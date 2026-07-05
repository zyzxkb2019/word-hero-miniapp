const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')
const { parseWordText } = require('../../utils/wordParser')
const { enrichWordsWithMeaning } = require('../../utils/autoMeaning')
const { validateWordList } = require('../../utils/validators')
const { annotateWords } = require('../../utils/spellcheck')
const textbookUnits = require('../../constants/textbookUnits')

const WORD_LIST_LIMIT = 30
const OCR_STOP_WORDS = {
  the: true, a: true, an: true, and: true, or: true, but: true, is: true, are: true, am: true, was: true, were: true,
  be: true, been: true, being: true, to: true, of: true, in: true, on: true, at: true, for: true, with: true,
  from: true, by: true, as: true, it: true, this: true, that: true, these: true, those: true, i: true, you: true,
  he: true, she: true, we: true, they: true, my: true, your: true, his: true, her: true, our: true, their: true
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function findFirstSentence(text, word) {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i')
  return splitSentences(text).find((sentence) => pattern.test(sentence)) || ''
}

function attachExamplesFromText(words, text) {
  return (words || []).map((item) => ({
    ...item,
    example: item.example || findFirstSentence(text, item.word)
  }))
}

function extractWordsFromPassage(text, maxWords) {
  const matches = String(text || '').match(/[A-Za-z][A-Za-z'-]{1,}/g) || []
  const seen = {}
  const words = []
  matches.forEach((raw) => {
    const word = raw.toLowerCase().replace(/^'+|'+$/g, '')
    if (!word || word.length < 3 || OCR_STOP_WORDS[word] || seen[word] || words.length >= maxWords) return
    seen[word] = true
    words.push({
      word,
      meaning: '',
      example: findFirstSentence(text, word),
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
  return words
}

function buildDateTitle() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  return `${month}月${day}日生词库`
}

function joinWords(words) {
  return (words || []).map((item) => {
    if (typeof item === 'string') return item
    return [item.word, item.meaning, item.example].filter(Boolean).join(' | ')
  }).join('\n')
}

Page({
  data: {
    themeClass: theme.getThemeClass(),
    title: buildDateTitle(),
    rawText: `parrot\nappearance\nmirror\nconfident\nadventure\nfashion\nchallenge`,
    parsedWords: [],
    errors: [],
    translating: false,
    translateProgress: '',
    maxWords: 50,
    wordListLimit: WORD_LIST_LIMIT,
    listCount: 0,
    inputMode: 'manual',
    textbookUnits,
    selectedUnitIndex: 0,
    imagePath: '',
    imagePaths: [],
    ocrText: '',
    ocrBusy: false,
    wrongWords: []
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad() {
    this.loadListCount()
  },

  loadListCount() {
    const userId = storage.getCurrentUserId()
    if (!userId) return
    callFunction('listWordLists', { userId }, { showLoading: false, showError: false })
      .then((res) => this.setData({ listCount: (res.lists || []).length }))
      .catch(() => {})
  },

  chooseMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ inputMode: mode })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onTextInput(e) {
    this.setData({ rawText: e.detail.value })
  },

  onOcrTextInput(e) {
    this.setData({ ocrText: e.detail.value })
  },

  useDateTitle() {
    this.setData({ title: buildDateTitle() })
  },

  runParser(text) {
    const result = parseWordText(text, { maxWords: this.data.maxWords })
    let words = result.words
    const wordLikeCount = (String(text || '').match(/[A-Za-z][A-Za-z'-]{1,}/g) || []).length
    const looksLikePassage = wordLikeCount >= 8 && /[.!?。！？]/.test(String(text || ''))
    if (looksLikePassage && words.length < 2) {
      this.setData({
        parsedWords: [],
        errors: [{
          line: 0,
          text: '',
          reason: '这段内容像课文原文。为避免把 the、and、is 这类简单词误当生词，请先导入课后单词表，再用课文原文匹配例句。'
        }]
      })
      wx.showToast({ title: '请先导入课后单词表', icon: 'none' })
      return
    }
    if (looksLikePassage) {
      words = attachExamplesFromText(words, text)
    }
    const parsedWords = annotateWords(words)
    this.setData({ parsedWords, errors: result.errors })

    wx.showToast({
      title: parsedWords.length ? `识别出 ${parsedWords.length} 个英文词/短语` : '没有识别到英文词/短语',
      icon: 'none'
    })
  },

  parseText() {
    this.runParser(this.data.rawText)
  },

  applySuggestion(e) {
    const index = Number(e.currentTarget.dataset.index)
    const suggestion = e.currentTarget.dataset.suggestion
    if (!suggestion) return
    const next = [...this.data.parsedWords]
    next[index] = { ...next[index], word: suggestion, check: null, meaning: '' }
    this.setData({ parsedWords: annotateWords(next) })
  },

  chooseTextbookUnit(e) {
    const index = Number(e.detail.value || 0)
    const unit = this.data.textbookUnits[index]
    this.setData({
      selectedUnitIndex: index,
      title: unit.title,
      rawText: joinWords(unit.words)
    })
    this.runParser(joinWords(unit.words))
  },

  useSelectedUnit() {
    const unit = this.data.textbookUnits[this.data.selectedUnitIndex]
    this.setData({ title: unit.title, rawText: joinWords(unit.words) })
    this.runParser(joinWords(unit.words))
  },

  importWrongWords() {
    const userId = storage.getCurrentUserId()
    if (!userId) return
    callFunction('getWrongWords', { userId }, { loadingTitle: '读取错题本...' })
      .then((res) => {
        const words = res.words || []
        if (!words.length) {
          wx.showToast({ title: '暂时没有错词', icon: 'none' })
          return
        }
        const rawText = words.map((item) => item.word).join('\n')
        this.setData({
          title: `${buildDateTitle()}错词复盘`,
          rawText,
          wrongWords: words
        })
        this.runParser(rawText)
      })
      .catch(() => {})
  },

  chooseImage() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || [])
          .map((file) => file.tempFilePath)
          .filter(Boolean)
          .slice(0, 3)
        if (!paths.length) return
        this.setData({ imagePaths: paths, imagePath: paths[0] })
      }
    })
  },

  recognizeImage() {
    const paths = this.data.imagePaths && this.data.imagePaths.length ? this.data.imagePaths : (this.data.imagePath ? [this.data.imagePath] : [])
    if (!paths.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }
    this.setData({ ocrBusy: true })
    wx.showLoading({ title: '识别图片中...' })

    const tasks = paths.map((filePath, index) => {
      const cloudPath = `ocr/${Date.now()}-${index}-${Math.random().toString(16).slice(2)}.jpg`
      return new Promise((resolve) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: (uploadRes) => {
            callFunction('ocrImageWords', { fileID: uploadRes.fileID }, { showLoading: false, showError: false })
              .then((res) => resolve({ text: res.text || '', message: res.message || '' }))
              .catch((err) => resolve({ text: '', message: err.message || '识别失败' }))
          },
          fail: () => resolve({ text: '', message: '图片上传失败' })
        })
      })
    })

    Promise.all(tasks).then((results) => {
      const text = results.map((item) => item.text).filter(Boolean).join('\n')
      if (!text) {
        const message = results.map((item) => item.message).filter(Boolean)[0] || '没有识别到清晰英文，请换更清晰的图片'
        wx.showToast({ title: message, icon: 'none' })
        return
      }
      this.setData({ ocrText: text, rawText: text })
      this.runParser(text)
    }).finally(() => {
      wx.hideLoading()
      this.setData({ ocrBusy: false })
    })
  },

  useOcrText() {
    if (!this.data.ocrText.trim()) {
      wx.showToast({ title: '请先输入或识别图片文字', icon: 'none' })
      return
    }
    this.setData({ rawText: this.data.ocrText })
    this.runParser(this.data.ocrText)
  },

  async autoGenerateMeanings() {
    let words = this.data.parsedWords
    let errors = this.data.errors

    if (!words.length) {
      const result = parseWordText(this.data.rawText, { maxWords: this.data.maxWords })
      words = annotateWords(result.words)
      errors = result.errors
      this.setData({ parsedWords: words, errors })
    }

    if (!words.length) {
      wx.showToast({ title: '先粘贴英文词或短语', icon: 'none' })
      return
    }

    const risky = words.filter((item) => item.check && item.check.level === 'warn')
    if (risky.length) {
      wx.showToast({ title: '有疑似拼写问题，建议先检查预览区', icon: 'none' })
    }

    this.setData({ translating: true, translateProgress: `0 / ${words.length}` })
    wx.showLoading({ title: '生成中文中...' })

    try {
      const translated = await enrichWordsWithMeaning(words, (done, total) => {
        this.setData({ translateProgress: `${done} / ${total}` })
      })
      this.setData({ parsedWords: annotateWords(translated), translating: false })
      wx.hideLoading()
      wx.showToast({ title: '中文已生成', icon: 'success' })
    } catch (err) {
      this.setData({ translating: false })
      wx.hideLoading()
      wx.showToast({ title: '生成失败，请稍后再试', icon: 'none' })
    }
  },

  editMeaning(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`parsedWords[${index}].meaning`]: e.detail.value })
  },

  editExample(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`parsedWords[${index}].example`]: e.detail.value })
  },

  saveWordList() {
    const userId = storage.getCurrentUserId()
    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    if (this.data.listCount >= WORD_LIST_LIMIT) {
      wx.showToast({ title: `每个学生最多 ${WORD_LIST_LIMIT} 个专属词库`, icon: 'none' })
      return
    }

    let words = this.data.parsedWords
    let errors = this.data.errors

    if (!words.length) {
      const result = parseWordText(this.data.rawText, { maxWords: this.data.maxWords })
      words = annotateWords(result.words)
      errors = result.errors
      this.setData({ parsedWords: words, errors })
    }

    const hasError = words.some((item) => item.check && item.check.level === 'error')
    if (hasError) {
      wx.showToast({ title: '请先修正英文录入错误', icon: 'none' })
      return
    }

    const missingMeaning = words.some((item) => !String(item.meaning || '').trim())
    if (missingMeaning) {
      wx.showToast({ title: '先点“自动生成中文”', icon: 'none' })
      return
    }

    const check = validateWordList(this.data.title, words)
    if (!check.valid) {
      wx.showToast({ title: check.message, icon: 'none' })
      return
    }

    callFunction('saveWordList', {
      userId,
      title: this.data.title || buildDateTitle(),
      words
    }, { loadingTitle: '保存词库...' })
      .then((res) => {
        storage.setCurrentWordListId(res.wordListId)
        wx.showToast({ title: '词库已保存', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/home/index' })
        }, 500)
      })
      .catch(() => {})
  }
})
