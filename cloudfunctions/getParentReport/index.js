const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function codeOf(user) {
  return String(user.parentCode || user._id || '').slice(-6).toUpperCase()
}
function getBucket(word) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return 'green'
  if (word.spellingPassed || word.memoryStatus === 'spelling') return 'spelling'
  if (Number(word.reviewedCount || 0) > 0) return 'reviewed'
  return 'new'
}
function getTime(value) {
  const d = new Date(value)
  const t = d.getTime()
  return Number.isNaN(t) ? 0 : t
}
function buildCurve(records) {
  const sorted = [...(records || [])].sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt)).slice(-30)
  let value = 60
  const points = sorted.map((item, index) => {
    const right = item.result === 'correct' || item.result === 'known'
    value = Math.max(18, Math.min(96, value + (right ? 8 : -12) + (index % 2 ? -3 : 5)))
    return { index: index + 1, value, label: item.word || '', result: item.result }
  })
  const correct = sorted.filter((item) => item.result === 'correct' || item.result === 'known').length
  const accuracy = sorted.length ? Math.round((correct / sorted.length) * 100) : 0
  const first = points[0] ? points[0].value : 0
  const last = points.length ? points[points.length - 1].value : 0
  let trend = '暂无足够练习数据'
  if (points.length) trend = last - first >= 10 ? '曲线向上，掌握度在提升' : last - first <= -10 ? '曲线下探，需要安排复盘' : '曲线平稳，建议继续保持'
  return { points, summary: { total: sorted.length, accuracy, trend } }
}
function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const t = new Date(word.nextReviewAt).getTime()
  return !Number.isNaN(t) && t <= Date.now()
}

function statsOf(words) {
  const stats = { totalWords: 0, greenCount: 0, spellingPassedCount: 0, reviewedCount: 0, weakCount: 0, dueReviewCount: 0 }
  ;(words || []).forEach((word) => {
    stats.totalWords += 1
    const bucket = getBucket(word)
    if (bucket === 'green') stats.greenCount += 1
    if (word.spellingPassed) stats.spellingPassedCount += 1
    if (Number(word.reviewedCount || 0) > 0) stats.reviewedCount += 1
    if (bucket !== 'green' && Number(word.masteryScore || 0) <= 3) stats.weakCount += 1
    if (isDueWord(word)) stats.dueReviewCount += 1
  })
  return stats
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const parentOpenid = wxContext.OPENID
  const childCode = String(event.childCode || '').trim().toUpperCase()
  const childName = String(event.childName || '').trim()
  if (!childCode && !childName) return { success: false, message: '请输入孩子绑定码或姓名' }

  let users = []
  if (childCode) {
    const codeRes = await db.collection('users').where({ parentCode: childCode }).limit(5).get()
    users = codeRes.data || []
  }
  if (!users.length && childName) {
    const nameRes = await db.collection('users').where({ name: childName }).limit(10).get()
    users = (nameRes.data || []).filter((item) => !childCode || codeOf(item) === childCode)
  }
  if (!users.length) return { success: false, message: '没有找到孩子资料，请确认绑定码' }

  const child = users[0]
  await db.collection('parentBindings').add({
    data: {
      parentOpenid,
      childUserId: child._id,
      childName: child.name,
      childCode: codeOf(child),
      createdAt: db.serverDate()
    }
  }).catch(() => {})

  const listRes = await db.collection('wordLists').where({ userId: child._id }).orderBy('createdAt', 'desc').limit(30).get()
  const lists = listRes.data || []
  const allWords = lists.reduce((arr, item) => arr.concat(item.words || []), [])
  const overall = statsOf(allWords)
  const latestList = lists[0] || null
  const recordsRes = await db.collection('studyRecords').where({ userId: child._id }).orderBy('createdAt', 'desc').limit(160).get()
  const records = recordsRes.data || []
  const curve = buildCurve(records)
  const dueReviewWords = [...allWords].filter(isDueWord).sort((a, b) => Number(a.masteryScore || 0) - Number(b.masteryScore || 0)).slice(0, 20)
  const weakWords = [...allWords]
    .filter((item) => getBucket(item) !== 'green')
    .sort((a, b) => Number(a.masteryScore || 0) - Number(b.masteryScore || 0))
    .slice(0, 12)

  return {
    success: true,
    child: { userId: child._id, name: child.name, grade: child.grade, city: child.city, parentCode: codeOf(child) },
    overall,
    latestList: latestList ? { _id: latestList._id, title: latestList.title, stats: statsOf(latestList.words || []) } : null,
    lists: lists.map((item) => ({ _id: item._id, title: item.title, stats: statsOf(item.words || []) })),
    curvePoints: curve.points,
    curveSummary: curve.summary,
    weakWords,
    dueReviewWords,
    parentMessage: `${child.name || '孩子'} 目前共有 ${overall.totalWords} 个词，${overall.greenCount} 个进入绿格，${overall.spellingPassedCount} 个拼写过关，今天有 ${overall.dueReviewCount || 0} 个到期复习词。${curve.summary.trend}。`
  }
}
