const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    childCode: '',
    childName: ''
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onCodeInput(e) {
    this.setData({ childCode: e.detail.value })
  },

  onNameInput(e) {
    this.setData({ childName: e.detail.value })
  },

  loginParent() {
    const childCode = this.data.childCode.trim()
    const childName = this.data.childName.trim()
    if (!childCode && !childName) {
      wx.showToast({ title: '请输入孩子绑定码或姓名', icon: 'none' })
      return
    }
    callFunction('getParentReport', { childCode, childName }, { loadingTitle: '读取报告...' })
      .then((res) => {
        storage.setParentChildCode(res.child.parentCode || childCode)
        storage.setParentChildName(res.child.name || childName)
        wx.navigateTo({ url: '/pages/parent-report/index' })
      })
      .catch(() => {})
  },

  goStudent() {
    wx.redirectTo({ url: '/pages/profile/index' })
  }
})
