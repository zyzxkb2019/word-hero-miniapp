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

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const code = String(event.code || '').trim().toUpperCase()
  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = listRes.data
  if (!wordList || wordList.openid !== openid) return { success: false, message: '无权共享该词库' }
  const userRes = await db.collection('users').doc(wordList.userId).get().catch(() => ({ data: null }))
  const user = userRes.data || {}
  const groupRes = await db.collection('studyGroups').where({ code }).limit(1).get()
  const group = (groupRes.data || [])[0]
  if (!group) return { success: false, message: '没有找到这个小队' }
  const shared = [...(group.sharedLists || []).filter((item) => item.wordListId !== wordList._id), {
    wordListId: wordList._id,
    title: wordList.title || '共享词库',
    ownerUserId: wordList.userId,
    ownerName: user.name || '同学',
    totalWords: (wordList.words || []).length,
    sharedAt: new Date()
  }]
  await db.collection('studyGroups').doc(group._id).update({ data: { sharedLists: shared, updatedAt: db.serverDate() } })
  return { success: true, sharedLists: shared }
}
