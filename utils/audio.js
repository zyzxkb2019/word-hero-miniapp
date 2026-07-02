let correctAudio = null
let praiseAudio = null
let wordAudio = null
let wechatSIPlugin = null
let pluginChecked = false
let lastPlayAt = 0

const CORRECT_SOUND_SRC = '/assets/audio/correct.mp3'
const DICTIONARY_AUDIO_BASE = 'https://dict.youdao.com/dictvoice'

const PRAISE_PHRASES = {
  '活泼姐姐': [
    '哇，{name}答对啦！',
    '{name}太棒了！',
    '漂亮，{name}又升级了！',
    '{name}这一击很准！',
    '开心！{name}又拿下一题！'
  ],
  '稳重男教练': [
    '正确，{name}继续保持。',
    '{name}这一题很稳。',
    '很好，{name}掌握度提升。',
    '{name}，节奏不错，继续推进。',
    '这题拿下，{name}继续下一关。'
  ],
  '温柔妈妈': [
    '对啦，{name}真不错。',
    '{name}太棒了，慢慢来就会越来越熟。',
    '很好，{name}真的记住它了。',
    '{name}今天很认真，继续加油。',
    '答对啦，{name}可以小小骄傲一下。'
  ],
  '游戏NPC': [
    '命中！{name}收服了这个单词怪！',
    '{name}经验值加十！',
    '恭喜{name}解锁新能量！',
    '漂亮，{name}完成一次精准攻击！',
    '{name}通关进度上升！'
  ],
  default: [
    '对了！',
    '你真厉害！',
    '{name}太棒了！',
    '漂亮，{name}答对了！',
    '很好，{name}又拿下一题！'
  ]
}

function configureAudio() {
  if (typeof wx === 'undefined' || !wx.setInnerAudioOption) return
  try {
    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: true,
      speakerOn: true
    })
  } catch (err) {}
}

function safeVibrate() {
  if (typeof wx === 'undefined' || !wx.vibrateShort) return
  try {
    wx.vibrateShort({ type: 'light' })
  } catch (err) {
    try { wx.vibrateShort() } catch (innerErr) {}
  }
}

function sanitizeName(name) {
  const value = String(name || '你').trim()
  return value ? value.slice(0, 8) : '你'
}

function getRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function buildCorrectPraise(name, interactionStyle, voiceStyle) {
  const safeName = sanitizeName(name)
  const style = voiceStyle || interactionStyle || 'default'
  const list = PRAISE_PHRASES[style] || PRAISE_PHRASES[interactionStyle] || PRAISE_PHRASES.default
  return getRandomItem(list).replace(/\{name\}/g, safeName)
}

function getWechatSIPlugin() {
  if (pluginChecked) return wechatSIPlugin
  pluginChecked = true
  try { wechatSIPlugin = requirePlugin('WechatSI') } catch (err) { wechatSIPlugin = null }
  return wechatSIPlugin
}

function createAudioContext(onErrorText) {
  configureAudio()
  if (typeof wx === 'undefined' || !wx.createInnerAudioContext) return null
  const audio = wx.createInnerAudioContext()
  audio.autoplay = false
  try { audio.obeyMuteSwitch = false } catch (err) {}
  audio.onError((err) => console.warn(onErrorText, err))
  audio.onCanplay(() => {
    try { audio.play() } catch (err) { console.warn(onErrorText, err) }
  })
  return audio
}

function initCorrectSound() {
  configureAudio()
  if (correctAudio || typeof wx === 'undefined' || !wx.createInnerAudioContext) return
  correctAudio = wx.createInnerAudioContext()
  correctAudio.src = CORRECT_SOUND_SRC
  correctAudio.autoplay = false
  try { correctAudio.obeyMuteSwitch = false } catch (err) {}
  correctAudio.onError((err) => console.warn('正确音效播放失败：', err))
}

function playCorrectSound() {
  configureAudio()
  initCorrectSound()
  if (!correctAudio) return
  try {
    correctAudio.stop()
    correctAudio.seek(0)
    correctAudio.play()
  } catch (err) {
    console.warn('正确音效触发失败：', err)
  }
}

function playTTS(content, lang, target) {
  const text = String(content || '').trim()
  const plugin = getWechatSIPlugin()
  if (!text || !plugin || !plugin.textToSpeech) return

  try {
    plugin.textToSpeech({
      lang,
      tts: true,
      content: text,
      success(res) {
        const audioSrc = res && (res.filename || res.tempFilePath)
        if (!audioSrc) return
        if (target === 'word' && wordAudio) {
          try { wordAudio.stop() } catch (err) {}
          try { wordAudio.destroy() } catch (err) {}
          wordAudio = null
        }
        const audio = target === 'word'
          ? (wordAudio = createAudioContext('单词发音播放失败：'))
          : (praiseAudio || (praiseAudio = createAudioContext('鼓励语音播放失败：')))
        if (!audio) return
        try {
          audio.stop()
          audio.src = audioSrc
          setTimeout(() => {
            try { audio.play() } catch (err) { console.warn('TTS 触发失败：', err) }
          }, 120)
        } catch (err) {
          console.warn('TTS 触发失败：', err)
        }
      },
      fail(err) {
        console.warn('TTS 生成失败：', err)
      }
    })
  } catch (err) {
    console.warn('TTS 调用失败：', err)
  }
}

function playDictionaryWordAudio(content, options = {}) {
  const text = String(content || '').trim()
  if (!text || typeof wx === 'undefined' || !wx.createInnerAudioContext) return false

  const accent = options.accent === 'uk' ? '1' : '2'
  if (wordAudio) {
    try { wordAudio.stop() } catch (err) {}
    try { wordAudio.destroy() } catch (err) {}
    wordAudio = null
  }

  const audio = wordAudio = createAudioContext('English word audio failed:')
  if (!audio) return false

  try {
    audio.src = `${DICTIONARY_AUDIO_BASE}?audio=${encodeURIComponent(text)}&type=${accent}&_=${Date.now()}`
    setTimeout(() => {
      try { audio.play() } catch (err) { console.warn('Dictionary audio play failed:', err) }
    }, 160)
    return true
  } catch (err) {
    console.warn('Dictionary audio failed:', err)
    return false
  }
}

function playCorrectVoice(text, options = {}) {
  safeVibrate()
  const now = Date.now()
  const shouldPlayHitSound = !options.skipHitSound && now - lastPlayAt > 300
  if (shouldPlayHitSound) {
    lastPlayAt = now
    playCorrectSound()
  }
  playTTS(text, 'zh_CN', 'praise')
}

function speakEnglishWord(word, options = {}) {
  const text = String(word || '').trim()
  if (!text) return
  const delay = Number(options.delay || 0)
  setTimeout(() => {
    const played = playDictionaryWordAudio(text, options)
    if (!played) playTTS(text, 'en_US', 'word')
  }, delay)
}

function destroyCorrectSound() {
  ;[correctAudio, praiseAudio, wordAudio].forEach((audio) => {
    if (audio) {
      try { audio.destroy() } catch (err) {}
    }
  })
  correctAudio = null
  praiseAudio = null
  wordAudio = null
}

module.exports = {
  initCorrectSound,
  playCorrectSound,
  playCorrectVoice,
  speakEnglishWord,
  buildCorrectPraise,
  destroyCorrectSound
}
