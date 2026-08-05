const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')
const { sortWordsForStudy, getMemoryLabel, getNextReviewHint } = require('../../utils/mastery')
const { getFeedbackMessage } = require('../../utils/feedbackMessages')
const { initCorrectSound, playCorrectVoice, speakEnglishWord, buildCorrectPraise, buildComboCheer, destroyCorrectSound } = require('../../utils/audio')
const textbookUnits = require('../../constants/textbookUnits')
const { getWordFormHint } = require('../../utils/wordForms')
const { getPhonicsHint } = require('../../utils/phonicsFamilies')

const CHALLENGE_GROUP_SIZE = 5
const CHALLENGE_STAGE_SIZE = 25

function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const t = new Date(word.nextReviewAt).getTime()
  return !Number.isNaN(t) && t <= Date.now()
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function cleanMeaningText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([；;，,、/|])\s*/g, '$1')
    .trim()
}

function normalizeMeaningList(word = {}) {
  if (Array.isArray(word.meanings) && word.meanings.length) {
    const seen = {}
    return word.meanings
      .map(cleanMeaningText)
      .filter(Boolean)
      .filter((item) => {
        if (seen[item]) return false
        seen[item] = true
        return true
      })
  }

  const source = cleanMeaningText(word.meaningText || word.meaning || word.cn || word.definition)
  if (!source) return []
  return source
    .split(/[；;\n\r]+/)
    .map(cleanMeaningText)
    .filter(Boolean)
}

function buildMeaningText(word = {}, meanings = normalizeMeaningList(word)) {
  if (word.meaningText) return cleanMeaningText(word.meaningText)
  if (word.meaning && String(word.meaning).trim()) return cleanMeaningText(word.meaning)
  return meanings.join('；')
}
function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeLookupText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildTextbookContextMap() {
  const map = {}
  ;(textbookUnits || []).forEach((unit) => {
    ;(unit.words || []).forEach((item) => {
      const key = normalizeLookupText(item.word)
      if (!key || map[key]) return
      if (!item.example && !item.clozeExample) return
      map[key] = {
        example: item.example || '',
        clozeExample: item.clozeExample || '',
        matchedForm: item.matchedForm || '',
        examplePage: item.examplePage || item.sourcePage || '',
        sourceText: item.sourceText || unit.unit || ''
      }
    })
  })
  return map
}

const TEXTBOOK_CONTEXT_BY_WORD = buildTextbookContextMap()

function enrichTextbookContext(word = {}) {
  const fallback = TEXTBOOK_CONTEXT_BY_WORD[normalizeLookupText(word.word)]
  if (!fallback) return word
  return {
    ...word,
    example: word.example || fallback.example,
    clozeExample: word.clozeExample || fallback.clozeExample,
    matchedForm: word.matchedForm || fallback.matchedForm,
    examplePage: word.examplePage || fallback.examplePage,
    sourceText: word.sourceText || fallback.sourceText
  }
}

function hasUsefulCloze(value) {
  return /_{2,}|…{2,}|……|\.\.\.+/.test(String(value || ''))
}

function addCandidate(list, value) {
  const text = String(value || '').trim()
  if (!text || list.includes(text)) return
  list.push(text)
}

function buildClozeCandidates(word = {}) {
  const candidates = []
  const term = String(word.word || '').trim()
  const matched = String(word.matchedForm || '').trim()
  addCandidate(candidates, matched)
  addCandidate(candidates, term)

  if (/^be\s+/i.test(term)) {
    const rest = term.replace(/^be\s+/i, '')
    ;['is', 'are', 'am', 'was', 'were', 'been', 'being', 'be'].forEach((verb) => addCandidate(candidates, verb + ' ' + rest))
  }

  const parts = term.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    if (/[^s]$/i.test(term)) addCandidate(candidates, term + 's')
    if (/(s|x|ch|sh)$/i.test(term)) addCandidate(candidates, term + 'es')
    if (/[^aeiou]y$/i.test(term)) addCandidate(candidates, term.slice(0, -1) + 'ies')
  }

  return candidates.sort((a, b) => b.length - a.length)
}

function replaceTermWithBlank(example, term) {
  const words = String(term || '').trim().split(/\s+/).filter(Boolean).map(escapeRegExp)
  if (!words.length) return example
  const pattern = words.join('\\s+')
  const reg = new RegExp('(^|[^A-Za-z])(' + pattern + ')(?=$|[^A-Za-z])', 'i')
  return String(example || '').replace(reg, '$1____')
}

function buildClozeExample(word = {}) {
  const example = String(word.example || '').trim()
  const savedCloze = String(word.clozeExample || '').trim()
  if (hasUsefulCloze(savedCloze)) return savedCloze
  if (!example) return ''

  const candidates = buildClozeCandidates(word)
  for (let i = 0; i < candidates.length; i += 1) {
    const cloze = replaceTermWithBlank(example, candidates[i])
    if (cloze !== example && hasUsefulCloze(cloze)) return cloze
  }

  return ''
}

function decorateStudyWord(word = {}) {
  const enrichedWord = enrichTextbookContext(word)
  const meanings = normalizeMeaningList(enrichedWord)
  const meaningText = buildMeaningText(enrichedWord, meanings)
  const primaryMeaning = meaningText || String(enrichedWord.meaning || '').trim()
  return {
    ...enrichedWord,
    meanings,
    primaryMeaning,
    meaningText,
    clozeExample: buildClozeExample(enrichedWord),
    formHint: getWordFormHint({ ...enrichedWord, meaningText, primaryMeaning }),
    phonicsHint: getPhonicsHint(enrichedWord)
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
  if (comboCount === 5) return `${safeName}五连击！鲜花送上！`
  if (comboCount > 5 && comboCount % 5 === 0) return `${safeName}${comboCount}连击！全场欢呼！`
  if (comboCount > 5) return `${safeName}${comboCount}连击！继续冲！`
  return `COMBO × ${comboCount}`
}

function getWordKey(word = {}) {
  return String(word.word || '').trim().toLowerCase()
}

function getWordByKey(words, key) {
  return (words || []).find((item) => getWordKey(item) === key)
}

function getWordsByKeyMap(words, keyMap) {
  return Object.keys(keyMap || {})
    .map((key) => getWordByKey(words, key))
    .filter(Boolean)
}

function markWordKey(keyMap, word) {
  const key = getWordKey(word)
  if (!key) return keyMap || {}
  return { ...(keyMap || {}), [key]: true }
}

function clearWordKey(keyMap, word) {
  const key = getWordKey(word)
  if (!key || !keyMap || !keyMap[key]) return keyMap || {}
  const next = { ...keyMap }
  delete next[key]
  return next
}

function hasWordKeys(keyMap) {
  return Object.keys(keyMap || {}).length > 0
}

function buildChallengeMessage(phase, queue, baseWordIndex, retryRound) {
  const count = (queue || []).length
  const chance = ((Math.max(1, Number(retryRound || 1)) - 1) % 3) + 1
  if (phase === 'groupReview') return `本组错词复闯：第 ${chance}/3 次机会，${count} 个词全部答对，再进入下一组。`
  if (phase === 'stageReview') return `阶段错词回顾：第 ${chance}/3 次机会，前 25 个词里的错词全部答对，再继续新关卡。`
  const groupNo = Math.floor(Number(baseWordIndex || 0) / CHALLENGE_GROUP_SIZE) + 1
  return `第 ${groupNo} 组：5 个词为一关，错词会立刻回炉。`
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
    showFlowerBurst: false,
    showCombo: false,
    comboText: '',
    effectSeed: 0,
    wrongChoiceWord: '',
    listeningPlayed: false,
    baseWordIndex: 0,
    challengeQueue: [],
    challengeQueueIndex: 0,
    challengePhase: 'group',
    groupWrongMap: {},
    stageWrongMap: {},
    stageReviewWrongMap: {},
    groupRetryRound: 0,
    stageReviewRound: 0,
    challengeMessage: ''
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
    if (this.flowerTimer) clearTimeout(this.flowerTimer)
    if (this.effectStartTimer) clearTimeout(this.effectStartTimer)
    this.coinTimer = null
    this.comboTimer = null
    this.flowerTimer = null
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
        const studyWords = sortWordsForStudy(rawStudyWords).map((item, index) => ({ ...item, _studyIndex: index }))
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
        this.setData({ user, wordList: nextWordList, studyWords, masteredWords, spellingWords, reviewedWords, studyScope })
        this.startChallengeGroup(startIndex)
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

  startChallengeGroup(startIndex) {
    const baseWordIndex = Math.max(0, Number(startIndex || 0))
    const queue = this.data.studyWords.slice(baseWordIndex, baseWordIndex + CHALLENGE_GROUP_SIZE)
    if (!queue.length) {
      storage.clearLastStudyProgress()
      this.setData({
        baseWordIndex,
        challengeQueue: [],
        challengeQueueIndex: 0,
        challengePhase: 'done',
        currentIndex: baseWordIndex,
        currentWord: null,
        challengeMessage: ''
      })
      return
    }

    const currentWord = queue[0]
    this.decorateCurrentWord(currentWord)
    this.setData({
      baseWordIndex,
      challengeQueue: queue,
      challengeQueueIndex: 0,
      challengePhase: 'group',
      groupWrongMap: {},
      stageReviewWrongMap: {},
      groupRetryRound: 0,
      stageReviewRound: 0,
      currentIndex: Number(currentWord._studyIndex || baseWordIndex),
      currentWord,
      showMeaning: false,
      spellingInput: '',
      feedback: '',
      wrongChoiceWord: '',
      listeningPlayed: false,
      challengeMessage: buildChallengeMessage('group', queue, baseWordIndex)
    })
    this.buildChoices()
  },

  startChallengeReview(phase, queue, wrongMap, retryRound) {
    const currentWord = queue[0]
    if (!currentWord) {
      this.startChallengeGroup(this.data.baseWordIndex)
      return
    }
    this.decorateCurrentWord(currentWord)
    const data = {
      challengeQueue: queue,
      challengeQueueIndex: 0,
      challengePhase: phase,
      currentIndex: Number(currentWord._studyIndex || 0),
      currentWord,
      showMeaning: false,
      spellingInput: '',
      feedback: '',
      wrongChoiceWord: '',
      listeningPlayed: false,
      challengeMessage: buildChallengeMessage(phase, queue, this.data.baseWordIndex, retryRound)
    }
    if (phase === 'groupReview') {
      data.groupWrongMap = wrongMap
      data.groupRetryRound = retryRound
    }
    if (phase === 'stageReview') {
      data.stageReviewWrongMap = wrongMap
      data.stageReviewRound = retryRound
    }
    this.setData(data)
    this.buildChoices()
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
      showFlowerBurst: false,
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
    const others = pool.filter((item) => item.word !== currentWord.word && (item.meaningText || item.primaryMeaning || item.meaning))
    const choices = shuffle([currentWord, ...shuffle(others).slice(0, 3)])
    this.setData({ choices })
  },

  playCurrentWord(e) {
    if (!this.data.currentWord) return
    const eventWord = e && e.detail && e.detail.word
    const word = eventWord || this.data.currentWord.word
    this.setData({ listeningPlayed: true })
    speakEnglishWord(word)
  },

  playPhonicsExample(e) {
    const word = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.word
    if (!word) return
    speakEnglishWord(word)
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
    const showFlowerBurst = nextComboCount > 0 && nextComboCount % 5 === 0
    const comboText = showCombo ? buildComboText(nextComboCount, this.data.user.name) : ''
    const effectSeed = this.data.effectSeed + 1

    // 先关闭再打开，确保连续答对时动画每次都重新触发。
    this.setData({
      showCoinBurst: false,
      showFlowerBurst: false,
      showCombo: false,
      comboText: '',
      effectSeed
    })

    this.effectStartTimer = setTimeout(() => {
      this.setData({
        showCoinBurst: true,
        showFlowerBurst,
        showCombo,
        comboText
      })

      this.coinTimer = setTimeout(() => {
        this.setData({ showCoinBurst: false })
      }, 1050)

      this.comboTimer = setTimeout(() => {
        this.setData({ showCombo: false })
      }, 1250)

      if (showFlowerBurst) {
        this.flowerTimer = setTimeout(() => {
          this.setData({ showFlowerBurst: false })
        }, 1500)
      }
    }, 20)
  },

  submitAnswer(result) {
    if (this.data.submitting || !this.data.currentWord) return

    const { currentWord, mode, user, wordList } = this.data
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()
    const isPositiveHit = result === 'correct' || result === 'known'
    const nextComboCount = isPositiveHit ? this.data.comboCount + 1 : 0
    const isComboMilestone = nextComboCount > 0 && nextComboCount % 5 === 0
    const instantPraise = isPositiveHit
      ? (isComboMilestone ? buildComboCheer(nextComboCount, user.name) : buildCorrectPraise(user.name, user.interactionStyle, user.voiceStyle))
      : ''

    // 真机音频要尽量贴近用户点击事件触发；先在这里播放，避免等云函数返回后被手机拦截。
    if (isPositiveHit) {
      playCorrectVoice(instantPraise)
      this.triggerSuccessEffect(nextComboCount)
      speakEnglishWord(currentWord.word, { delay: isComboMilestone ? 1650 : 850 })
    } else {
      this.clearEffectTimers()
      this.setData({
        showCoinBurst: false,
        showFlowerBurst: false,
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
        const studyWords = this.data.studyWords.map((item) => item.word === updatedWord.word ? { ...decoratedUpdatedWord, _studyIndex: item._studyIndex } : item)
        const challengeQueue = this.data.challengeQueue.map((item) => item.word === updatedWord.word ? { ...decoratedUpdatedWord, _studyIndex: item._studyIndex } : item)
        const masteredWords = words.filter((item) => item.recognitionPassed || item.memoryStatus === 'green')
        const spellingWords = words.filter((item) => item.spellingPassed)
        const reviewedWords = words.filter((item) => Number(item.reviewedCount || 0) > 0)
        const nextWordList = { ...wordList, words }

        this.setData({
          wordList: nextWordList,
          studyWords,
          challengeQueue,
          masteredWords,
          spellingWords,
          reviewedWords,
          feedback,
          feedbackType,
          showMeaning: true,
          submitting: false
        })

        const delay = isPositiveHit ? (nextComboCount >= 2 ? 1800 : 1500) : 900
        setTimeout(() => this.nextWord(isPositiveHit, decoratedUpdatedWord), delay)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  },

  nextWord(isPositiveHit, answeredWord) {
    const phase = this.data.challengePhase
    let groupWrongMap = this.data.groupWrongMap || {}
    let stageWrongMap = this.data.stageWrongMap || {}
    let stageReviewWrongMap = this.data.stageReviewWrongMap || {}

    if (answeredWord) {
      if (isPositiveHit) {
        groupWrongMap = clearWordKey(groupWrongMap, answeredWord)
        stageReviewWrongMap = clearWordKey(stageReviewWrongMap, answeredWord)
        if (phase === 'stageReview') stageWrongMap = clearWordKey(stageWrongMap, answeredWord)
      } else if (phase === 'stageReview') {
        stageReviewWrongMap = markWordKey(stageReviewWrongMap, answeredWord)
        stageWrongMap = markWordKey(stageWrongMap, answeredWord)
      } else {
        groupWrongMap = markWordKey(groupWrongMap, answeredWord)
        stageWrongMap = markWordKey(stageWrongMap, answeredWord)
      }
    }

    const nextQueueIndex = this.data.challengeQueueIndex + 1
    const nextWord = this.data.challengeQueue[nextQueueIndex]
    if (nextWord) {
      this.decorateCurrentWord(nextWord)
      this.setData({
        groupWrongMap,
        stageWrongMap,
        stageReviewWrongMap,
        challengeQueueIndex: nextQueueIndex,
        currentIndex: Number(nextWord._studyIndex || 0),
        currentWord: nextWord,
        showMeaning: false,
        spellingInput: '',
        feedback: '',
        wrongChoiceWord: '',
        listeningPlayed: false
      })
      this.buildChoices()
      return
    }

    if ((phase === 'group' || phase === 'groupReview') && hasWordKeys(groupWrongMap)) {
      const reviewQueue = getWordsByKeyMap(this.data.studyWords, groupWrongMap)
      const retryRound = phase === 'groupReview' ? Number(this.data.groupRetryRound || 0) + 1 : 1
      this.startChallengeReview('groupReview', reviewQueue, groupWrongMap, retryRound)
      this.setData({ stageWrongMap })
      return
    }

    if (phase === 'stageReview' && hasWordKeys(stageReviewWrongMap)) {
      const reviewQueue = getWordsByKeyMap(this.data.studyWords, stageReviewWrongMap)
      const retryRound = Number(this.data.stageReviewRound || 0) + 1
      this.startChallengeReview('stageReview', reviewQueue, stageReviewWrongMap, retryRound)
      this.setData({ stageWrongMap })
      return
    }

    const nextBaseIndex = phase === 'stageReview'
      ? this.data.baseWordIndex
      : this.data.baseWordIndex + CHALLENGE_GROUP_SIZE

    storage.setLastStudyProgress({
      wordListId: this.data.wordList && this.data.wordList._id,
      currentIndex: nextBaseIndex,
      mode: this.data.mode,
      scope: this.data.studyScope,
      updatedAt: Date.now()
    })

    if (phase !== 'stageReview' && nextBaseIndex > 0 && nextBaseIndex % CHALLENGE_STAGE_SIZE === 0 && hasWordKeys(stageWrongMap)) {
      const reviewQueue = getWordsByKeyMap(this.data.studyWords, stageWrongMap)
      this.setData({ baseWordIndex: nextBaseIndex, groupWrongMap: {} })
      this.startChallengeReview('stageReview', reviewQueue, { ...stageWrongMap }, 1)
      return
    }

    this.setData({
      groupWrongMap: {},
      stageWrongMap: phase === 'stageReview' ? {} : stageWrongMap,
      stageReviewWrongMap: {}
    })
    this.startChallengeGroup(nextBaseIndex)
  },

  goReport() {
    wx.redirectTo({ url: '/pages/report/index' })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})


