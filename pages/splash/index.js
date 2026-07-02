const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    name: '',
    hasProfile: false,
    checking: false
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    const userId = storage.getCurrentUserId()
    this.setData({
      hasProfile: !!userId,
      name: storage.getCurrentUserName ? (storage.getCurrentUserName() || '') : ''
    })
  },

  enterApp() {
    const userId = storage.getCurrentUserId()
    if (userId) {
      wx.redirectTo({ url: '/pages/home/index' })
      return
    }

    this.setData({ checking: true })
    callFunction('getUserProfile', {}, { loadingTitle: '自动登录中...', showError: false })
      .then((res) => {
        const user = res.user
        if (!user || !user._id) throw new Error('no profile')
        storage.setCurrentUserId(user._id)
        storage.setCurrentUserName(user.name || '')
        if (user.lastStudyProgress) {
          storage.setLastStudyProgress(user.lastStudyProgress)
          if (user.lastStudyProgress.wordListId) storage.setCurrentWordListId(user.lastStudyProgress.wordListId)
        } else if (user.lastWordListId) {
          storage.setCurrentWordListId(user.lastWordListId)
        }
        wx.redirectTo({ url: '/pages/home/index' })
      })
      .catch(() => {
        wx.redirectTo({ url: '/pages/profile/index' })
      })
      .then(() => this.setData({ checking: false }))
  }
})
