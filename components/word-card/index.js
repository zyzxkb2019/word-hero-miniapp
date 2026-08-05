Component({
  properties: {
    word: String,
    meaning: String,
    phonetic: String,
    showMeaning: Boolean,
    playable: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTapSpeak() {
      this.triggerEvent('speak', { word: this.data.word })
    }
  }
})
