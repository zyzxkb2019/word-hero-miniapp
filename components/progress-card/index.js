Component({
  properties: {
    totalWords: { type: Number, value: 0 },
    masteredCount: { type: Number, value: 0 },
    learningCount: { type: Number, value: 0 },
    unmasteredCount: { type: Number, value: 0 }
  },
  methods: {
    tapLearning() {
      if (this.data.learningCount > 0) this.triggerEvent('learning')
    },
    tapUnmastered() {
      if (this.data.unmasteredCount > 0) this.triggerEvent('unmastered')
    }
  }
})
