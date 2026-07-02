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
  const userRes = await db.collection('users').doc(event.userId).get().catch(() => ({ data: null }))
  const user = userRes.data
  if (!user || user.openid !== openid) return { success: false, message: '请先登录学生端' }
  const res = await db.collection('studyGroups').where({ code }).limit(1).get()
  const group = (res.data || [])[0]
  if (!group) return { success: false, message: '没有找到这个小队' }
  const members = Array.isArray(group.members) ? group.members : []
  if (!members.some((m) => m.userId === user._id)) members.push({ userId: user._id, openid, name: user.name || '同学', joinedAt: new Date() })
  await db.collection('studyGroups').doc(group._id).update({ data: { members, updatedAt: db.serverDate() } })
  return { success: true, group: { ...group, members }, leaderboard: sortLeaderboard(group.leaderboard || []), sharedLists: group.sharedLists || [] }
}
