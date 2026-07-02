const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function cleanWord(item) {
  return String(item && item.word ? item.word : '').trim().toLowerCase()
}
function cleanMeaning(item) {
  return String(item && item.meaning ? item.meaning : '目标词').trim()
}
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function isLetterOrNumber(ch) {
  return !!ch && /[A-Za-z0-9]/.test(ch)
}
function canMatchAt(text, lowerText, index, term) {
  if (!term || lowerText.slice(index, index + term.length) !== term) return false
  const before = text[index - 1]
  const after = text[index + term.length]
  const first = term[0]
  const last = term[term.length - 1]
  if (isLetterOrNumber(first) && isLetterOrNumber(before)) return false
  if (isLetterOrNumber(last) && isLetterOrNumber(after)) return false
  return true
}
function highlightVocabulary(text, words) {
  const terms = [...new Set((words || []).map((item) => cleanWord(item)).filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!terms.length) return escapeHtml(text)
  const lowerText = String(text || '').toLowerCase()
  let result = ''
  let i = 0
  while (i < text.length) {
    const matched = terms.find((term) => canMatchAt(text, lowerText, i, term))
    if (matched) {
      const original = text.slice(i, i + matched.length)
      result += `<b><i>${escapeHtml(original)}</i></b>`
      i += matched.length
    } else {
      result += escapeHtml(text[i])
      i += 1
    }
  }
  return result
}
function getBucket(word) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return 'green'
  if (word.spellingPassed || word.memoryStatus === 'spelling') return 'spelling'
  if (Number(word.reviewedCount || 0) > 0) return 'reviewed'
  return 'new'
}
function pickTargetWords(wordList, scope) {
  const words = wordList.words || []
  let target = words.filter((item) => Number(item.reviewedCount || 0) > 0)
  if (scope === 'all') target = words
  if (scope === 'mastered') {
    target = words.filter((item) => getBucket(item) === 'green')
    if (!target.length) target = words.filter((item) => Number(item.reviewedCount || 0) > 0)
  }
  if (!target.length) target = words
  return target
    .sort((a, b) => {
      const scoreDiff = Number(a.masteryScore || 0) - Number(b.masteryScore || 0)
      if (scoreDiff !== 0) return scoreDiff
      return Number(b.wrongCount || 0) - Number(a.wrongCount || 0)
    })
    .slice(0, 8)
}
function sentenceFor(item, index, name) {
  const word = cleanWord(item)
  const meaning = cleanMeaning(item)
  const phrase = word.includes(' ')
  const templates = [
    `At the city library, ${name} found a glowing card called ${word}.`,
    `The card opened a tiny door and showed ${name} a clue about ${meaning}.`,
    `${name} whispered ${word}, and the dark wall became bright.`,
    `A funny robot said, "Use ${word} before the next challenge!"`,
    `When ${name} remembered ${word}, a star jumped into the map.`,
    `The little monster smiled because ${word} was the right key.`,
    `${name} put ${word} into the story bag and kept walking.`,
    `At last, ${word} helped ${name} save the secret map.`
  ]
  if (phrase) return `${name} used the phrase ${word} like a magic password, and the bridge appeared.`
  return templates[index % templates.length]
}
function buildStoryHtml(storyText, words) {
  const paragraphs = String(storyText || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p style="margin:0 0 14px;line-height:1.9;">${highlightVocabulary(part, words)}</p>`)
    .join('')
  const vocabHtml = (words || [])
    .filter((item) => cleanWord(item))
    .map((item) => `<div style="margin:4px 0;color:#475569;">• <b><i>${escapeHtml(cleanWord(item))}</i></b> = ${escapeHtml(cleanMeaning(item))}</div>`)
    .join('')
  return `<div style="font-size:15px;color:#334155;line-height:1.9;">${paragraphs}<div style="margin:18px 0 8px;font-size:14px;font-weight:900;color:#4f46e5;">词汇小助手 Vocabulary Helper</div>${vocabHtml}</div>`
}
function makeBilingualStory(user, words, wordList) {
  const name = user.name || 'Word Hero'
  const city = user.city || 'the city'
  const interest = user.interests && user.interests.length ? user.interests[0] : 'games'
  const selected = words.filter((item) => cleanWord(item)).slice(0, 8)
  const title = `${name}的秘密单词地图 / ${name}'s Secret Word Map`
  const middle = selected.map((item, index) => sentenceFor(item, index, name)).join(' ')
  const storyText = [
    `One evening in ${city}, ${name} opened a notebook from the ${wordList.title || 'word bank'}. 这不是普通本子，而是一张会发光的单词地图。`,
    `Because ${name} liked ${interest}, the map turned into a small game world. 每走一步，都需要读懂一个新词。`,
    middle,
    `Finally, ${name} found a note: "Words are not only for tests. They can build worlds." ${name}笑了，因为今天的生词真的变成了一个小冒险。`
  ].join('\n\n')
  const content = storyText.length > 1200 ? storyText.slice(0, 1180) + '...' : storyText
  return { title, content, highlightHtml: buildStoryHtml(content, selected), words: selected }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()
  if (!event.userId || !event.wordListId) return { success: false, message: '故事生成数据不完整' }

  const userRes = await db.collection('users').doc(event.userId).get().catch(() => ({ data: null }))
  const listRes = await db.collection('wordLists').doc(event.wordListId).get().catch(() => ({ data: null }))
  const user = userRes.data
  const wordList = listRes.data
  if (!user || user.openid !== openid || !wordList || wordList.openid !== openid) return { success: false, message: '无权生成该故事' }

  const targetWords = pickTargetWords(wordList, event.scope || 'reviewed')
  if (!targetWords.length) return { success: false, message: '词表里还没有单词' }
  const story = makeBilingualStory(user, targetWords, wordList)

  const saveRes = await db.collection('stories').add({
    data: {
      userId: event.userId,
      openid,
      wordListId: event.wordListId,
      title: story.title,
      content: story.content,
      words: story.words,
      scope: event.scope || 'reviewed',
      language: 'bilingual_under_400_with_highlight',
      createdAt: now
    }
  })
  return { success: true, story: { ...story, _id: saveRes._id } }
}
