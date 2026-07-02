const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalizeWord(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeExample(item = {}) {
  return {
    word: normalizeWord(item.word),
    example: String(item.example || '').trim().slice(0, 500),
    sourceText: String(item.sourceText || '').trim().slice(0, 120),
    sourceType: String(item.sourceType || 'textbook').trim().slice(0, 40)
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!event.wordListId) return { success: false, message: '请先选择词库' }
  if (!Array.isArray(event.examples) || !event.examples.length) return { success: false, message: '没有可保存的课文原句' }

  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const wordList = listRes.data
  if (!wordList || wordList.openid !== openid) return { success: false, message: '无权修改该词库' }

  const exampleMap = {}
  event.examples.map(normalizeExample).forEach((item) => {
    if (item.word && item.example) exampleMap[item.word] = item
  })

  let updatedCount = 0
  const words = (wordList.words || []).map((item) => {
    const key = normalizeWord(item.word)
    const patch = exampleMap[key]
    if (!patch) return item
    updatedCount += 1
    return {
      ...item,
      example: patch.example,
      sourceText: patch.sourceText,
      sourceType: patch.sourceType,
      exampleUpdatedAt: new Date()
    }
  })

  if (!updatedCount) return { success: false, message: '没有匹配到词库里的单词' }

  await db.collection('wordLists').doc(event.wordListId).update({
    data: {
      words,
      updatedAt: db.serverDate()
    }
  })

  return { success: true, updatedCount }
}
