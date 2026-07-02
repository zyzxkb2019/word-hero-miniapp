const REVIEW_MILESTONES = [1, 2, 4, 7, 15, 21]

function getScoreChange(mode, result) {
  if (mode === 'flashcard') {
    if (result === 'known') return 1
    if (result === 'unclear') return 0
    if (result === 'unknown') return -1
  }

  if (mode === 'listening') {
    return result === 'correct' ? 1 : -1
  }

  if (mode === 'choice') {
    return result === 'correct' ? 1 : -1
  }

  if (mode === 'spelling') {
    return result === 'correct' ? 2 : -1
  }

  return 0
}

function isPositiveResult(mode, result) {
  if (mode === 'flashcard') return result === 'known'
  if (mode === 'listening') return result === 'correct'
  if (mode === 'choice') return result === 'correct'
  if (mode === 'spelling') return result === 'correct'
  return false
}

function getMasteryStatus(wordOrScore) {
  const item = typeof wordOrScore === 'object' ? wordOrScore : { masteryScore: wordOrScore }
  if (item.recognitionPassed || item.memoryStatus === 'green') return '已过关'
  const score = Number(item.masteryScore || 0)
  if (score <= 1) return '未掌握'
  if (score <= 4) return '半掌握'
  return '熟悉中'
}

function getMemoryBucket(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return 'green'
  if (word.spellingPassed || word.memoryStatus === 'spelling') return 'spelling'
  if (Number(word.reviewedCount || 0) > 0 || Number(word.rightCount || 0) > 0 || Number(word.wrongCount || 0) > 0) return 'reviewed'
  return 'new'
}

function getMemoryLabel(word = {}) {
  const bucket = getMemoryBucket(word)
  if (bucket === 'green') return '绿格过关'
  if (bucket === 'spelling') return '拼写过关'
  if (bucket === 'reviewed') return '抗遗忘中'
  return '新词'
}

function getNextReviewHint(word = {}) {
  const count = Number(word.reviewedCount || 0)
  const next = REVIEW_MILESTONES.find((item) => item > count)
  if (!count) return '刚上传，先见第一面'
  if (!next) return '已完成21天抗遗忘主线'
  return `已背${count}次，下个里程碑：第${next}次`
}

function clampScore(score) {
  if (score < -3) return -3
  if (score > 10) return 10
  return score
}

function sortWordsForStudy(words = []) {
  return [...words].sort((a, b) => {
    const bucketOrder = { new: 0, reviewed: 1, spelling: 2, green: 3 }
    const bucketDiff = (bucketOrder[getMemoryBucket(a)] || 0) - (bucketOrder[getMemoryBucket(b)] || 0)
    if (bucketDiff !== 0) return bucketDiff

    const scoreDiff = (a.masteryScore || 0) - (b.masteryScore || 0)
    if (scoreDiff !== 0) return scoreDiff

    const wrongDiff = (b.wrongCount || 0) - (a.wrongCount || 0)
    if (wrongDiff !== 0) return wrongDiff

    return (a.lastReviewedAt || 0) - (b.lastReviewedAt || 0)
  })
}

function updateWordByResult(wordItem, mode, result) {
  const scoreChange = getScoreChange(mode, result)
  const nextWord = {
    ...wordItem,
    reviewedCount: (wordItem.reviewedCount || 0) + 1,
    masteryScore: clampScore((wordItem.masteryScore || 0) + scoreChange),
    lastReviewedAt: Date.now()
  }

  if (result === 'correct' || result === 'known') {
    nextWord.rightCount = (nextWord.rightCount || 0) + 1
  }

  if (result === 'wrong' || result === 'unknown') {
    nextWord.wrongCount = (nextWord.wrongCount || 0) + 1
  }

  return {
    updatedWord: nextWord,
    scoreChange
  }
}

module.exports = {
  REVIEW_MILESTONES,
  getScoreChange,
  getMasteryStatus,
  getMemoryBucket,
  getMemoryLabel,
  getNextReviewHint,
  isPositiveResult,
  sortWordsForStudy,
  updateWordByResult
}
