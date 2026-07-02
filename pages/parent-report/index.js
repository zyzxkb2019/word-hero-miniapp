const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

function emptyData() {
  return {
    child: {},
    overall: {},
    latestList: null,
    lists: [],
    curvePoints: [],
    curveSummary: {},
    weakWords: [],
    dueReviewWords: [],
    parentMessage: ''
  }
}

Page({
  data: emptyData(),

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadParentReport()
  },

  loadParentReport() {
    const childCode = storage.getParentChildCode()
    const childName = storage.getParentChildName()
    if (!childCode && !childName) {
      wx.redirectTo({ url: '/pages/parent-login/index' })
      return
    }
    callFunction('getParentReport', { childCode, childName }, { showLoading: false })
      .then((res) => {
        this.setData({
          child: res.child || {},
          overall: res.overall || {},
          latestList: res.latestList || null,
          lists: res.lists || [],
          curvePoints: res.curvePoints || [],
          curveSummary: res.curveSummary || {},
          weakWords: res.weakWords || [],
          parentMessage: res.parentMessage || ''
        })
        setTimeout(() => this.drawCurve(), 120)
      })
      .catch(() => wx.redirectTo({ url: '/pages/parent-login/index' }))
  },

  drawCurve() {
    const points = this.data.curvePoints || []
    const ctx = wx.createCanvasContext('parentCurveCanvas', this)
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
      ctx.fillText('完成一轮练习后生成学习曲线', 55, 80)
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

  switchChild() {
    wx.redirectTo({ url: '/pages/parent-login/index' })
  }
})
