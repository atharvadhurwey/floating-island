import * as THREE from "three"
import Experience from "../Experience.js"
import EventEmitter from "./EventEmitter.js"

export default class Sounds extends EventEmitter {
  constructor() {
    super()

    this.experience = new Experience()
    this.camera = this.experience.camera.instance

    this.listener = new THREE.AudioListener()
    this.camera.add(this.listener)
    this.audioLoader = new THREE.AudioLoader()

    this.sfxToggle = true // Sound effects toggle
    this.musicToggle = false // Music toggle

    const fxBtn = document.getElementById("fxToggle")
    fxBtn.textContent = this.sfxToggle ? "💫" : "❌"

    fxBtn.addEventListener("click", () => {
      this.sfxToggle = !this.sfxToggle
      fxBtn.textContent = this.sfxToggle ? "💫" : "❌"

      this.trigger("sfxToggle")
    })

    const musicBtn = document.getElementById("musicToggle")
    musicBtn.textContent = this.musicToggle ? "🎵" : "❌"

    musicBtn.addEventListener("click", () => {
      this.musicToggle = !this.musicToggle
      musicBtn.textContent = this.musicToggle ? "🎵" : "❌"

      this.trigger("musicToggle")
    })
  }

  createSound(path) {
    const sound = new THREE.Audio(this.listener)
    this.audioLoader.load(path, (buffer) => {
      sound.setBuffer(buffer)
      sound.setVolume(0.1)
    })
    return sound
  }

  fadeOutSound(sound, duration = 500) {
    if (!sound || !sound.isPlaying) return

    const initialVolume = sound.getVolume()
    const steps = 10
    const stepTime = duration / steps
    let currentStep = 0

    const fade = () => {
      currentStep++
      const newVolume = initialVolume * (1 - currentStep / steps)
      sound.setVolume(Math.max(0, newVolume))

      if (currentStep < steps) {
        setTimeout(fade, stepTime)
      } else {
        sound.pause()
        sound.setVolume(initialVolume) // Reset for next use
      }
    }

    fade()
  }
}
