const COMMON_TERMS = [
  'apple','banana','orange','pear','cat','dog','bird','parrot','rabbit','book','pencil','teacher','student','school','classroom','family','friend','morning','afternoon','evening','today','tomorrow','red','blue','green','yellow','black','white','big','small','long','short','happy','sad','tired','excited','confident','brave','run','walk','jump','swim','read','write','listen','speak','watch','play','learn','study','think','remember','practice','choose','answer','city','park','home','room','garden','street','shop','library','museum','adventure','challenge','game','level','hero','monster','magic','secret','treasure','map','story','dream','mirror','appearance','fashion','clothes','style','easy','difficult','important','interesting','special','different','same','right','wrong','fast','slow','weather','sunny','rainy','cloudy','windy','warm','cold','hot','cool','music','movie','art','sport','computer','phone','robot','cover','come','from','huge','wall','life','thank','thanks','knowledge','save',
  'thanks to','thank you','come from','a lot of','lots of','look after','look for','look at','listen to','talk about','be good at','be interested in','because of','in front of','next to','go to school','get up','put on','take off','turn on','turn off','by the way','of course','all over'
]

function distance(a, b) {
  const s = String(a || '').toLowerCase()
  const t = String(b || '').toLowerCase()
  const dp = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0))
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[s.length][t.length]
}

function getSuggestion(word) {
  const value = String(word || '').trim().toLowerCase()
  if (!value || value.length < 3) return null
  if (COMMON_TERMS.includes(value)) return null
  const hasOnlyLetters = /^[a-z][a-z\-' ]{2,79}$/.test(value)
  if (!hasOnlyLetters) return { level: 'error', message: '包含非英文字符，请检查' }

  const candidates = COMMON_TERMS
    .map((term) => ({ term, d: distance(value, term) }))
    .filter((item) => item.d > 0 && item.d <= (value.length <= 5 ? 1 : 2))
    .sort((a, b) => a.d - b.d || a.term.length - b.term.length)

  if (candidates.length) {
    return {
      level: 'warn',
      suggestion: candidates[0].term,
      message: `可能想输入 ${candidates[0].term}`
    }
  }

  if (/([a-z])\1\1/.test(value)) return { level: 'warn', message: '有连续重复字母，请确认是否多写' }
  return null
}

function annotateWords(words) {
  return (words || []).map((item) => ({ ...item, check: getSuggestion(item.word) }))
}

module.exports = { getSuggestion, annotateWords }
