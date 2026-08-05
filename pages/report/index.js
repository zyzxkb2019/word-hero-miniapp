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
    curveRanges: [],
    curveActiveRange: '7d',
    curveSeries: {},
    message: '',
    dueReviewWords: [],
    dueReviewCount: 0
  }
}

function normalizeReport(report = {}) {
  const next = { ...emptyReport(), ...report }
  next.curveActiveRange = next.curveActiveRange || '7d'
  const active = next.curveSeries && next.curveSeries[next.curveActiveRange]
  if (active) {
    next.curvePoints = active.points || []
    next.curveSummary = active.summary || {}
  }
  return next
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
        this.setData({ user: userRes.user, report: normalizeReport(reportRes.report) })
        setTimeout(() => this.drawCurve(), 120)
      })
      .catch(() => {})
  },

  switchCurveRange(e) {
    const range = e.currentTarget.dataset.range
    const report = { ...this.data.report }
    const active = report.curveSeries && report.curveSeries[range]
    if (!active) return
    report.curveActiveRange = range
    report.curvePoints = active.points || []
    report.curveSummary = active.summary || {}
    this.setData({ report })
    setTimeout(() => this.drawCurve(), 30)
  },

  drawCurve() {
    const points = this.data.report.curvePoints || []
    const ctx = wx.createCanvasContext('learningCurveCanvas', this)
    const width = 315
    const height = 150
    const paddingLeft = 24
    const paddingRight = 10
    const paddingTop = 18
    const paddingBottom = 24
    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    ctx.clearRect(0, 0, width, height)
    ctx.setFillStyle('#f8fafc')
    ctx.fillRect(0, 0, width, height)
    ctx.setStrokeStyle('#e2e8f0')
    ctx.setLineWidth(1)
    for (let i = 1; i <= 3; i += 1) {
      const y = paddingTop + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(width - paddingRight, y)
      ctx.stroke()
    }

    if (!points.length) {
      ctx.setFillStyle('#94a3b8')
      ctx.setFontSize(13)
      ctx.fillText('完成练习后自动生成学习曲线', 56, 80)
      ctx.draw()
      return
    }

    const maxValue = Math.max(1, ...points.map((p) => Math.max(Number(p.practicedCount || 0), Number(p.wrongCount || 0))))
    const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth
    const getX = (index) => paddingLeft + index * step
    const getY = (value) => paddingTop + chartHeight - (Number(value || 0) / maxValue) * chartHeight

    const drawLine = (field, color) => {
      ctx.beginPath()
      points.forEach((p, index) => {
        const x = getX(index)
        const y = getY(p[field])
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(3)
      ctx.stroke()
      points.forEach((p, index) => {
        const x = getX(index)
        const y = getY(p[field])
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.setFillStyle(color)
        ctx.fill()
      })
    }

    drawLine('practicedCount', '#2563eb')
    drawLine('wrongCount', '#f97316')

    ctx.setFillStyle('#64748b')
    ctx.setFontSize(10)
    if (points[0]) ctx.fillText(points[0].label || '', paddingLeft, height - 6)
    if (points.length > 1) ctx.fillText(points[points.length - 1].label || '', width - 45, height - 6)
    ctx.setFillStyle('#2563eb')
    ctx.fillText('背词', paddingLeft, 12)
    ctx.setFillStyle('#f97316')
    ctx.fillText('错词', paddingLeft + 42, 12)
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
