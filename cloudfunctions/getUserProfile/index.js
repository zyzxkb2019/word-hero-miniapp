const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function makeParentCode(id) {
  return String(id || '').slice(-6).toUpperCase()
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  let user = null

  if (event.userId) {
    try {
      const res = await db.collection('users').doc(event.userId).get()
      user = res.data || null
    } catch (err) {
      user = null
    }
  }

  if (!user) {
    const res = await db.collection('users').where({ openid }).limit(1).get()
    user = res.data[0] || null
  }

  if (!user || user.openid !== openid) return { success: false, message: '请先创建学生资料' }

  if (!user.parentCode) {
    user.parentCode = makeParentCode(user._id)
    await db.collection('users').doc(user._id).update({ data: { parentCode: user.parentCode } }).catch(() => {})
  }

  return { success: true, user }
}
