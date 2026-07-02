function validateProfile(profile) {
  if (!profile.name || !profile.name.trim()) {
    return { valid: false, message: '先告诉我你的名字吧。' }
  }

  if (!profile.grade) {
    return { valid: false, message: '请选择年级。' }
  }

  if (!profile.interactionStyle) {
    return { valid: false, message: '请选择一种互动风格。' }
  }

  return { valid: true, message: '' }
}

function validateWordList(title, words) {
  if (!title || !title.trim()) {
    return { valid: false, message: '请给这组词表起个名字。' }
  }

  if (!words || words.length === 0) {
    return { valid: false, message: '词表好像还没准备好，先导入几个单词或短语吧。' }
  }

  if (words.length < 2) {
    return { valid: false, message: '至少导入 2 个单词或短语，才能开始练习。' }
  }

  if (words.length > 50) {
    return { valid: false, message: '一次最多保存 50 个单词或短语。' }
  }

  return { valid: true, message: '' }
}

module.exports = {
  validateProfile,
  validateWordList
}
