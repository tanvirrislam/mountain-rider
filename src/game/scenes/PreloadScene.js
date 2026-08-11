import Phaser from 'phaser'

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  preload() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    const bg = this.add.graphics()
    bg.fillStyle(0x1a1a2e, 1)
    bg.fillRect(0, 0, w, h)

    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x333333, 0.8)
    progressBox.fillRoundedRect(w / 2 - 160, h / 2 - 12, 320, 24, 12)


    const loadingText = this.make.text({
      x: w / 2,
      y: h / 2 - 40,
      text: 'Loading...',
      style: {
        font: '18px Outfit, sans-serif',
        fill: '#ffffff',
        fontWeight: '600'
      }
    })
    loadingText.setOrigin(0.5, 0.5)

    const progressBar = this.add.graphics()
    this.load.on('progress', (value) => {
      progressBar.clear()
      progressBar.fillStyle(0xff5252, 1)
      progressBar.fillRoundedRect(w / 2 - 156, h / 2 - 8, 312 * value, 16, 8)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
      bg.destroy()
    })

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    this.textures.addCanvas('placeholder', canvas)
  }

  create() {
    this.scene.start('MenuScene')
  }
}
