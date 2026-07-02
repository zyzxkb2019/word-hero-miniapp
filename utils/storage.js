const CURRENT_USER_ID = 'currentUserId'
const CURRENT_USER_NAME = 'currentUserName'
const CURRENT_WORD_LIST_ID = 'currentWordListId'
const PARENT_CHILD_CODE = 'parentChildCode'
const PARENT_CHILD_NAME = 'parentChildName'
const LAST_STUDY_PROGRESS = 'wordHero.lastStudyProgress'
const STUDY_FOCUS_WORD = 'wordHero.studyFocusWord'
const STUDY_SCOPE = 'wordHero.studyScope'

function getCurrentUserId() {
  return wx.getStorageSync(CURRENT_USER_ID)
}

function setCurrentUserId(userId) {
  wx.setStorageSync(CURRENT_USER_ID, userId)
}

function getCurrentUserName() {
  return wx.getStorageSync(CURRENT_USER_NAME) || ''
}

function setCurrentUserName(name) {
  wx.setStorageSync(CURRENT_USER_NAME, name)
}

function getCurrentWordListId() {
  return wx.getStorageSync(CURRENT_WORD_LIST_ID)
}

function setCurrentWordListId(wordListId) {
  wx.setStorageSync(CURRENT_WORD_LIST_ID, wordListId)
}

function setParentChildCode(code) {
  wx.setStorageSync(PARENT_CHILD_CODE, code)
}

function getParentChildCode() {
  return wx.getStorageSync(PARENT_CHILD_CODE) || ''
}

function setParentChildName(name) {
  wx.setStorageSync(PARENT_CHILD_NAME, name)
}

function getParentChildName() {
  return wx.getStorageSync(PARENT_CHILD_NAME) || ''
}

function setLastStudyProgress(progress) {
  wx.setStorageSync(LAST_STUDY_PROGRESS, progress || {})
}

function getLastStudyProgress() {
  return wx.getStorageSync(LAST_STUDY_PROGRESS) || {}
}

function clearLastStudyProgress() {
  wx.removeStorageSync(LAST_STUDY_PROGRESS)
}

function setStudyFocusWord(word) {
  wx.setStorageSync(STUDY_FOCUS_WORD, String(word || ''))
}

function consumeStudyFocusWord() {
  const word = wx.getStorageSync(STUDY_FOCUS_WORD) || ''
  if (word) wx.removeStorageSync(STUDY_FOCUS_WORD)
  return word
}

function setStudyScope(scope) {
  wx.setStorageSync(STUDY_SCOPE, String(scope || ''))
}

function consumeStudyScope() {
  const scope = wx.getStorageSync(STUDY_SCOPE) || ''
  if (scope) wx.removeStorageSync(STUDY_SCOPE)
  return scope
}

function clearUser() {
  wx.removeStorageSync(CURRENT_USER_ID)
  wx.removeStorageSync(CURRENT_USER_NAME)
  wx.removeStorageSync(CURRENT_WORD_LIST_ID)
  wx.removeStorageSync(LAST_STUDY_PROGRESS)
}

module.exports = {
  getCurrentUserId,
  setCurrentUserId,
  getCurrentUserName,
  setCurrentUserName,
  getCurrentWordListId,
  setCurrentWordListId,
  setParentChildCode,
  getParentChildCode,
  setParentChildName,
  getParentChildName,
  setLastStudyProgress,
  getLastStudyProgress,
  clearLastStudyProgress,
  setStudyFocusWord,
  consumeStudyFocusWord,
  setStudyScope,
  consumeStudyScope,
  clearUser
}
