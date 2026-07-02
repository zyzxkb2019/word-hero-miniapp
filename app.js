App({
  onLaunch() {
    if (!wx.cloud) {
      console.warn('当前基础库不支持云开发，请升级微信开发者工具或基础库。')
      return
    }

    try {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOther: true,
        speakerOn: true
      })
    } catch (err) {
      console.warn('音频全局配置失败：', err)
    }

    wx.cloud.init({
      env: 'cloudbase-d5gih40mh870f303b',
      traceUser: true
    })
  },

  globalData: {
    appName: '单词英雄',
    version: '0.1.17'
  }
})
