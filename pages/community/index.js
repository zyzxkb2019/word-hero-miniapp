const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    themeClass: theme.getThemeClass(),
    user: {},
    groupCode: '',
    group: null,
    leaderboard: [],
    sharedLists: [],
    inviteCode: '',
    pkLoading: false
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadCommunity()
  },

  loadCommunity() {
    const userId = storage.getCurrentUserId()
    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }
    callFunction('getUserProfile', { userId }, { showLoading: false })
      .then((res) => this.setData({ user: res.user || {} }))
      .catch(() => {})
  },

  onGroupCodeInput(e) {
    this.setData({ groupCode: e.detail.value })
  },

  createGroup() {
    const userId = storage.getCurrentUserId()
    callFunction('createStudyGroup', { userId }, { loadingTitle: '创建小队...' })
      .then((res) => {
        this.setData({ group: res.group, inviteCode: res.group.code, leaderboard: res.leaderboard || [], sharedLists: res.sharedLists || [] })
        wx.showToast({ title: '小队已创建', icon: 'success' })
      })
  },

  joinGroup() {
    const userId = storage.getCurrentUserId()
    const code = String(this.data.groupCode || '').trim().toUpperCase()
    if (!code) {
      wx.showToast({ title: '请输入小队码', icon: 'none' })
      return
    }
    callFunction('joinStudyGroup', { userId, code }, { loadingTitle: '加入小队...' })
      .then((res) => {
        this.setData({ group: res.group, inviteCode: res.group.code, leaderboard: res.leaderboard || [], sharedLists: res.sharedLists || [] })
        wx.showToast({ title: '加入成功', icon: 'success' })
      })
  },

  refreshGroup() {
    if (!this.data.group || !this.data.group.code) {
      wx.showToast({ title: '先创建或加入小队', icon: 'none' })
      return
    }
    callFunction('getStudyGroup', { code: this.data.group.code }, { loadingTitle: '刷新中...' })
      .then((res) => this.setData({ group: res.group, leaderboard: res.leaderboard || [], sharedLists: res.sharedLists || [] }))
  },

  startPK() {
    const userId = storage.getCurrentUserId()
    const wordListId = storage.getCurrentWordListId()
    if (!this.data.group || !this.data.group.code) {
      wx.showToast({ title: '先加入学习小队', icon: 'none' })
      return
    }
    if (!wordListId) {
      wx.showToast({ title: '先选择词库', icon: 'none' })
      return
    }
    this.setData({ pkLoading: true })
    callFunction('submitPKScore', { userId, wordListId, code: this.data.group.code }, { loadingTitle: '生成PK成绩...' })
      .then((res) => {
        this.setData({ pkLoading: false, leaderboard: res.leaderboard || [] })
        wx.showToast({ title: `本轮${res.score || 0}分`, icon: 'success' })
      })
      .catch(() => this.setData({ pkLoading: false }))
  },

  shareCurrentList() {
    const wordListId = storage.getCurrentWordListId()
    if (!this.data.group || !this.data.group.code) {
      wx.showToast({ title: '先加入学习小队', icon: 'none' })
      return
    }
    if (!wordListId) {
      wx.showToast({ title: '先选择词库', icon: 'none' })
      return
    }
    callFunction('shareWordListToGroup', { wordListId, code: this.data.group.code }, { loadingTitle: '共享词库...' })
      .then((res) => {
        this.setData({ sharedLists: res.sharedLists || [] })
        wx.showToast({ title: '已共享给小队', icon: 'success' })
      })
  },

  copyCode() {
    if (!this.data.inviteCode) return
    wx.setClipboardData({ data: this.data.inviteCode })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/home/index' })
  }
})
