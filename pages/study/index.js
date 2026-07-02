const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')
const { sortWordsForStudy, getMemoryLabel, getNextReviewHint } = require('../../utils/mastery')
const { getFeedbackMessage } = require('../../utils/feedbackMessages')
const { initCorrectSound, playCorrectVoice, speakEnglishWord, buildCorrectPraise, destroyCorrectSound } = require('../../utils/audio')

function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const t = new Date(word.nextReviewAt).getTime()
  return !Number.isNaN(t) && t <= Date.now()
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function normalizeMeaningList(word = {}) {
  const values = []
  if (Array.isArray(word.meanings)) values.push(...word.meanings)
  values.push(word.meaning, word.cn, word.definition)

  const parts = values
    .join('；')
    .split(/[;；、，,\/|\n\r]+/)
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  const seen = {}
  return parts.filter((item) => {
    if (seen[item]) return false
    seen[item] = true
    return true
  }).slice(0, 3)
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildClozeExample(word = {}) {
  const example = String(word.example || '').trim()
  const term = String(word.word || '').trim()
  if (!example || !term) return ''
  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'ig')
  const cloze = example.replace(pattern, '____')
  return cloze === example ? example : cloze
}

function decorateStudyWord(word = {}) {
  const meanings = normalizeMeaningList(word)
  const primaryMeaning = meanings[0] || String(word.meaning || '').trim()
  return {
    ...word,
    meanings,
    primaryMeaning,
    meaningText: meanings.length ? meanings.join(' / ') : primaryMeaning,
    clozeExample: buildClozeExample(word)
  }
}

function pickStudyWords(allWords, scope) {
  const words = allWords || []
  const dueWords = words.filter(isDueWord)
  const reviewedWords = words.filter((item) => Number(item.reviewedCount || 0) > 0)
  const activeWords = words.filter((item) => !item.recognitionPassed && item.memoryStatus !== 'green')
  const unmasteredWords = activeWords.filter((item) => Number(item.masteryScore || 0) <= 1)
  const learningWords = activeWords.filter((item) => Number(item.masteryScore || 0) > 1 && Number(item.masteryScore || 0) <= 4)

  if (scope === 'all') return words
  if (scope === 'reviewed') return reviewedWords
  if (scope === 'due') return dueWords
  if (scope === 'learning') return learningWords.length ? learningWords : activeWords
  if (scope === 'unmastered') return unmasteredWords.length ? unmasteredWords : words

  const smartWords = dueWords.length ? dueWords : activeWords
  return smartWords.length ? smartWords : words
}

function buildComboText(comboCount, name) {
  const safeName = String(name || '你').trim() || '你'
  if (comboCount === 3) return `${safeName}三连击！`
  if (comboCount === 5) return `${safeName}五连击！状态爆表！`
  if (comboCount > 5) return `${safeName}${comboCount}连击！继续冲！`
  return `COMBO × ${comboCount}`
}

Page({
  data: {
    themeClass: theme.getThemeClass(),
    user: {},
    wordList: null,
    studyWords: [],
    masteredWords: [],
    spellingWords: [],
    reviewedWords: [],
    currentIndex: 0,
    currentWord: null,
    showMeaning: false,
    mode: 'listening',
    choices: [],
    spellingInput: '',
    feedback: '',
    feedbackType: 'correct',
    submitting: false,
    studyScope: '',

    comboCount: 0,
    showCoinBurst: false,
    showCombo: false,
    comboText: '',
    effectSeed: 0,
    wrongChoiceWord: '',
    listeningPlayed: false
  },

  onLoad() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    initCorrectSound()
    this.loadStudyData()
  },

  onUnload() {
    this.clearEffectTimers()
    destroyCorrectSound()
  },

  clearEffectTimers() {
    if (this.coinTimer) clearTimeout(this.coinTimer)
    if (this.comboTimer) clearTimeout(this.comboTimer)
    if (this.effectStartTimer) clearTimeout(this.effectStartTimer)
    this.coinTimer = null
    this.comboTimer = null
    this.effectStartTimer = null
  },

  loadStudyData() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()

    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    Promise.all([
      callFunction('getUserProfile', { userId }, { showLoading: false }),
      callFunction('getCurrentWordList', { userId, wordListId }, { showLoading: false })
    ])
      .then(([userRes, listRes]) => {
        const user = userRes.user
        const wordList = listRes.wordList

        if (!wordList || !wordList.words || !wordList.words.length) {
          wx.showToast({ title: '请先导入词表', icon: 'none' })
          wx.redirectTo({ url: '/pages/import/index' })
          return
        }

        storage.setCurrentWordListId(wordList._id)
        const allWords = (wordList.words || []).map(decorateStudyWord)
        const nextWordList = { ...wordList, words: allWords }
        const masteredWords = allWords.filter((item) => item.recognitionPassed || item.memoryStatus === 'green')
        const spellingWords = allWords.filter((item) => item.spellingPassed)
        const reviewedWords = allWords.filter((item) => Number(item.reviewedCount || 0) > 0)
        const requestedScope = storage.consumeStudyScope()
        const studyScope = requestedScope || 'smart'
        const rawStudyWords = pickStudyWords(allWords, studyScope)
        const studyWords = sortWordsForStudy(rawStudyWords)
        if (!studyWords.length) {
          wx.showToast({ title: '这个分层暂时没有可练的词', icon: 'none' })
          wx.redirectTo({ url: '/pages/report/index' })
          return
        }
        const lastProgress = storage.getLastStudyProgress()
        const focusWord = storage.consumeStudyFocusWord()
        let startIndex = 0
        if (focusWord) {
          const focusIndex = studyWords.findIndex((item) => item.word === focusWord)
          if (focusIndex >= 0) startIndex = focusIndex
        } else if (!requestedScope && lastProgress && lastProgress.wordListId === wordList._id && (lastProgress.scope || 'smart') === studyScope) {
          startIndex = Math.min(Number(lastProgress.currentIndex || 0), Math.max(0, studyWords.length - 1))
        }
        this.decorateCurrentWord(studyWords[startIndex])
        this.setData({ user, wordList: nextWordList, studyWords, masteredWords, spellingWords, reviewedWords, studyScope, currentIndex: startIndex, currentWord: studyWords[startIndex] })
        this.buildChoices()
      })
      .catch(() => {
        wx.redirectTo({ url: '/pages/home/index' })
      })
  },

  decorateCurrentWord(word) {
    if (!word) return
    const decorated = decorateStudyWord(word)
    Object.keys(decorated).forEach((key) => {
      word[key] = decorated[key]
    })
    word.memoryLabel = getMemoryLabel(word)
    word.reviewHint = getNextReviewHint(word)
  },

  toggleMeaning() {
    if (this.data.mode !== 'flashcard') return
    this.setData({ showMeaning: !this.data.showMeaning })
  },

  switchMode(e) {
    this.clearEffectTimers()
    this.setData({
      mode: e.currentTarget.dataset.mode,
      feedback: '',
      spellingInput: '',
      showMeaning: false,
      showCoinBurst: false,
      showCombo: false,
      wrongChoiceWord: '',
      listeningPlayed: false
    })
    this.buildChoices()
  },

  buildChoices() {
    const currentWord = this.data.currentWord
    if (!currentWord) return

    // 四选一和听音辨义都需要 4 个选项。优先从当前词库全量词里抽干扰项，
    // 避免“今日复习词太少”时只显示 1-2 个选项。
    const pool = (this.data.wordList && this.data.wordList.words && this.data.wordList.words.length)
      ? this.data.wordList.words
      : this.data.studyWords
    const others = pool.filter((item) => item.word !== currentWord.word && (item.primaryMeaning || item.meaning))
    const choices = shuffle([currentWord, ...shuffle(others).slice(0, 3)])
    this.setData({ choices })
  },

  playCurrentWord() {
    if (!this.data.currentWord) return
    this.setData({ listeningPlayed: true })
    speakEnglishWord(this.data.currentWord.word)
  },

  submitFlashcard(e) {
    this.submitAnswer(e.currentTarget.dataset.result)
  },

  submitChoice(e) {
    const selected = e.currentTarget.dataset.word
    const result = selected === this.data.currentWord.word ? 'correct' : 'wrong'
    if (result === 'wrong') {
      this.setData({ wrongChoiceWord: '' })
      setTimeout(() => this.setData({ wrongChoiceWord: selected }), 20)
      setTimeout(() => this.setData({ wrongChoiceWord: '' }), 650)
    }
    this.submitAnswer(result)
  },

  onSpellingInput(e) {
    this.setData({ spellingInput: e.detail.value })
  },

  submitSpelling() {
    const input = String(this.data.spellingInput || '').trim().toLowerCase()
    const answer = String(this.data.currentWord.word || '').trim().toLowerCase()
    const result = input === answer ? 'correct' : 'wrong'
    this.submitAnswer(result)
  },

  triggerSuccessEffect(nextComboCount) {
    this.clearEffectTimers()

    const showCombo = nextComboCount >= 2
    const comboText = showCombo ? buildComboText(nextComboCount, this.data.user.name) : ''
    const effectSeed = this.data.effectSeed + 1

    // 先关闭再打开，确保连续答对时动画每次都重新触发。
    this.setData({
      showCoinBurst: false,
      showCombo: false,
      comboText: '',
      effectSeed
    })

    this.effectStartTimer = setTimeout(() => {
      this.setData({
        showCoinBurst: true,
        showCombo,
        comboText
      })

      this.coinTimer = setTimeout(() => {
        this.setData({ showCoinBurst: false })
      }, 1050)

      this.comboTimer = setTimeout(() => {
        this.setData({ showCombo: false })
      }, 1250)
    }, 20)
  },

  submitAnswer(result) {
    if (this.data.submitting || !this.data.currentWord) return

    const { currentWord, mode, user, wordList } = this.data
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()
    const isPositiveHit = result === 'correct' || result === 'known'
    const nextComboCount = isPositiveHit ? this.data.comboCount + 1 : 0
    const instantPraise = isPositiveHit
      ? buildCorrectPraise(user.name, user.interactionStyle, user.voiceStyle)
      : ''

    // 真机音频要尽量贴近用户点击事件触发；先在这里播放，避免等云函数返回后被手机拦截。
    if (isPositiveHit) {
      playCorrectVoice(instantPraise)
      this.triggerSuccessEffect(nextComboCount)
      speakEnglishWord(currentWord.word, { delay: 850 })
    } else {
      this.clearEffectTimers()
      this.setData({
        showCoinBurst: false,
        showCombo: false,
        comboText: ''
      })
      speakEnglishWord(currentWord.word, { delay: 250 })
    }

    this.setData({
      submitting: true,
      comboCount: nextComboCount
    })

    callFunction('updateWordProgress', {
      userId,
      wordListId,
      word: currentWord.word,
      meaning: currentWord.meaning,
      mode,
      result,
      currentIndex: this.data.currentIndex
    }, { showLoading: false })
      .then((res) => {
        const updatedWord = res.updatedWord
        const feedbackType = result === 'correct' || result === 'known' || result === 'unclear' ? 'correct' : 'wrong'
        const feedback = isPositiveHit
          ? (nextComboCount >= 3 ? `${instantPraise} ${buildComboText(nextComboCount, user.name)}` : instantPraise)
          : getFeedbackMessage(user.interactionStyle, feedbackType)

        const decoratedUpdatedWord = decorateStudyWord(updatedWord)
        this.decorateCurrentWord(decoratedUpdatedWord)
        const words = wordList.words.map((item) => item.word === updatedWord.word ? decoratedUpdatedWord : item)
        const studyWords = this.data.studyWords.map((item) => item.word === updatedWord.word ? decoratedUpdatedWord : item)
        const masteredWords = words.filter((item) => item.recognitionPassed || item.memoryStatus === 'green')
        const spellingWords = words.filter((item) => item.spellingPassed)
        const reviewedWords = words.filter((item) => Number(item.reviewedCount || 0) > 0)
        const nextWordList = { ...wordList, words }

        this.setData({
          wordList: nextWordList,
          studyWords,
          masteredWords,
          spellingWords,
          reviewedWords,
          feedback,
          feedbackType,
          showMeaning: true,
          submitting: false
        })

        const delay = isPositiveHit ? (nextComboCount >= 2 ? 1800 : 1500) : 900
        setTimeout(() => this.nextWord(), delay)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  },

  nextWord() {
    const nextIndex = this.data.currentIndex + 1
    const nextWord = this.data.studyWords[nextIndex]
    if (!nextWord) storage.clearLastStudyProgress()

    this.decorateCurrentWord(nextWord)
    storage.setLastStudyProgress({
      wordListId: this.data.wordList && this.data.wordList._id,
      currentIndex: nextIndex,
      mode: this.data.mode,
      scope: this.data.studyScope,
      updatedAt: Date.now()
    })

    this.setData({
      currentIndex: nextIndex,
      currentWord: nextWord || null,
      showMeaning: false,
      spellingInput: '',
      feedback: '',
      wrongChoiceWord: '',
      listeningPlayed: false
    })
    this.buildChoices()
  },

  goReport() {
    wx.redirectTo({ url: '/pages/report/index' })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})
