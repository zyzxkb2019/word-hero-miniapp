const IRREGULAR_VERBS = {
  be: { forms: ['am / is / are', 'was / were', 'been'], rule: "be 动词最爱变身，先认出它还是 be。" },
  go: { forms: ['goes', 'went', 'gone', 'going'], rule: "go 的过去式不是 goed，而是 went。" },
  do: { forms: ['does', 'did', 'done', 'doing'], rule: "do 三单变 does，过去式变 did。" },
  have: { forms: ['has', 'had', 'having'], rule: "have 三单是 has，过去式是 had。" },
  make: { forms: ['makes', 'made', 'making'], rule: "make 去 e 加 ing，过去式 made。" },
  take: { forms: ['takes', 'took', 'taken', 'taking'], rule: "take 去 e 加 ing，过去式 took。" },
  write: { forms: ['writes', 'wrote', 'written', 'writing'], rule: "write 去 e 加 ing，过去式 wrote。" },
  come: { forms: ['comes', 'came', 'coming'], rule: "come 去 e 加 ing，过去式 came。" },
  get: { forms: ['gets', 'got', 'getting'], rule: "get 加 ing 要双写 t。" },
  run: { forms: ['runs', 'ran', 'running'], rule: "run 加 ing 要双写 n。" },
  swim: { forms: ['swims', 'swam', 'swimming'], rule: "swim 加 ing 要双写 m。" },
  sit: { forms: ['sits', 'sat', 'sitting'], rule: "sit 加 ing 要双写 t。" },
  put: { forms: ['puts', 'put', 'putting'], rule: "put 过去式不变，加 ing 双写 t。" },
  cut: { forms: ['cuts', 'cut', 'cutting'], rule: "cut 过去式不变，加 ing 双写 t。" },
  let: { forms: ['lets', 'let', 'letting'], rule: "let 过去式不变，加 ing 双写 t。" },
  hit: { forms: ['hits', 'hit', 'hitting'], rule: "hit 过去式不变，加 ing 双写 t。" },
  hear: { forms: ['hears', 'heard', 'hearing'], rule: "hear 是听见结果，listen 是认真听动作。" }
}

const PHRASE_HINTS = {
  can: { label: "短语辨析", title: 'can / be able to', forms: ['can', 'be able to', 'will be able to'], rule: "can 只常用现在和过去；其他时态常用 be able to。" },
  borrow: { label: "短语辨析", title: 'borrow / lend / keep', forms: ['borrow', 'lend', 'keep'], rule: "borrow 借入，lend 借出，keep 借多久。" },
  lend: { label: "短语辨析", title: 'borrow / lend / keep', forms: ['borrow', 'lend', 'keep'], rule: "borrow 借入，lend 借出，keep 借多久。" },
  keep: { label: "短语辨析", title: 'borrow / lend / keep', forms: ['borrow', 'lend', 'keep'], rule: "borrow 借入，lend 借出，keep 借多久。" },
  listen: { label: "短语辨析", title: 'hear / listen', forms: ['hear', 'listen to'], rule: "hear 强调听见结果；listen to 强调听的动作。" }
}

const TO_DO_VERBS = ['decide', 'hope', 'plan', 'want', 'refuse', 'need', 'agree', 'learn', 'try', 'promise']
const DOING_VERBS = ['enjoy', 'practice', 'finish', 'mind', 'avoid', 'keep', 'consider']
const COMMON_VERBS = ['study', 'carry', 'try', 'fly', 'worry', 'guess', 'miss', 'press', 'cross', 'dress', 'stop', 'plan', 'drop', 'shop', 'write', 'make', 'take', 'dance', 'die', 'lie', 'tie', 'review', 'organize', 'record', 'encourage', 'succeed', 'refuse', 'include', 'upload', 'draw', 'invent', 'produce', 'create', 'collect', 'complete', 'answer', 'choose', 'remember', 'forget', 'begin', 'travel', 'prefer']
const COMMON_ADJECTIVES = ['easy', 'happy', 'busy', 'heavy', 'healthy', 'early', 'big', 'hot', 'thin', 'fat', 'sad', 'beautiful', 'careful', 'important', 'difficult', 'interesting', 'hard', 'large', 'nice', 'fine', 'late', 'simple', 'clever', 'quiet', 'strong', 'weak', 'young', 'old', 'new', 'short', 'long', 'small', 'great']

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function hasVerbMeaning(text) {
  return /(^|[;,.\s])(v|verb)\.?($|[;,.\s])/i.test(text)
}

function hasAdjMeaning(text) {
  return /(^|[;,.\s])(adj|adjective)\.?($|[;,.\s])/i.test(text)
}

function isConsonantY(word) {
  return /[^aeiou]y$/i.test(word)
}

function isSilentE(word) {
  return /e$/i.test(word) && !/(ee|ye|oe)$/i.test(word)
}

function isCvc(word) {
  return /^[a-z]*[^aeiou][aeiou][^aeiouwxy]$/i.test(word) && word.length <= 5
}

function thirdPerson(word) {
  if (isConsonantY(word)) return word.slice(0, -1) + 'ies'
  if (/(s|x|z|ch|sh|o)$/i.test(word)) return word + 'es'
  return word + 's'
}

function pastTense(word) {
  if (isConsonantY(word)) return word.slice(0, -1) + 'ied'
  if (/e$/i.test(word)) return word + 'd'
  if (isCvc(word)) return word + word.slice(-1) + 'ed'
  return word + 'ed'
}

function ingForm(word) {
  if (/ie$/i.test(word)) return word.slice(0, -2) + 'ying'
  if (isSilentE(word)) return word.slice(0, -1) + 'ing'
  if (isCvc(word)) return word + word.slice(-1) + 'ing'
  return word + 'ing'
}

function comparativeForms(word) {
  if (isConsonantY(word)) return [word.slice(0, -1) + 'ier', word.slice(0, -1) + 'iest']
  if (isCvc(word)) return [word + word.slice(-1) + 'er', word + word.slice(-1) + 'est']
  if (word.length >= 8 || /ful$|ous$|ing$|ed$|ant$|ent$|ive$/i.test(word)) return ['more ' + word, 'most ' + word]
  if (/e$/i.test(word)) return [word + 'r', word + 'st']
  return [word + 'er', word + 'est']
}

function buildVerbHint(term) {
  const irregular = IRREGULAR_VERBS[term]
  if (irregular) {
    return {
      label: "考试变身",
      title: term + " 会这样变",
      forms: irregular.forms.slice(0, 4),
      rule: irregular.rule
    }
  }

  let rule = "三单加 s，过去式加 ed，正在做加 ing。"
  if (isConsonantY(term)) rule = "辅音字母 + y：变 y 为 i，再加 es / ed。"
  else if (/(s|x|z|ch|sh|o)$/i.test(term)) rule = "结尾像 s / sh / ch / o：三单常加 es。"
  else if (isSilentE(term)) rule = "不发音 e 结尾：加 ing 时先去 e。"
  else if (isCvc(term)) rule = "重读闭音节：常双写尾字母再加 ed / ing。"

  return {
    label: "考试变身",
    title: term + " 会这样变",
    forms: [thirdPerson(term), pastTense(term), ingForm(term)],
    rule
  }
}

function buildAdjectiveHint(term) {
  const forms = comparativeForms(term)
  let rule = "形容词常考比较级 / 最高级。"
  if (isConsonantY(term)) rule = "辅音字母 + y：变 y 为 i，再加 er / est。"
  else if (isCvc(term)) rule = "重读闭音节：常双写尾字母再加 ed / ing。"
  else if (/ful$|ous$|ing$|ed$|ant$|ent$|ive$/i.test(term) || term.length >= 8) rule = "较长的形容词，常用 more / most。"
  else if (/e$/i.test(term)) rule = "e 结尾：直接加 r / st。"

  return {
    label: "考试变身",
    title: term + " 比较级",
    forms,
    rule
  }
}

function getWordFormHint(word = {}) {
  const term = normalize(word.word)
  if (!term || !/^[a-z]+(\s+[a-z]+)*$/.test(term)) return null

  if (PHRASE_HINTS[term]) return PHRASE_HINTS[term]
  if (/^be\s+able\s+to$/.test(term)) return PHRASE_HINTS.can
  if (/^be\s+similar\s+to$/.test(term)) {
    return { label: "句型提醒", title: 'be similar to', forms: ['is similar to', 'was similar to', 'are similar to'], rule: "be 会随主语和时态变，similar to 不变。" }
  }

  const text = normalize([word.meaningText, word.meaning, word.primaryMeaning].filter(Boolean).join(';'))
  if (TO_DO_VERBS.includes(term)) {
    const hint = buildVerbHint(term)
    hint.forms = hint.forms.concat([term + ' to do']).slice(0, 4)
    hint.rule = term + " 后面常接 to do，选择题很爱考。"
    return hint
  }
  if (DOING_VERBS.includes(term)) {
    const hint = buildVerbHint(term)
    hint.forms = hint.forms.concat([term + ' doing']).slice(0, 4)
    hint.rule = term + " 后面常接 doing，选择题很爱考。"
    return hint
  }

  if (!term.includes(' ') && (IRREGULAR_VERBS[term] || COMMON_VERBS.includes(term) || hasVerbMeaning(text))) return buildVerbHint(term)
  if (!term.includes(' ') && (COMMON_ADJECTIVES.includes(term) || hasAdjMeaning(text))) return buildAdjectiveHint(term)

  return null
}

module.exports = {
  getWordFormHint
}
