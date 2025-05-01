import Experience from "../Experience.js"
import Player from "./Player.js"

export default class World {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources

    // Wait for resources
    this.resources.on("ready", () => {
      // Setup
      this.player = new Player()
    })
  }

  update() {
    if (this.player) this.player.update()
  }
}
