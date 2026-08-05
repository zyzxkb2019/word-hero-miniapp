const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const userId = event.userId
  if (!userId) return { success: false, message: '请先完成登录资料，再创建学习小队' }

  const userRes = await db.collection('users').doc(userId).get().catch(() => ({ data: null }))
  const user = userRes.data
  if (!user) return { success: false, message: '没有找到当前用户资料，请重新进入小程序' }
  if (user.openid !== openid) return { success: false, message: '当前微信号和用户资料不匹配，请重新登录' }

  const code = makeCode()
  const group = {
    code,
    name: `${user.name || '同学'}的单词小队`,
    ownerUserId: user._id,
    ownerOpenid: openid,
    members: [{ userId: user._id, openid, name: user.name || '同学', joinedAt: new Date() }],
    leaderboard: [],
    sharedLists: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  await db.collection('studyGroups').add({ data: group })
  return { success: true, group, leaderboard: [], sharedLists: [] }
}
