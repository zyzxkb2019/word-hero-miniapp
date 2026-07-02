const REVIEW_DAYS = [1, 2, 4, 7, 15]

function toTime(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function addDays(date, days) {
  const base = date instanceof Date ? date : new Date(date || Date.now())
  return new Date(base.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000)
}

function getReviewStage(word) {
  return Number(word && word.reviewStage ? word.reviewStage : 0)
}

function isDue(word, now = Date.now()) {
  if (!word) return false
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  const nextTime = toTime(word.nextReviewAt)
  if (!nextTime) return true
  return nextTime <= (now instanceof Date ? now.getTime() : Number(now))
}

function getNextInterval(stage) {
  const safe = Math.max(0, Math.min(REVIEW_DAYS.length - 1, Number(stage || 0)))
  return REVIEW_DAYS[safe]
}

function getNextReviewHint(word) {
  if (!word) return ''
  if (word.recognitionPassed || word.memoryStatus === 'green') return '已进绿格，后面只做轻量巩固'
  const count = Number(word.reviewedCount || 0)
  const nextTime = toTime(word.nextReviewAt)
  if (!count) return '新词：今天先见第一面'
  if (!nextTime) return '下一次复习：待安排'
  const days = Math.ceil((nextTime - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return '今天到期：请复习'
  return `${days} 天后复习`
}

module.exports = {
  REVIEW_DAYS,
  addDays,
  isDue,
  getReviewStage,
  getNextInterval,
  getNextReviewHint
}
