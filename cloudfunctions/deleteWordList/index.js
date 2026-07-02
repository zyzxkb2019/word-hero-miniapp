const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!event.wordListId) return { success: false, message: '缺少词库ID' }

  const res = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = res.data
  if (!wordList || wordList.openid !== openid) return { success: false, message: '无权删除该词库' }

  await db.collection('wordLists').doc(event.wordListId).remove()
  return { success: true }
}
