const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function sortLeaderboard(list = []) {
  return [...list].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 30)
}

function calcScore(words = []) {
  const practiced = words.filter((w) => Number(w.reviewedCount || 0) > 0).length
  const green = words.filter((w) => w.recognitionPassed || w.memoryStatus === 'green').length
  const spelling = words.filter((w) => w.spellingPassed).length
  const weakPenalty = words.filter((w) => Number(w.masteryScore || 0) < 0).length * 2
  return Math.max(0, practiced * 6 + green * 12 + spelling * 10 - weakPenalty)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const code = String(event.code || '').trim().toUpperCase()
  const userRes = await db.collection('users').doc(event.userId).get().catch(() => ({ data: null }))
  const user = userRes.data
  if (!user || user.openid !== openid) return { success: false, message: '请先登录学生端' }
  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = listRes.data
  if (!wordList || wordList.openid !== openid) return { success: false, message: '请先选择自己的词库' }
  const groupRes = await db.collection('studyGroups').where({ code }).limit(1).get()
  const group = (groupRes.data || [])[0]
  if (!group) return { success: false, message: '没有找到这个小队' }
  const score = calcScore(wordList.words || [])
  const leaderboard = sortLeaderboard([...(group.leaderboard || []).filter((item) => item.userId !== user._id), {
    userId: user._id,
    name: user.name || '同学',
    score,
    updatedAt: new Date()
  }])
  await db.collection('studyGroups').doc(group._id).update({ data: { leaderboard, updatedAt: db.serverDate() } })
  return { success: true, score, leaderboard }
}
