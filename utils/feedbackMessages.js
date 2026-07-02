const feedbackMessages = {
  游戏闯关型: {
    correct: [
      '命中！这个单词怪被你收服了。',
      '漂亮，这一击很准。',
      '经验值 +10，继续推进。'
    ],
    wrong: [
      '这个怪有点滑，换个角度再打一次。',
      '没关系，Boss 都要打好几轮。',
      '差一点，记住它，下次反杀。'
    ],
    complete: [
      '今日副本通关！你已经比昨天更强了。',
      '任务完成，明天继续升级。'
    ]
  },
  温柔鼓励型: {
    correct: [
      '很好，你真的记住它了。',
      '这个词已经慢慢变成你的了。',
      '稳稳拿下，继续来。'
    ],
    wrong: [
      '没关系，大脑正在建立连接。',
      '这个词还不熟，我们再见它几次。',
      '错一次不亏，说明它值得重点复习。'
    ],
    complete: [
      '今天完成得很好，慢慢来，记忆会长出来。',
      '你已经比刚开始更熟悉这些词了。'
    ]
  },
  学霸教练型: {
    correct: [
      '正确。这个词可以进入下一轮巩固。',
      '很好，继续保持准确率。',
      '掌握度提升，下一题。'
    ],
    wrong: [
      '这个词还不稳，建议重点复习。',
      '错误是信号，它告诉我们该练哪里。',
      '先记住词义，再做拼写挑战。'
    ],
    complete: [
      '本轮训练完成，建议明天复盘错词。',
      '今天的数据不错，继续提高稳定性。'
    ]
  },
  幽默陪伴型: {
    correct: [
      '可以啊，这个词被你拿捏了。',
      '哎哟，不错哦，单词都开始怕你了。',
      '这题答得很丝滑。'
    ],
    wrong: [
      '它刚才溜了一下，我们再抓它一次。',
      '别急，这词有点调皮。',
      '大脑说：收到，我正在加固线路。'
    ],
    complete: [
      '今天的单词小队集合完毕，收工！',
      '不错，今天的大脑运动量达标。'
    ]
  }
}

function pickRandom(items = []) {
  if (!items.length) return ''
  return items[Math.floor(Math.random() * items.length)]
}

function getFeedbackMessage(interactionStyle = '游戏闯关型', type = 'correct') {
  const styleMessages = feedbackMessages[interactionStyle] || feedbackMessages['游戏闯关型']
  return pickRandom(styleMessages[type] || [])
}

module.exports = {
  feedbackMessages,
  getFeedbackMessage
}
