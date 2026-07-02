const grades = require('../../constants/grades')
const interests = require('../../constants/interests')
const interactionStyles = require('../../constants/interactionStyles')
const voiceStyles = require('../../constants/voiceStyles')
const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')
const { validateProfile } = require('../../utils/validators')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    grades,
    interests,
    interactionStyles,
    voiceStyles,
    form: {
      name: '',
      grade: '',
      city: '深圳',
      interests: [],
      personality: '',
      interactionStyle: '游戏闯关型',
      voiceStyle: '活泼姐姐'
    }
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad() {
    const userId = storage.getCurrentUserId()
    callFunction('getUserProfile', userId ? { userId } : {}, { showLoading: false, showError: false })
      .then((res) => {
        if (res.user) {
          storage.setCurrentUserId(res.user._id)
          storage.setCurrentUserName(res.user.name || '')
          if (res.user.lastStudyProgress) {
            storage.setLastStudyProgress(res.user.lastStudyProgress)
            if (res.user.lastStudyProgress.wordListId) storage.setCurrentWordListId(res.user.lastStudyProgress.wordListId)
          } else if (res.user.lastWordListId) {
            storage.setCurrentWordListId(res.user.lastWordListId)
          }
          wx.redirectTo({ url: '/pages/home/index' })
        }
      })
      .catch(() => {
        if (userId) storage.clearUser()
      })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onGradeChange(e) {
    this.setData({ 'form.grade': this.data.grades[e.detail.value] })
  },

  toggleInterest(e) {
    const value = e.currentTarget.dataset.value
    const current = [...this.data.form.interests]
    const index = current.indexOf(value)
    if (index > -1) current.splice(index, 1)
    else current.push(value)
    this.setData({ 'form.interests': current })
  },

  chooseStyle(e) {
    this.setData({ 'form.interactionStyle': e.currentTarget.dataset.value })
  },

  chooseVoiceStyle(e) {
    this.setData({ 'form.voiceStyle': e.currentTarget.dataset.value })
  },

  saveProfile() {
    const result = validateProfile(this.data.form)
    if (!result.valid) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }

    callFunction('saveUserProfile', this.data.form, { loadingTitle: '保存资料...' })
      .then((res) => {
        storage.setCurrentUserId(res.userId)
        storage.setCurrentUserName(this.data.form.name)
        wx.showToast({ title: '资料已保存', icon: 'success' })
        setTimeout(() => wx.redirectTo({ url: '/pages/home/index' }), 500)
      })
      .catch(() => {})
  },

  resetLocal() {
    storage.clearUser()
    wx.showToast({ title: '本地缓存已清空', icon: 'success' })
  }
})
