const storage = require('../../utils/storage')
const theme = require('../../utils/theme')
const { callFunction } = require('../../utils/cloud')
const { getMasteryStatus } = require('../../utils/mastery')

function isDueWord(word = {}) {
  if (word.recognitionPassed || word.memoryStatus === 'green') return false
  if (!word.nextReviewAt) return Number(word.reviewedCount || 0) > 0
  const t = new Date(word.nextReviewAt).getTime()
  return !Number.isNaN(t) && t <= Date.now()
}

function buildStats(wordList) {
  const words = wordList && wordList.words ? wordList.words : []
  const stats = {
    totalWords: words.length,
    masteredCount: 0,
    learningCount: 0,
    unmasteredCount: 0,
    dueReviewCount: 0
  }

  words.forEach((item) => {
    const status = getMasteryStatus(item)
    if (status === '已过关') stats.masteredCount += 1
    else if (status === '未掌握') stats.unmasteredCount += 1
    else stats.learningCount += 1
    if (isDueWord(item)) stats.dueReviewCount += 1
  })

  return stats
}

Page({
  data: {
    themeClass: theme.getThemeClass(),
    isDark: theme.getTheme() === 'dark',
    loading: true,
    user: {},
    wordList: null,
    stats: buildStats(null),
    lastProgress: {},
    hasResume: false,
    welcomeMessage: '今天也来拿下几个单词吧。'
  },

  onShow() {
    theme.applyTheme()
    this.setData({ themeClass: theme.getThemeClass(), isDark: theme.getTheme() === 'dark' })
    this.loadHomeData()
  },

  toggleTheme() {
    const next = theme.toggleTheme()
    this.setData({ themeClass: theme.getThemeClass(), isDark: next === 'dark' })
    wx.showToast({ title: next === 'dark' ? '已切换夜间模式' : '已切换日间模式', icon: 'none' })
  },

  loadHomeData() {
    const userId = storage.getCurrentUserId()
    if (!userId) {
      wx.redirectTo({ url: '/pages/profile/index' })
      return
    }

    const wordListId = storage.getCurrentWordListId()

    Promise.all([
      callFunction('getUserProfile', { userId }, { showLoading: false, showError: false }),
      callFunction('getCurrentWordList', { userId, wordListId }, { showLoading: false, showError: false })
    ])
      .then(([userRes, listRes]) => {
        const user = userRes.user
        if (user && user.name) storage.setCurrentUserName(user.name)
        const wordList = listRes.wordList || null
        if (wordList && wordList._id) storage.setCurrentWordListId(wordList._id)

        const stats = buildStats(wordList)
        const welcomeMessage = this.makeWelcomeMessage(user, stats)
        const lastProgress = storage.getLastStudyProgress()
        const resumeIndex = Number(lastProgress.currentIndex || 0)
        const hasResume = !!(lastProgress && wordList && lastProgress.wordListId === wordList._id && resumeIndex > 0 && resumeIndex < stats.totalWords)
        this.setData({ loading: false, user, wordList, stats, welcomeMessage, lastProgress, hasResume })
      })
      .catch(() => {
        storage.clearUser()
        wx.redirectTo({ url: '/pages/profile/index' })
      })
  },

  makeWelcomeMessage(user, stats) {
    const name = user.name || '同学'
    if (!stats.totalWords) return `${name}，先导入一组词表，我们就能开始你的专属单词冒险。`
    if (stats.dueReviewCount > 0) return `今天有 ${stats.dueReviewCount} 个到期复习词，先拿下不会的，少做无效重复。`
    const count = stats.unmasteredCount || 0
    if (user.interactionStyle === '游戏闯关型') return `今天还有 ${count} 个单词怪没有被你收服。`
    if (user.interactionStyle === '温柔鼓励型') return `今天我们慢慢拿下 ${count} 个还不熟的单词。`
    if (user.interactionStyle === '学霸教练型') return `今日重点任务：巩固 ${count} 个薄弱单词。`
    return `今天有 ${count} 个调皮单词等你去抓。`
  },

  goStudy() {
    if (!this.data.wordList) {
      wx.showToast({ title: '请先导入词表', icon: 'none' })
      return
    }
    storage.clearLastStudyProgress()
    storage.setStudyScope('all')
    wx.navigateTo({ url: '/pages/study/index' })
  },

  goDueReview() {
    if (!this.data.wordList) {
      wx.showToast({ title: '请先导入词表', icon: 'none' })
      return
    }
    storage.clearLastStudyProgress()
    storage.setStudyScope('due')
    wx.navigateTo({ url: '/pages/study/index' })
  },

  goLearningWords() {
    if (!this.data.wordList || !this.data.stats.learningCount) {
      wx.showToast({ title: '暂时没有半掌握单词', icon: 'none' })
      return
    }
    storage.clearLastStudyProgress()
    storage.setStudyScope('learning')
    wx.navigateTo({ url: '/pages/study/index' })
  },

  goUnmasteredWords() {
    if (!this.data.wordList || !this.data.stats.unmasteredCount) {
      wx.showToast({ title: '暂时没有未掌握单词', icon: 'none' })
      return
    }
    storage.clearLastStudyProgress()
    storage.setStudyScope('unmastered')
    wx.navigateTo({ url: '/pages/study/index' })
  },

  resumeStudy() {
    wx.navigateTo({ url: '/pages/study/index' })
  },

  goLists() {
    wx.navigateTo({ url: '/pages/lists/index' })
  },

  goImport() {
    wx.navigateTo({ url: '/pages/import/index' })
  },

  goContextImport() {
    if (!this.data.wordList) {
      wx.showToast({ title: '请先导入词表', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/context-import/index' })
  },

  goStory() {
    if (!this.data.wordList) {
      wx.showToast({ title: '先导入词表，再生成故事', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/story/index' })
  },

  goReport() {
    if (!this.data.wordList) {
      wx.showToast({ title: '先导入词表，再看报告', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/report/index' })
  },

  goCommunity() {
    wx.navigateTo({ url: '/pages/community/index' })
  }
})
