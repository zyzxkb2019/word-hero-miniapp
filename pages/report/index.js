const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

function emptyReport() {
  return {
    totalWords: 0,
    masteredCount: 0,
    learningCount: 0,
    unmasteredCount: 0,
    todayPracticeCount: 0,
    correctCount: 0,
    wrongCount: 0,
    greenCount: 0,
    spellingPassedCount: 0,
    reviewedCount: 0,
    weakWords: [],
    masteredWords: [],
    spellingWords: [],
    reviewedWords: [],
    newWords: [],
    curvePoints: [],
    curveSummary: {},
    message: '',
    dueReviewWords: [],
    dueReviewCount: 0
  }
}

Page({
  data: {
    themeClass: theme.getThemeClass(),
    user: {},
    report: emptyReport()
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadReportData()
  },

  loadReportData() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()

    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    callFunction('getCurrentWordList', { userId, wordListId }, { showLoading: false })
      .then((listRes) => {
        const wordList = listRes.wordList
        if (!wordList) {
          wx.showToast({ title: '请先导入词表', icon: 'none' })
          wx.redirectTo({ url: '/pages/import/index' })
          return Promise.reject(new Error('no word list'))
        }
        storage.setCurrentWordListId(wordList._id)
        return Promise.all([
          callFunction('getUserProfile', { userId }, { showLoading: false }),
          callFunction('getStudyReport', { userId, wordListId: wordList._id }, { showLoading: false })
        ])
      })
      .then(([userRes, reportRes]) => {
        this.setData({ user: userRes.user, report: reportRes.report || emptyReport() })
        setTimeout(() => this.drawCurve(), 120)
      })
      .catch(() => {})
  },

  drawCurve() {
    const points = this.data.report.curvePoints || []
    const ctx = wx.createCanvasContext('learningCurveCanvas', this)
    const width = 315
    const height = 150
    ctx.clearRect(0, 0, width, height)
    ctx.setFillStyle('#f8fafc')
    ctx.fillRect(0, 0, width, height)
    ctx.setStrokeStyle('#e2e8f0')
    ctx.setLineWidth(1)
    for (let i = 1; i <= 3; i += 1) {
      const y = (height / 4) * i
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    if (!points.length) {
      ctx.setFillStyle('#94a3b8')
      ctx.setFontSize(13)
      ctx.fillText('完成练习后自动生成学习曲线', 56, 80)
      ctx.draw()
      return
    }
    const step = points.length > 1 ? width / (points.length - 1) : width
    ctx.beginPath()
    points.forEach((p, index) => {
      const x = index * step
      const y = height - (Number(p.value || 0) / 100) * (height - 24) - 12
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.setStrokeStyle('#ef4444')
    ctx.setLineWidth(3)
    ctx.stroke()
    points.forEach((p, index) => {
      const x = index * step
      const y = height - (Number(p.value || 0) / 100) * (height - 24) - 12
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.setFillStyle(p.result === 'wrong' || p.result === 'unknown' ? '#f97316' : '#22c55e'); ctx.fill()
    })
    ctx.draw()
  },

  goStudy() {
    storage.clearLastStudyProgress()
    storage.setStudyScope('all')
    wx.redirectTo({ url: '/pages/study/index' })
  },

  studyReviewedWords() {
    if (!this.data.report.reviewedCount) {
      wx.showToast({ title: '还没有已背过的词', icon: 'none' })
      return
    }
    storage.clearLastStudyProgress()
    storage.setStudyScope('reviewed')
    wx.redirectTo({ url: '/pages/study/index' })
  },

  studyReviewedWord(e) {
    const word = e.currentTarget.dataset.word
    if (word) storage.setStudyFocusWord(word)
    storage.setStudyScope('reviewed')
    wx.redirectTo({ url: '/pages/study/index' })
  },

  studyWeakWord(e) {
    const word = e.currentTarget.dataset.word
    if (word) storage.setStudyFocusWord(word)
    storage.clearLastStudyProgress()
    storage.setStudyScope('all')
    wx.redirectTo({ url: '/pages/study/index' })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})
