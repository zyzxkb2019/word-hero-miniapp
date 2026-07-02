const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function cleanString(value, fallback = '') {
  const text = String(value || '').trim()
  return text || fallback
}
function makeParentCode(id) {
  return String(id || '').slice(-6).toUpperCase()
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()

  const name = cleanString(event.name)
  const grade = cleanString(event.grade)
  const interactionStyle = cleanString(event.interactionStyle, '游戏闯关型')
  const voiceStyle = cleanString(event.voiceStyle, '活泼姐姐')

  if (!name) return { success: false, message: '先告诉我孩子的名字吧' }
  if (!grade) return { success: false, message: '请选择年级' }

  const baseProfile = {
    openid,
    name,
    grade,
    city: cleanString(event.city, '深圳'),
    interests: Array.isArray(event.interests) ? event.interests : [],
    personality: cleanString(event.personality),
    interactionStyle,
    voiceStyle,
    updatedAt: now
  }

  const existed = await db.collection('users').where({ openid }).limit(1).get()

  if (existed.data.length) {
    const userId = existed.data[0]._id
    const parentCode = existed.data[0].parentCode || makeParentCode(userId)
    await db.collection('users').doc(userId).update({ data: { ...baseProfile, parentCode } })
    return { success: true, userId, parentCode }
  }

  const res = await db.collection('users').add({
    data: {
      ...baseProfile,
      createdAt: now
    }
  })
  const parentCode = makeParentCode(res._id)
  await db.collection('users').doc(res._id).update({ data: { parentCode } })

  return { success: true, userId: res._id, parentCode }
}
