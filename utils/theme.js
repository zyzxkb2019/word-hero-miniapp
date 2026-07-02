const THEME_KEY = 'wordHero.theme'

function getTheme() {
  return wx.getStorageSync(THEME_KEY) || 'light'
}

function getThemeClass() {
  return getTheme() === 'dark' ? 'theme-dark' : ''
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  wx.setStorageSync(THEME_KEY, next)
  applyTheme()
  return next
}

function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function applyTheme() {
  const dark = getTheme() === 'dark'
  try {
    wx.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? '#0f172a' : '#ffffff'
    })
  } catch (err) {}
}

module.exports = {
  getTheme,
  getThemeClass,
  setTheme,
  toggleTheme,
  applyTheme
}
