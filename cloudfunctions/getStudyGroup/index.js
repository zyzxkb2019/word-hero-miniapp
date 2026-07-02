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
  const code = String(event.code || '').trim().toUpperCase()
  const res = await db.collection('studyGroups').where({ code }).limit(1).get()
  const group = (res.data || [])[0]
  if (!group) return { success: false, message: '没有找到这个小队' }
  return { success: true, group, leaderboard: sortLeaderboard(group.leaderboard || []), sharedLists: group.sharedLists || [] }
}
