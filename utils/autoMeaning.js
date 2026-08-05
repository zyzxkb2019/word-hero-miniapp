const MINI_DICTIONARY = {
  apple: '苹果', banana: '香蕉', orange: '橙子', pear: '梨', grape: '葡萄', peach: '桃子', lemon: '柠檬', mango: '芒果',
  cat: '猫', dog: '狗', bird: '鸟', parrot: '鹦鹉', fish: '鱼', rabbit: '兔子', horse: '马', tiger: '老虎', lion: '狮子', elephant: '大象', panda: '熊猫', monkey: '猴子',
  book: '书', pen: '钢笔', pencil: '铅笔', ruler: '尺子', bag: '包', desk: '书桌', chair: '椅子', classroom: '教室', school: '学校', teacher: '老师', student: '学生',
  father: '爸爸', mother: '妈妈', brother: '哥哥/弟弟', sister: '姐姐/妹妹', family: '家庭', friend: '朋友', people: '人们', child: '孩子', children: '孩子们',
  morning: '早晨', afternoon: '下午', evening: '晚上', night: '夜晚', today: '今天', tomorrow: '明天', yesterday: '昨天', week: '星期/周', month: '月份', year: '年',
  red: '红色的', blue: '蓝色的', green: '绿色的', yellow: '黄色的', black: '黑色的', white: '白色的', purple: '紫色的', pink: '粉色的',
  big: '大的', small: '小的', long: '长的', short: '短的', tall: '高的', old: '旧的/老的', young: '年轻的', new: '新的', good: '好的', bad: '坏的', beautiful: '美丽的', handsome: '帅气的',
  happy: '开心的', sad: '难过的', angry: '生气的', tired: '疲惫的', excited: '兴奋的', nervous: '紧张的', confident: '自信的', brave: '勇敢的', careful: '仔细的',
  run: '跑', walk: '走', jump: '跳', swim: '游泳', sing: '唱歌', dance: '跳舞', read: '阅读', write: '写', listen: '听', speak: '说', watch: '观看', play: '玩', learn: '学习', explore: '探索',
  eat: '吃', drink: '喝', sleep: '睡觉', study: '学习', think: '思考', know: '知道', remember: '记住', forget: '忘记', practice: '练习', choose: '选择', answer: '回答',
  city: '城市', park: '公园', home: '家', room: '房间', garden: '花园', street: '街道', shop: '商店', restaurant: '餐厅', hospital: '医院', library: '图书馆', museum: '博物馆',
  adventure: '冒险', challenge: '挑战', game: '游戏', level: '关卡/等级', hero: '英雄', monster: '怪物', magic: '魔法', secret: '秘密', treasure: '宝藏', map: '地图', story: '故事', dream: '梦想',
  mirror: '镜子', appearance: '外貌', fashion: '时尚', clothes: '衣服', dress: '连衣裙/穿衣', shoes: '鞋子', hair: '头发', style: '风格', color: '颜色',
  easy: '容易的', difficult: '困难的', important: '重要的', interesting: '有趣的', special: '特别的', different: '不同的', same: '相同的', right: '正确的/右边', wrong: '错误的', fast: '快的', slow: '慢的',
  weather: '天气', sunny: '晴朗的', rainy: '下雨的', cloudy: '多云的', windy: '有风的', warm: '温暖的', cold: '寒冷的', hot: '炎热的', cool: '凉爽的',
  music: '音乐', movie: '电影', art: '艺术', sport: '运动', basketball: '篮球', football: '足球', swimming: '游泳', computer: '电脑', phone: '手机', ai: '人工智能', robot: '机器人',
  'thanks to': '多亏；由于', 'thank you': '谢谢你', 'come from': '来自', 'a lot of': '许多', 'lots of': '许多', 'look after': '照顾', 'look for': '寻找', 'look at': '看', 'listen to': '听', 'talk about': '谈论', 'be good at': '擅长', 'be interested in': '对……感兴趣', 'because of': '因为', 'in front of': '在……前面', 'next to': '紧挨着', 'go to school': '去上学', 'get up': '起床', 'put on': '穿上', 'take off': '脱下', 'turn on': '打开', 'turn off': '关闭', 'by the way': '顺便说一下', 'of course': '当然', 'all over': '到处',
}


const MINI_PHONETICS = {
  apple: '/ˈæpəl/', banana: '/bəˈnɑːnə/', orange: '/ˈɒrɪndʒ/', parrot: '/ˈpærət/',
  confident: '/ˈkɒnfɪdənt/', adventure: '/ədˈventʃə(r)/', challenge: '/ˈtʃælɪndʒ/',
  mirror: '/ˈmɪrə(r)/', appearance: '/əˈpɪərəns/', fashion: '/ˈfæʃən/',
  cover: '/ˈkʌvə(r)/', huge: '/hjuːdʒ/', wall: '/wɔːl/', life: '/laɪf/', save: '/seɪv/',
  robot: '/ˈrəʊbɒt/', story: '/ˈstɔːri/', magic: '/ˈmædʒɪk/', secret: '/ˈsiːkrət/',
  'thanks to': '/θæŋks tuː/', 'come from': '/kʌm frɒm/', 'a lot of': '/ə lɒt əv/',
  'look after': '/lʊk ˈɑːftə(r)/', 'look for': '/lʊk fɔː(r)/', 'because of': '/bɪˈkɒz əv/',
  'in front of': '/ɪn frʌnt əv/'
}

function getLocalPhonetic(word) {
  return MINI_PHONETICS[String(word || '').trim().toLowerCase()] || ''
}

function getLocalMeaning(word) {
  return MINI_DICTIONARY[String(word || '').trim().toLowerCase()] || ''
}

const CORE_MEANINGS = {
  cover: ['覆盖', '封面', '遮盖'],
  save: ['拯救', '节省', '保存'],
  huge: ['巨大的', '大量的'],
  life: ['生活', '生命', '人生'],
  right: ['正确的', '右边', '权利'],
  left: ['左边', '剩下的', '离开'],
  light: ['光', '轻的', '浅色的'],
  kind: ['种类', '友善的'],
  watch: ['观看', '手表', '看守'],
  play: ['玩', '打球', '表演'],
  read: ['阅读', '朗读'],
  write: ['写', '书写'],
  look: ['看', '看起来'],
  like: ['喜欢', '像', '例如'],
  story: ['故事', '经历'],
  challenge: ['挑战', '难题'],
  adventure: ['冒险', '奇遇'],
  confident: ['自信的', '有把握的'],
  appearance: ['外貌', '出现'],
  fashion: ['时尚', '流行方式'],
  mirror: ['镜子', '反映'],
  wall: ['墙', '墙壁'],
  arm: ['手臂', '武器', '扶手'],
  back: ['背部', '后面', '回来'],
  bank: ['银行', '河岸'],
  bat: ['球棒', '蝙蝠'],
  bear: ['熊', '忍受', '承受'],
  bit: ['一点', '小块'],
  book: ['书', '预订'],
  break: ['打破', '休息', '违反'],
  change: ['改变', '零钱', '变化'],
  class: ['班级', '课', '等级'],
  close: ['关闭', '接近的', '亲密的'],
  cold: ['寒冷的', '感冒'],
  date: ['日期', '约会', '枣'],
  fair: ['公平的', '集市', '相当好的'],
  fan: ['风扇', '迷', '扇子'],
  fine: ['好的', '晴朗的', '罚款'],
  fire: ['火', '开火', '解雇'],
  fly: ['飞', '苍蝇'],
  foot: ['脚', '英尺'],
  free: ['免费的', '自由的', '空闲的'],
  hand: ['手', '递给', '帮助'],
  head: ['头', '负责人', '前往'],
  kind: ['种类', '友善的'],
  letter: ['字母', '信'],
  light: ['光', '轻的', '浅色的'],
  line: ['线', '排', '台词'],
  match: ['比赛', '火柴', '相配'],
  mind: ['头脑', '介意', '思维'],
  miss: ['想念', '错过', '小姐'],
  present: ['礼物', '现在', '出席的'],
  rest: ['休息', '其余部分'],
  rock: ['岩石', '摇滚乐'],
  room: ['房间', '空间'],
  ruler: ['尺子', '统治者'],
  second: ['第二', '秒'],
  sentence: ['句子', '判决'],
  spring: ['春天', '泉水', '弹簧'],
  square: ['广场', '正方形', '平方'],
  still: ['仍然', '静止的'],
  train: ['火车', '训练'],
  trip: ['旅行', '绊倒'],
  watch: ['观看', '手表', '看守'],
  well: ['好', '井', '健康的'],
  'thanks to': ['多亏', '由于'],
  'come from': ['来自', '源于'],
  'a lot of': ['许多', '大量'],
  'look after': ['照顾', '照看'],
  'look for': ['寻找'],
  'because of': ['因为', '由于']
}

function splitMeanings(value) {
  return String(value || '')
    .split(/[;；、，,\/|\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getCoreMeanings(word, fallback) {
  const key = String(word || '').trim().toLowerCase()
  const core = CORE_MEANINGS[key] || []
  const candidates = core.length ? core : splitMeanings(fallback)
  const seen = {}
  return candidates.filter((item) => {
    if (!item || seen[item]) return false
    seen[item] = true
    return true
  }).slice(0, 3)
}

function getWechatSIPlugin() {
  try {
    return requirePlugin('WechatSI')
  } catch (err) {
    return null
  }
}

function translateWithPlugin(word) {
  return new Promise((resolve) => {
    const plugin = getWechatSIPlugin()
    if (!plugin || !plugin.translate) {
      resolve('')
      return
    }

    try {
      plugin.translate({
        lfrom: 'en_US',
        lto: 'zh_CN',
        content: word,
        success(res) {
          resolve(String(res.result || '').trim())
        },
        fail() {
          resolve('')
        }
      })
    } catch (err) {
      resolve('')
    }
  })
}

async function enrichWordsWithMeaning(words, onProgress) {
  const list = Array.isArray(words) ? words : []
  const result = []

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i]
    const word = String(item.word || '').trim().toLowerCase()
    let meaning = String(item.meaning || '').trim() || getLocalMeaning(word)

    if (!meaning) {
      meaning = await translateWithPlugin(word)
    }

    if (!meaning) meaning = '待确认中文'
    const meanings = Array.isArray(item.meanings) && item.meanings.length
      ? getCoreMeanings(word, item.meanings.join('；'))
      : getCoreMeanings(word, meaning)
    const fullMeaning = String(item.meaningText || '').trim() || (meanings.length ? meanings.join('；') : String(item.meaning || '').trim()) || meaning

    result.push({ ...item, word, meaning: fullMeaning, meaningText: fullMeaning, meanings, phonetic: item.phonetic || getLocalPhonetic(word) })
    if (typeof onProgress === 'function') onProgress(i + 1, list.length)
  }

  return result
}

module.exports = {
  getLocalMeaning,
  getLocalPhonetic,
  enrichWordsWithMeaning
}

