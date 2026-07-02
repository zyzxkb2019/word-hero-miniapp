const { getFeedbackMessage } = require('../../utils/feedbackMessages')

Component({
  properties: {
    type: { type: String, value: 'correct' },
    interactionStyle: { type: String, value: '游戏闯关型' }
  },
  data: {
    message: ''
  },
  observers: {
    'type, interactionStyle': function () {
      this.refresh()
    }
  },
  lifetimes: {
    attached() {
      this.refresh()
    }
  },
  methods: {
    refresh() {
      this.setData({
        message: getFeedbackMessage(this.data.interactionStyle, this.data.type)
      })
    }
  }
})
