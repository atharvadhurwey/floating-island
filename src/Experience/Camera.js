import * as THREE from "three"
import Experience from "./Experience.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"

export default class Camera {
  constructor() {
    this.experience = new Experience()
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.canvas = this.experience.canvas

    this.setInstance()
    this.setControls()
  }

  setInstance() {
    this.instance = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)
    // this.instance.position.set(-30, 20, -21)
    this.scene.add(this.instance)
  }

  setControls() {
    // this.controls = new OrbitControls(this.instance, this.canvas)
    // this.controls.enableDamping = true
    // this.controls = new PointerLockControls(this.instance, this.canvas)
    // document.addEventListener("click", () => this.controls.lock())
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
  }

  update() {
    // this.controls.update()
  }
}
