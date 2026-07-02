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
  const userRes = await db.collection('users').doc(event.userId).get().catch(() => ({ data: null }))
  const user = userRes.data
  if (!user || user.openid !== openid) return { success: false, message: '请先登录学生端' }

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
