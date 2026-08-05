const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const WORD_LIST_LIMIT = 70

function getBucket(word) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return 'green'
  if (word.spellingPassed || word.memoryStatus === 'spelling') return 'spelling'
  if (Number(word.reviewedCount || 0) > 0) return 'reviewed'
  return 'new'
}

function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const time = new Date(word.nextReviewAt).getTime()
  return !Number.isNaN(time) && time <= Date.now()
}

function buildStats(words) {
  const stats = {
    totalWords: 0,
    greenCount: 0,
    spellingPassedCount: 0,
    reviewedCount: 0,
    newCount: 0,
    masteredCount: 0,
    learningCount: 0,
    unmasteredCount: 0,
    dueReviewCount: 0
  }

  ;(words || []).forEach((item) => {
    stats.totalWords += 1
    const bucket = getBucket(item)
    if (bucket === 'green') {
      stats.greenCount += 1
      stats.masteredCount += 1
    } else if (bucket === 'new') {
      stats.newCount += 1
      stats.unmasteredCount += 1
    } else {
      stats.learningCount += 1
    }
    if (item.spellingPassed) stats.spellingPassedCount += 1
    if (Number(item.reviewedCount || 0) > 0) stats.reviewedCount += 1
    if (isDueWord(item)) stats.dueReviewCount += 1
  })
  return stats
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const where = event.userId ? { openid, userId: event.userId } : { openid }

  const res = await db.collection('wordLists')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  const lists = (res.data || []).map((item) => {
    const words = item.words || []
    return {
      _id: item._id,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      stats: buildStats(words),
      masteredWords: words.filter((word) => getBucket(word) === 'green').slice(0, 8),
      spellingWords: words.filter((word) => word.spellingPassed).slice(0, 8),
      weakWords: [...words].filter((word) => getBucket(word) !== 'green').sort((a, b) => Number(a.masteryScore || 0) - Number(b.masteryScore || 0)).slice(0, 5)
    }
  })

  return { success: true, lists, limit: WORD_LIST_LIMIT, remaining: Math.max(0, WORD_LIST_LIMIT - lists.length) }
}
