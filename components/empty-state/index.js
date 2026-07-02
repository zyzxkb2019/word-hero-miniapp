Component({
  properties: {
    title: String,
    description: String,
    buttonText: String
  },
  methods: {
    onTap() {
      this.triggerEvent('action')
    }
  }
})
