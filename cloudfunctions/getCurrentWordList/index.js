const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getLatestWordList(openid, userId) {
  const where = userId ? { openid, userId } : { openid }
  const res = await db.collection('wordLists')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  return res.data[0] || null
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (event.wordListId) {
    try {
      const res = await db.collection('wordLists').doc(event.wordListId).get()
      if (res.data && res.data.openid === openid) {
        return { success: true, wordList: res.data }
      }
    } catch (err) {
      // 本地缓存的 wordListId 可能已失效，继续读取最新词表。
    }
  }

  const wordList = await getLatestWordList(openid, event.userId)
  return { success: true, wordList }
}
