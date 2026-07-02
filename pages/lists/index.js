const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    lists: [],
    currentWordListId: ''
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadLists()
  },

  loadLists() {
    const userId = storage.getCurrentUserId()
    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    callFunction('listWordLists', { userId }, { showLoading: false })
      .then((res) => {
        this.setData({
          lists: res.lists || [],
          currentWordListId: storage.getCurrentWordListId()
        })
      })
      .catch(() => {})
  },

  deleteList(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || '这个词库'
    wx.showModal({
      title: '确认删除词库',
      content: `删除「${title}」后不可恢复，但不会删除学生资料。确定删除吗？`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        callFunction('deleteWordList', { wordListId: id }, { loadingTitle: '删除中...' })
          .then(() => {
            if (storage.getCurrentWordListId() === id) storage.setCurrentWordListId('')
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadLists()
          })
      }
    })
  },

  switchList(e) {
    const id = e.currentTarget.dataset.id
    storage.setCurrentWordListId(id)
    wx.showToast({ title: '已切换词库', icon: 'success' })
    setTimeout(() => wx.redirectTo({ url: '/pages/home/index' }), 500)
  },

  createList() {
    wx.navigateTo({ url: '/pages/import/index' })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})
