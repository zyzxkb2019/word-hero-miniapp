const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const REVIEW_DAYS = [1, 2, 4, 7, 15]

function addDays(date, days) {
  return new Date(date.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000)
}

function calcNextReview(word, positive, reviewedAt) {
  if (word.recognitionPassed || word.memoryStatus === 'green') {
    return { reviewStage: Number(word.reviewStage || 0), nextReviewAt: null, needsReview: false }
  }
  let stage = Number(word.reviewStage || 0)
  if (positive) stage = Math.min(REVIEW_DAYS.length, stage + 1)
  else stage = 0
  const interval = REVIEW_DAYS[Math.max(0, Math.min(REVIEW_DAYS.length - 1, stage - 1))] || 1
  return { reviewStage: stage, nextReviewAt: addDays(reviewedAt, positive ? interval : 1), needsReview: true }
}

function getScoreChange(mode, result) {
  if (mode === 'flashcard') {
    if (result === 'known') return 1
    if (result === 'unclear') return 0
    if (result === 'unknown') return -1
  }
  if (mode === 'listening') return result === 'correct' ? 1 : -1
  if (mode === 'choice') return result === 'correct' ? 1 : -1
  if (mode === 'spelling') return result === 'correct' ? 2 : -1
  return 0
}

function clampScore(score) {
  if (score < -3) return -3
  if (score > 10) return 10
  return score
}

function getChinaDayKey(date = new Date()) {
  const offsetMs = 8 * 60 * 60 * 1000
  const china = new Date(date.getTime() + offsetMs)
  const y = china.getUTCFullYear()
  const m = String(china.getUTCMonth() + 1).padStart(2, '0')
  const d = String(china.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayKeyToUtcMs(dayKey) {
  const [y, m, d] = String(dayKey).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function calcConsecutiveDays(dayKeys, todayKey) {
  const set = new Set((dayKeys || []).filter(Boolean))
  let count = 0
  let cursor = dayKeyToUtcMs(todayKey)

  while (true) {
    const date = new Date(cursor)
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    if (!set.has(key)) break
    count += 1
    cursor -= 24 * 60 * 60 * 1000
  }

  return count
}

function isPositive(mode, result) {
  if (mode === 'flashcard') return result === 'known'
  if (mode === 'listening') return result === 'correct'
  if (mode === 'choice') return result === 'correct'
  if (mode === 'spelling') return result === 'correct'
  return false
}

function getMemoryStatus(word) {
  if (word.recognitionPassed) return 'green'
  if (word.spellingPassed) return 'spelling'
  if (Number(word.reviewedCount || 0) > 0) return 'reviewed'
  return 'new'
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()
  const reviewedAt = new Date()
  const todayKey = getChinaDayKey(reviewedAt)

  if (!event.wordListId || !event.word) return { success: false, message: '答题数据不完整' }

  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = listRes.data

  if (!wordList || wordList.openid !== openid) {
    return { success: false, message: '无权访问该词表' }
  }

  const scoreChange = getScoreChange(event.mode, event.result)
  const positive = isPositive(event.mode, event.result)
  let updatedWord = null

  const words = (wordList.words || []).map((item) => {
    if (item.word !== event.word) return item

    const reviewCount = Number(item.reviewedCount || 0) + 1
    let recognitionDates = Array.isArray(item.recognitionDates) ? [...item.recognitionDates] : []

    if (positive) {
      if (!recognitionDates.includes(todayKey)) recognitionDates.push(todayKey)
    }

    // 今天如果明确“不认识/答错”，就不把今天算作“连续认识日”。
    if (event.result === 'wrong' || event.result === 'unknown') {
      recognitionDates = recognitionDates.filter((key) => key !== todayKey)
    }

    recognitionDates = recognitionDates.slice(-30)
    const consecutiveRecognizedDays = calcConsecutiveDays(recognitionDates, todayKey)
    const spellingRightCount = Number(item.spellingRightCount || 0) + (event.mode === 'spelling' && event.result === 'correct' ? 1 : 0)
    const spellingWrongCount = Number(item.spellingWrongCount || 0) + (event.mode === 'spelling' && event.result === 'wrong' ? 1 : 0)

    const reviewPlan = calcNextReview(item, positive, reviewedAt)

    const next = {
      ...item,
      uploadAt: item.uploadAt || item.createdAt || reviewedAt,
      createdAt: item.createdAt || item.uploadAt || reviewedAt,
      reviewedCount: reviewCount,
      masteryScore: clampScore(Number(item.masteryScore || 0) + scoreChange),
      rightCount: Number(item.rightCount || 0) + (positive ? 1 : 0),
      wrongCount: Number(item.wrongCount || 0) + ((event.result === 'wrong' || event.result === 'unknown') ? 1 : 0),
      lastReviewedAt: reviewedAt,
      recognitionDates,
      consecutiveRecognizedDays,
      recognitionPassed: !!item.recognitionPassed || consecutiveRecognizedDays >= 3,
      spellingRightCount,
      spellingWrongCount,
      spellingPassed: !!item.spellingPassed || (event.mode === 'spelling' && event.result === 'correct'),
      lastSpelledAt: event.mode === 'spelling' ? reviewedAt : (item.lastSpelledAt || null),
      reviewStage: reviewPlan.reviewStage,
      nextReviewAt: reviewPlan.nextReviewAt,
      needsReview: reviewPlan.needsReview
    }

    next.memoryStatus = getMemoryStatus(next)
    if (next.memoryStatus === 'green') {
      next.needsReview = false
      next.nextReviewAt = null
    }
    updatedWord = next
    return next
  })

  if (!updatedWord) return { success: false, message: '没有找到这个单词' }

  await db.collection('wordLists').doc(event.wordListId).update({
    data: {
      words,
      updatedAt: now
    }
  })

  const currentIndex = Math.max(0, Number(event.currentIndex || 0) + 1)
  const lastStudyProgress = {
    wordListId: event.wordListId,
    currentIndex,
    word: updatedWord.word,
    mode: event.mode || 'listening',
    updatedAt: reviewedAt.getTime()
  }

  await db.collection('users').doc(wordList.userId).update({
    data: {
      lastWordListId: event.wordListId,
      lastStudyProgress,
      lastStudiedAt: now
    }
  }).catch(() => {})

  await db.collection('studyRecords').add({
    data: {
      userId: wordList.userId,
      openid,
      wordListId: event.wordListId,
      word: updatedWord.word,
      meaning: updatedWord.meaning || '',
      answeredIndex: Math.max(0, Number(event.currentIndex || 0)),
      nextIndex: currentIndex,
      mode: event.mode,
      result: event.result,
      scoreChange,
      reviewedCount: updatedWord.reviewedCount,
      consecutiveRecognizedDays: updatedWord.consecutiveRecognizedDays,
      recognitionPassed: updatedWord.recognitionPassed,
      spellingPassed: updatedWord.spellingPassed,
      memoryStatus: updatedWord.memoryStatus,
      reviewStage: updatedWord.reviewStage,
      nextReviewAt: updatedWord.nextReviewAt,
      needsReview: updatedWord.needsReview,
      dayKey: todayKey,
      reviewedAt,
      createdAt: now
    }
  })

  return { success: true, updatedWord, scoreChange }
}


