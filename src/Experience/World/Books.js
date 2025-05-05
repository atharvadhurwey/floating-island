import * as THREE from "three"
import Experience from "../Experience"

export default class Books {
  constructor() {
    this.experience = new Experience()
    this.resources = this.experience.resources
    this.scene = this.experience.scene
    this.camera = this.experience.camera.instance
    this.debug = this.experience.debug

    this.books = [] // Array to hold all book sprites
  }

  createBook(title, position, text) {
    const bookTexture = this.resources.items["book"]
    bookTexture.flipY = true // Fixes texture flipping issue
    bookTexture.needsUpdate = true
    const spriteMaterial = new THREE.SpriteMaterial({
      map: bookTexture,
      alphaTest: 0.5,
      transparent: true,
    })

    const book = new THREE.Sprite(spriteMaterial)
    book.isCollected = false // Initialize the book as not collected

    book.position.copy(position) // Set the position of the book
    book.baseY = book.position.y
    book.title = title // Store the title in the book object
    book.text = text // Store the text in the book object

    this.scene.add(book)

    this.books.push(book) // Add the book to the array

    return book
  }

  // Utility to wrap multiline text
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // Split the text into sentences by period (.)
    const sentences = text.split(".").map((sentence) => sentence.trim())
    let lines = []
    let currentLine = ""

    sentences.forEach((sentence) => {
      const words = sentence.split(" ")
      words.forEach((word) => {
        const testLine = currentLine + word + " "
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine) // Push the current line to lines array
          currentLine = word + " " // Start a new line with the current word
        } else {
          currentLine = testLine // Add the word to the current line
        }
      })
      // After each sentence, force a line break (and a one-line gap)
      lines.push(currentLine)
      lines.push("") // Add an empty string to create a one-line gap after the sentence
      currentLine = "" // Clear current line for next sentence
    })

    // Draw the lines with the one-line gap after each sentence
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight) // Draw each line
    })
  }

  createLoreTexture(text, options = {}, callback, backgroundUrl = "./images/bookPage.webp") {
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext("2d")

    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "black"
      ctx.font = `${options.fontSize}px "${options.font || "sans-serif"}"`
      ctx.textAlign = "left"
      ctx.textBaseline = "top"

      this.wrapText(ctx, text, 30, 50, 200, 25)

      const texture = new THREE.CanvasTexture(canvas)
      callback(texture) // Call the callback after drawing
    }
    image.src = backgroundUrl
  }

  fadeSprite(sprite, show = true, steps = 5, duration = 1000) {
    const interval = duration / steps
    let currentStep = 0

    const fade = setInterval(() => {
      currentStep++
      let progress = currentStep / steps

      // Stepped opacity for blocky effect
      sprite.material.opacity = show ? progress : 1 - progress

      if (currentStep >= steps) {
        clearInterval(fade)
        if (!show) {
          sprite.visible = false // Hide after fade-out
          this.scene.remove(sprite)
        }
      }
    }, interval)

    if (show) sprite.visible = true
  }

  createLoreSprite(text, playerBodyPosition) {
    this.createLoreTexture(text, { fontSize: 28, font: "Pixelify Sans" }, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true // Ensure the texture is updated
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 })
      const loreSprite = new THREE.Sprite(material)
      loreSprite.scale.set(3, 3, 1) // Scale the sprite to make it larger

      const direction = new THREE.Vector3()
      this.camera.getWorldDirection(direction) // Get the camera's world direction
      direction.normalize().multiplyScalar(4) // Set the distance from the camera (adjust the 5 to your preference)
      const position = new THREE.Vector3().copy(playerBodyPosition).add(direction).add(new THREE.Vector3(0, 2.5, 0)) // Slight vertical offset

      // for an easteregg lore
      if (playerBodyPosition.y < -200) {
        position.set(
          -30.0, // Adjusted x position
          17.0, // Adjusted y position
          -22.0 // Adjusted z position
        )
      }
      loreSprite.position.copy(position) // Set the position of the sprite

      loreSprite.material.opacity = 0 // Start fully transparent
      this.scene.add(loreSprite)

      this.fadeSprite(loreSprite, true)

      setTimeout(() => {
        this.fadeSprite(loreSprite, false)
      }, 15000)
    })
  }

  onBookCollected(book, playerBodyPosition) {
    book.isCollected = true // Mark the book as collected

    if (this.debug.active) {
      console.log("collected")
      console.log(book.title)
      console.log(book.text)
    }

    this.createLoreSprite(book.text, playerBodyPosition)
  }

  update(playerBodyPosition) {
    const time = Date.now() * 0.002

    this.books.forEach((book) => {
      if (!book.isCollected) {
        // Animate vertically around baseY
        book.position.y = book.baseY + Math.sin(time) * 0.5

        // Check if player is close enough
        if (book.position.distanceTo(playerBodyPosition) < 1.5) {
          book.isCollected = true
          this.onBookCollected(book, playerBodyPosition)
          this.scene.remove(book)
        }
      }
    })
  }
}
