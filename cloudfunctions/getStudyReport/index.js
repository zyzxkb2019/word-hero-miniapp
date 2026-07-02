const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function getBucket(word) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return 'green'
  if (word.spellingPassed || word.memoryStatus === 'spelling') return 'spelling'
  if (Number(word.reviewedCount || 0) > 0) return 'reviewed'
  return 'new'
}

function getStatus(score, word) {
  const bucket = getBucket(word || {})
  if (bucket === 'green') return '已过关'
  if (bucket === 'spelling') return '拼写过关'
  if (score <= 1) return '未掌握'
  if (score <= 4) return '半掌握'
  return '熟悉中'
}

function formatDateForDisplay(value) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未记录'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getNextReviewDateText(word = {}) {
  if (!word.nextReviewAt) return '暂无'
  const date = new Date(word.nextReviewAt)
  if (Number.isNaN(date.getTime())) return '暂无'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const time = new Date(word.nextReviewAt).getTime()
  if (Number.isNaN(time)) return false
  return time <= Date.now()
}


function getNextReviewHint(word = {}) {
  const milestones = [1, 2, 4, 7, 15, 21]
  const count = Number(word.reviewedCount || 0)
  const next = milestones.find((item) => item > count)
  if (!count) return '刚上传，先见第一面'
  if (!next) return '已完成21天抗遗忘主线'
  return `已背${count}次，下个里程碑：第${next}次`
}

function decorateWord(item) {
  const bucket = getBucket(item)
  return {
    ...item,
    memoryBucket: bucket,
    memoryLabel: bucket === 'green' ? '绿格过关' : bucket === 'spelling' ? '拼写过关' : bucket === 'reviewed' ? '抗遗忘中' : '新词',
    uploadDateText: formatDateForDisplay(item.uploadAt || item.createdAt),
    reviewHint: getNextReviewHint(item),
    nextReviewDateText: getNextReviewDateText(item),
    dueToday: isDueWord(item),
    reviewedCount: Number(item.reviewedCount || 0),
    consecutiveRecognizedDays: Number(item.consecutiveRecognizedDays || 0),
    spellingRightCount: Number(item.spellingRightCount || 0)
  }
}

function getChinaDayRange() {
  const now = new Date()
  const offsetMs = 8 * 60 * 60 * 1000
  const chinaNow = new Date(now.getTime() + offsetMs)
  const y = chinaNow.getUTCFullYear()
  const m = chinaNow.getUTCMonth()
  const d = chinaNow.getUTCDate()
  const start = new Date(Date.UTC(y, m, d) - offsetMs)
  const end = new Date(Date.UTC(y, m, d + 1) - offsetMs)
  return { start, end }
}

function buildMessage(user, report) {
  const name = user.name || '同学'
  const firstWeak = report.weakWords[0]
  const greenCount = report.greenCount || 0
  const spellingCount = report.spellingPassedCount || 0
  const trend = report.curveSummary && report.curveSummary.trend ? report.curveSummary.trend : '开始形成学习轨迹'
  if (user.interactionStyle === '游戏闯关型') return `${name} 已有 ${greenCount} 个词进绿格，${spellingCount} 个词完成拼写击杀。学习曲线显示：${trend}。${firstWeak ? firstWeak.word + ' 还在逃，下一轮优先抓它。' : '今天状态不错，继续升级。'}`
  if (user.interactionStyle === '温柔鼓励型') return `${name} 已经把 ${greenCount} 个词稳定记住了。学习曲线显示：${trend}。${firstWeak ? firstWeak.word + ' 还需要多见几次，慢慢来。' : '你已经慢慢进入状态了。'}`
  if (user.interactionStyle === '学霸教练型') return `${name}，今日训练完成。绿格 ${greenCount} 个，拼写过关 ${spellingCount} 个。曲线趋势：${trend}。下一轮建议优先复盘 ${firstWeak ? firstWeak.word : '低频词'}。`
  return `${name}，今天大脑运动量达标。绿格 ${greenCount} 个，拼写格 ${spellingCount} 个，曲线趋势：${trend}。`
}

function getTimeValue(value) {
  const d = new Date(value)
  const t = d.getTime()
  return Number.isNaN(t) ? 0 : t
}

function buildCurve(records) {
  const sorted = [...(records || [])].sort((a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt)).slice(-24)
  if (!sorted.length) {
    return {
      points: [],
      summary: { trend: '暂无曲线，完成一轮练习后自动生成', accuracy: 0, total: 0, volatility: 0 }
    }
  }

  let value = 62
  const points = sorted.map((item, index) => {
    const right = item.result === 'correct' || item.result === 'known'
    const spelling = item.mode === 'spelling'
    const delta = right ? (spelling ? 10 : 7) : -12
    const pulse = index % 2 === 0 ? 5 : -4
    value = Math.max(20, Math.min(96, value + delta + pulse))
    return {
      index: index + 1,
      value,
      label: item.word || '',
      result: item.result,
      mode: item.mode
    }
  })

  const correct = sorted.filter((item) => item.result === 'correct' || item.result === 'known').length
  const accuracy = Math.round((correct / sorted.length) * 100)
  const first = points[0].value
  const last = points[points.length - 1].value
  const volatility = points.length > 1 ? Math.round(points.slice(1).reduce((sum, item, idx) => sum + Math.abs(item.value - points[idx].value), 0) / (points.length - 1)) : 0
  let trend = '整体平稳'
  if (last - first >= 12) trend = '明显上扬，越练越稳'
  else if (last - first <= -12) trend = '后半段有波动，需要减量复盘'
  else if (volatility >= 16) trend = '起伏较大，说明有词还不够熟'

  return { points, summary: { trend, accuracy, total: sorted.length, volatility } }
}

function buildWeakWords(words, records) {
  const wordMap = {}
  words.forEach((item) => {
    wordMap[item.word] = item
  })

  const weakMap = {}
  ;(records || []).forEach((record) => {
    if (record.result !== 'wrong' && record.result !== 'unknown') return
    const word = record.word
    if (!word || !wordMap[word]) return
    if (!weakMap[word]) {
      weakMap[word] = {
        ...wordMap[word],
        wrongCountInReport: 0,
        weakReason: '最近闯关答错'
      }
    }
    weakMap[word].wrongCountInReport += 1
    if (!weakMap[word].lastWrongAt) weakMap[word].lastWrongAt = record.createdAt
  })

  const recentWrongWords = Object.values(weakMap).sort((a, b) => {
    const wrongDiff = Number(b.wrongCountInReport || 0) - Number(a.wrongCountInReport || 0)
    if (wrongDiff !== 0) return wrongDiff
    return getTimeValue(b.lastWrongAt) - getTimeValue(a.lastWrongAt)
  })

  const used = {}
  recentWrongWords.forEach((item) => {
    used[item.word] = true
  })

  const lowScoreWords = [...words]
    .filter((item) => item.memoryBucket !== 'green' && !used[item.word])
    .sort((a, b) => Number(a.masteryScore || 0) - Number(b.masteryScore || 0))
    .map((item) => ({ ...item, weakReason: '掌握度偏低' }))

  return [...recentWrongWords, ...lowScoreWords].slice(0, 8)
}

async function createReport({ wordList, user, openid, wordListId }) {
  const words = (wordList.words || []).map(decorateWord)
  const report = {
    totalWords: words.length,
    masteredCount: 0,
    learningCount: 0,
    unmasteredCount: 0,
    greenCount: 0,
    spellingPassedCount: 0,
    reviewedCount: 0,
    todayPracticeCount: 0,
    correctCount: 0,
    wrongCount: 0,
    weakWords: [],
    masteredWords: [],
    spellingWords: [],
    reviewedWords: [],
    newWords: [],
    curvePoints: [],
    curveSummary: {},
    message: '',
    dueReviewWords: [],
    dueReviewCount: 0
  }

  words.forEach((item) => {
    const status = getStatus(Number(item.masteryScore || 0), item)
    if (status === '已过关') report.masteredCount += 1
    else if (status === '未掌握') report.unmasteredCount += 1
    else report.learningCount += 1
    if (item.memoryBucket === 'green') report.greenCount += 1
    if (item.spellingPassed) report.spellingPassedCount += 1
    if (Number(item.reviewedCount || 0) > 0) report.reviewedCount += 1
  })

  const { start, end } = getChinaDayRange()
  const todayRes = await db.collection('studyRecords').where({ openid, wordListId, createdAt: _.gte(start).and(_.lt(end)) }).limit(1000).get()
  const allRes = await db.collection('studyRecords').where({ openid, wordListId }).orderBy('createdAt', 'desc').limit(120).get()
  const todayRecords = todayRes.data || []
  const allRecords = allRes.data || []
  const curve = buildCurve(allRecords)

  report.todayPracticeCount = todayRecords.length
  report.correctCount = todayRecords.filter((item) => item.result === 'correct' || item.result === 'known').length
  report.wrongCount = todayRecords.filter((item) => item.result === 'wrong' || item.result === 'unknown').length
  report.curvePoints = curve.points
  report.curveSummary = curve.summary
  report.weakWords = buildWeakWords(words, allRecords)
  report.masteredWords = words.filter((item) => item.memoryBucket === 'green').sort((a, b) => Number(b.consecutiveRecognizedDays || 0) - Number(a.consecutiveRecognizedDays || 0)).slice(0, 50)
  report.spellingWords = words.filter((item) => item.spellingPassed).sort((a, b) => Number(b.spellingRightCount || 0) - Number(a.spellingRightCount || 0)).slice(0, 50)
  report.reviewedWords = words.filter((item) => Number(item.reviewedCount || 0) > 0 && item.memoryBucket !== 'green').sort((a, b) => Number(b.reviewedCount || 0) - Number(a.reviewedCount || 0)).slice(0, 50)
  report.newWords = words.filter((item) => Number(item.reviewedCount || 0) === 0).slice(0, 50)
  report.dueReviewWords = words.filter(isDueWord).sort((a, b) => Number(a.masteryScore || 0) - Number(b.masteryScore || 0)).slice(0, 50)
  report.dueReviewCount = report.dueReviewWords.length
  report.message = buildMessage(user, report)

  return report
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!event.wordListId) return { success: false, message: '请先选择词表' }

  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = listRes.data
  if (!wordList || wordList.openid !== openid) return { success: false, message: '无权访问该报告' }

  const userRes = await db.collection('users').doc(wordList.userId).get().catch(() => ({ data: null }))
  const user = userRes.data || { name: '同学', interactionStyle: '游戏闯关型' }
  const report = await createReport({ wordList, user, openid, wordListId: event.wordListId })
  return { success: true, report }
}
