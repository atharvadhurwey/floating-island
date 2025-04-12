import Experience from "../Experience.js"
import Environment from "./Environment.js"
import Floor from "./Floor.js"
import Fox from "./Fox.js"
import Player from "./Player.js"

export default class World {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources

    // Wait for resources
    this.resources.on("ready", () => {
      // Setup
      // this.floor = new Floor()
      this.player = new Player()
      //   this.environment = new Environment()
    })
  }

  update() {
    if (this.floor) this.floor.updatePhysics()
    if (this.player) this.player.update()
  }
}
