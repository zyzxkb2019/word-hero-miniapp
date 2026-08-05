const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const WORD_LIST_LIMIT = 70
const WORD_LIMIT_PER_LIST = 50


const MINI_PHONETICS = {
  apple: '/ˈæpəl/', banana: '/bəˈnɑːnə/', orange: '/ˈɒrɪndʒ/', parrot: '/ˈpærət/',
  confident: '/ˈkɒnfɪdənt/', adventure: '/ədˈventʃə(r)/', challenge: '/ˈtʃælɪndʒ/',
  mirror: '/ˈmɪrə(r)/', appearance: '/əˈpɪərəns/', fashion: '/ˈfæʃən/',
  cover: '/ˈkʌvə(r)/', huge: '/hjuːdʒ/', wall: '/wɔːl/', life: '/laɪf/', save: '/seɪv/',
  'thanks to': '/θæŋks tuː/', 'come from': '/kʌm frɒm/', 'a lot of': '/ə lɒt əv/',
  'look after': '/lʊk ˈɑːftə(r)/', 'look for': '/lʊk fɔː(r)/', 'because of': '/bɪˈkɒz əv/'
}

function getPhonetic(word) {
  return MINI_PHONETICS[String(word || '').trim().toLowerCase()] || ''
}

function normalizeWord(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeMeanings(item = {}) {
  const values = []
  if (Array.isArray(item.meanings)) values.push(...item.meanings)
  values.push(item.meaning, item.cn, item.definition)

  const parts = values
    .join('；')
    .split(/[;；、，,\/|\n\r]+/)
    .map((part) => String(part || '').trim())
    .filter(Boolean)

  const seen = {}
  return parts.filter((part) => {
    if (seen[part]) return false
    seen[part] = true
    return true
  }).slice(0, 3)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()
  const uploadAt = new Date()

  if (!event.userId) return { success: false, message: '请先创建学生资料' }
  if (!Array.isArray(event.words) || !event.words.length) return { success: false, message: '词表数据不完整' }

  if (event.words.length > WORD_LIMIT_PER_LIST) {
    return { success: false, message: `一次最多保存 ${WORD_LIMIT_PER_LIST} 个单词或短语` }
  }

  const userRes = await db.collection('users').doc(event.userId).get().catch(() => ({ data: null }))
  if (!userRes.data || userRes.data.openid !== openid) {
    return { success: false, message: '无权保存该词表' }
  }

  const countRes = await db.collection('wordLists').where({ openid, userId: event.userId }).count()
  if (countRes.total >= WORD_LIST_LIMIT) {
    return { success: false, message: `每个学生最多 ${WORD_LIST_LIMIT} 个专属词库，请先复用旧词库或删除无用词库` }
  }

  const seen = {}
  const words = []

  event.words.forEach((item) => {
    const word = normalizeWord(item.word)
    if (!word || seen[word]) return
    seen[word] = true
    const meanings = normalizeMeanings(item)
    const fullMeaning = String(item.meaningText || '').trim() || (meanings.length ? meanings.join('；') : String(item.meaning || '').trim())

    words.push({
      word,
      meaning: fullMeaning,
      meaningText: fullMeaning,
      meanings,
      example: String(item.example || '').trim(),
      clozeExample: String(item.clozeExample || '').trim(),
      matchedForm: String(item.matchedForm || '').trim(),
      examplePage: item.examplePage || item.sourcePage || '',
      sourceText: String(item.sourceText || item.source || '').trim(),
      phonetic: String(item.phonetic || getPhonetic(word)).trim(),
      masteryScore: Number(item.masteryScore || 0),
      rightCount: Number(item.rightCount || 0),
      wrongCount: Number(item.wrongCount || 0),
      reviewedCount: Number(item.reviewedCount || 0),
      recognitionDates: Array.isArray(item.recognitionDates) ? item.recognitionDates : [],
      consecutiveRecognizedDays: Number(item.consecutiveRecognizedDays || 0),
      recognitionPassed: !!item.recognitionPassed,
      spellingRightCount: Number(item.spellingRightCount || 0),
      spellingWrongCount: Number(item.spellingWrongCount || 0),
      spellingPassed: !!item.spellingPassed,
      lastReviewedAt: item.lastReviewedAt || null,
      lastSpelledAt: item.lastSpelledAt || null,
      memoryStatus: item.memoryStatus || 'new',
      reviewStage: Number(item.reviewStage || 0),
      nextReviewAt: item.nextReviewAt || uploadAt,
      needsReview: true,
      uploadAt: item.uploadAt || item.createdAt || uploadAt,
      createdAt: item.createdAt || uploadAt
    })
  })

  if (words.length < 2) return { success: false, message: '至少导入 2 个单词或短语，才能开始练习' }

  const res = await db.collection('wordLists').add({
    data: {
      userId: event.userId,
      openid,
      title: String(event.title || '我的专属词表').trim(),
      words,
      createdAt: now,
      updatedAt: now
    }
  })

  await db.collection('users').doc(event.userId).update({
    data: {
      lastWordListId: res._id,
      lastStudyProgress: {
        wordListId: res._id,
        currentIndex: 0,
        mode: 'listening',
        updatedAt: Date.now()
      },
      lastStudiedAt: now
    }
  }).catch(() => {})

  return { success: true, wordListId: res._id }
}

