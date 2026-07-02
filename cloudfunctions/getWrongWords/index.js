const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const userId = event.userId
  if (!userId) return { success: false, message: '缺少学生ID', words: [] }

  const userRes = await db.collection('users').doc(userId).get().catch(() => ({ data: null }))
  if (!userRes.data || userRes.data.openid !== openid) return { success: false, message: '无权读取错题本', words: [] }

  const res = await db.collection('studyRecords')
    .where({ openid, userId, result: _.in(['wrong', 'unknown']) })
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get()

  const map = {}
  ;(res.data || []).forEach((item) => {
    const word = String(item.word || '').trim().toLowerCase()
    if (!word) return
    if (!map[word]) {
      map[word] = { word, meaning: item.meaning || '', wrongCount: 0, lastWrongAt: item.createdAt }
    }
    map[word].wrongCount += 1
  })

  const words = Object.values(map).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 50)
  return { success: true, words }
}
