const FAMILIES = [
  { key: 'igh', sound: '/a\u026a/', hint: '\u770b\u5230 igh\uff0c\u5e38\u8bfb long i /a\u026a/\u3002', examples: ['high', 'night', 'light', 'right', 'fight'], test: (w) => /igh/.test(w) },
  { key: 'tion', sound: '/\u0283\u0259n/', hint: 'tion \u5e38\u8bfb /\u0283\u0259n/\uff0c\u4f5c\u6587\u8bcd\u548c\u9605\u8bfb\u8bcd\u5f88\u5e38\u89c1\u3002', examples: ['station', 'attention', 'question', 'action', 'nation'], test: (w) => /tion$|tion/.test(w) },
  { key: 'a-e', sound: '/e\u026a/', hint: '\u4e2d\u95f4\u4e00\u4e2a a\uff0c\u540e\u9762\u54d1\u5df4 e\uff0ca \u5e38\u8bfb\u5b57\u6bcd\u97f3 /e\u026a/\u3002', examples: ['name', 'cake', 'make', 'late', 'take'], test: (w) => /^[a-z]*a[^aeiou]?e$/.test(w) || ['name', 'cake', 'make', 'late', 'take', 'same', 'game'].includes(w) },
  { key: 'i-e', sound: '/a\u026a/', hint: '\u4e2d\u95f4\u4e00\u4e2a i\uff0c\u540e\u9762\u54d1\u5df4 e\uff0ci \u5e38\u8bfb /a\u026a/\u3002', examples: ['bike', 'like', 'time', 'five', 'write'], test: (w) => /^[a-z]*i[^aeiou]?e$/.test(w) || ['bike', 'like', 'time', 'five', 'write'].includes(w) },
  { key: 'o-e', sound: '/\u0259\u028a/', hint: '\u4e2d\u95f4\u4e00\u4e2a o\uff0c\u540e\u9762\u54d1\u5df4 e\uff0co \u5e38\u8bfb /\u0259\u028a/\u3002', examples: ['home', 'nose', 'hope', 'note', 'those'], test: (w) => /^[a-z]*o[^aeiou]?e$/.test(w) || ['home', 'nose', 'hope', 'note', 'those'].includes(w) },
  { key: 'u-e', sound: '/ju\u02d0/', hint: 'u-e \u5e38\u8bfb /ju\u02d0/ \u6216 /u\u02d0/\uff0c\u5148\u8bb0\u4e00\u4e32\u3002', examples: ['use', 'cute', 'huge', 'June', 'rule'], test: (w) => /^[a-z]*u[^aeiou]?e$/.test(w) || ['use', 'cute', 'huge', 'june', 'rule'].includes(w) },
  { key: 'ee', sound: '/i\u02d0/', hint: 'ee \u5e38\u8bfb\u957f\u97f3 /i\u02d0/\uff0c\u50cf\u628a\u58f0\u97f3\u62c9\u957f\u3002', examples: ['see', 'tree', 'green', 'sheep', 'meet'], test: (w) => /ee/.test(w) },
  { key: 'ea', sound: '/i\u02d0/', hint: 'ea \u5f88\u591a\u65f6\u5019\u8bfb /i\u02d0/\uff0c\u5148\u8bb0\u9ad8\u9891\u8fd9\u4e00\u4e32\u3002', examples: ['teacher', 'read', 'clean', 'speak', 'team'], test: (w) => /ea/.test(w) && !['head', 'bread', 'ready', 'heavy'].includes(w) },
  { key: 'oo', sound: '/\u028a/', hint: 'oo \u5728\u8fd9\u4e9b\u8bcd\u91cc\u8bfb\u77ed\u97f3 /\u028a/\u3002', examples: ['book', 'look', 'good', 'foot', 'cook'], test: (w) => ['book', 'look', 'good', 'foot', 'cook', 'wood'].includes(w) },
  { key: 'oo', sound: '/u\u02d0/', hint: 'oo \u5728\u8fd9\u4e9b\u8bcd\u91cc\u8bfb\u957f\u97f3 /u\u02d0/\u3002', examples: ['food', 'school', 'room', 'moon', 'soon'], test: (w) => ['food', 'school', 'room', 'moon', 'soon', 'cool'].includes(w) },
  { key: 'ar', sound: '/\u0251\u02d0/', hint: '\u770b\u5230 ar\uff0c\u5e38\u50cf\u5f20\u5927\u5634\u8bf4\u201c\u554a\u201d\u3002', examples: ['hard', 'card', 'art', 'farm', 'star', 'park'], test: (w) => /ar(?!e|r|y)/.test(w) },
  { key: 'or', sound: '/\u0254\u02d0/', hint: 'or \u5e38\u8bfb /\u0254\u02d0/\uff0c\u5148\u8bb0\u8003\u8bd5\u5e38\u89c1\u8bcd\u3002', examples: ['short', 'sport', 'horse', 'fork', 'morning'], test: (w) => /or/.test(w) && !/wor/.test(w) },
  { key: 'er / ir / ur', sound: '/\u025c\u02d0/', hint: 'er / ir / ur \u5e38\u5377\u820c\u8bfb /\u025c\u02d0/\u3002', examples: ['her', 'bird', 'turn', 'nurse', 'first'], test: (w) => /er|ir|ur/.test(w) && !/(teacher|father|mother)$/.test(w) },
  { key: 'ow', sound: '/a\u028a/', hint: 'ow \u5728\u8fd9\u4e9b\u8bcd\u91cc\u8bfb /a\u028a/\uff0c\u50cf\u201c\u55f7\u201d\u3002', examples: ['cow', 'now', 'how', 'down', 'flower'], test: (w) => ['cow', 'now', 'how', 'down', 'flower', 'brown'].includes(w) },
  { key: 'ow', sound: '/\u0259\u028a/', hint: 'ow \u5728\u8fd9\u4e9b\u8bcd\u91cc\u8bfb /\u0259\u028a/\u3002', examples: ['snow', 'show', 'grow', 'slow', 'window'], test: (w) => ['snow', 'show', 'grow', 'slow', 'window'].includes(w) },
  { key: 'sh', sound: '/\u0283/', hint: 'sh \u5e38\u8bfb /\u0283/\uff0c\u50cf\u8f7b\u8f7b\u8bf4\u201c\u5618\u201d\u3002', examples: ['ship', 'shop', 'fish', 'wash', 'English'], test: (w) => /sh/.test(w) },
  { key: 'ch', sound: '/t\u0283/', hint: 'ch \u5e38\u8bfb /t\u0283/\uff0c\u50cf chair \u5f00\u5934\u7684\u58f0\u97f3\u3002', examples: ['chair', 'China', 'teacher', 'watch', 'much'], test: (w) => /ch/.test(w) },
  { key: 'th', sound: '/\u03b8/ /\u00f0/', hint: 'th \u8981\u54ac\u820c\uff0c\u5148\u8ba4\u51fa\u8fd9\u4e00\u7c7b\u3002', examples: ['think', 'three', 'thank', 'this', 'mother'], test: (w) => /th/.test(w) }
]

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '')
}

function getHighlightPattern(family) {
  if (!family) return ''
  if (family.highlight) return family.highlight
  if (family.key === 'er / ir / ur') return 'er|ir|ur'
  if (/^[a-z]+$/.test(family.key)) return family.key
  if (/^[a-z]-e$/.test(family.key)) return family.key.charAt(0)
  return ''
}

function buildExampleParts(word, family) {
  const text = String(word || '')
  const pattern = getHighlightPattern(family)
  if (!pattern) return { word: text, before: text, focus: '', after: '' }
  const match = text.match(new RegExp(pattern, 'i'))
  if (!match) return { word: text, before: text, focus: '', after: '' }
  const start = match.index || 0
  const focus = match[0]
  return {
    word: text,
    before: text.slice(0, start),
    focus,
    after: text.slice(start + focus.length)
  }
}

function getPhonicsHint(word = {}) {
  const rawWord = String(word.word || '').trim()
  if (/\s/.test(rawWord)) return null
  const term = normalize(rawWord)
  if (!term || term.length < 3) return null
  const family = FAMILIES.find((item) => item.test(term))
  if (!family) return null
  const examples = [term].concat(family.examples.filter((item) => item !== term).slice(0, 4)).map((item) => buildExampleParts(item, family))
  return {
    label: '\u4e00\u4e32\u4f1a\u8bfb',
    title: family.key + ' = ' + family.sound,
    hint: family.hint,
    examples
  }
}

module.exports = {
  getPhonicsHint
}
