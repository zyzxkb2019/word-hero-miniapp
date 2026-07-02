function callFunction(name, data = {}, options = {}) {
  const showLoading = options.showLoading !== false
  const loadingTitle = options.loadingTitle || '处理中...'

  if (showLoading) wx.showLoading({ title: loadingTitle })

  return wx.cloud.callFunction({ name, data })
    .then((res) => {
      if (showLoading) wx.hideLoading()
      const result = res.result || {}

      if (result.success === false) {
        const message = result.message || '服务走神了，请再试一次'
        if (options.showError !== false) {
          wx.showToast({ title: message, icon: 'none' })
        }
        throw new Error(message)
      }

      return result
    })
    .catch((err) => {
      if (showLoading) wx.hideLoading()
      console.error(`[cloud function error] ${name}`, err)
      if (options.showError !== false) {
        wx.showToast({ title: err.message || '服务走神了，请再试一次', icon: 'none' })
      }
      throw err
    })
}

module.exports = {
  callFunction
}
