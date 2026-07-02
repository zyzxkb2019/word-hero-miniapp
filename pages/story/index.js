const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    user: {},
    wordList: null,
    story: null,
    scope: 'reviewed'
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad() {
    this.loadStoryData()
  },

  loadStoryData() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()

    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    Promise.all([
      callFunction('getUserProfile', { userId }, { showLoading: false }),
      callFunction('getCurrentWordList', { userId, wordListId }, { showLoading: false })
    ])
      .then(([userRes, listRes]) => {
        const wordList = listRes.wordList
        if (!wordList) {
          wx.showToast({ title: '请先导入词表', icon: 'none' })
          wx.redirectTo({ url: '/pages/import/index' })
          return
        }
        storage.setCurrentWordListId(wordList._id)
        this.setData({ user: userRes.user, wordList })
      })
      .catch(() => wx.redirectTo({ url: '/pages/home/index' }))
  },

  chooseScope(e) {
    this.setData({ scope: e.currentTarget.dataset.scope })
  },

  generateStory() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()
    callFunction('generateStory', { userId, wordListId, scope: this.data.scope }, { loadingTitle: '中英小故事生成中...' })
      .then((res) => {
        this.setData({ story: res.story })
        wx.showToast({ title: '小故事已生成', icon: 'success' })
      })
      .catch(() => {})
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})
