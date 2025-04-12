import * as THREE from "three"
import * as CANNON from "cannon-es"
import Experience from "../Experience.js"

export default class Floor {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.camera = this.experience.camera.instance
    this.physicsWorld = this.experience.physicsWorld

    this.setGround()
    this.setLights()
    this.setPlayer()
    this.setStairs()
    this.setBoxes()
    this.setContactMaterial()
    this.setMovements()

    // this.setGeometry()
    // this.setTextures()
    // this.setMaterial()
    // this.setMesh()
  }

  addBox(x, y, z, w, h, d, color) {
    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2))
    const body = new CANNON.Body({ mass: 0 })
    body.addShape(shape)
    body.position.set(x, y, z)
    this.physicsWorld.addBody(body)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }))
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
  }

  setGround() {
    this.groundMaterial = new CANNON.Material("groundMaterial")
    const groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial })
    groundBody.addShape(new CANNON.Plane())
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physicsWorld.addBody(groundBody)
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x555555 }))
    groundMesh.rotation.x = -Math.PI / 2
    this.scene.add(groundMesh)
  }

  setLights() {
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(5, 10, 5)
    this.scene.add(light)
  }

  setPlayer() {
    const playerShape = new CANNON.Sphere(0.5)
    this.playerBody = new CANNON.Body({ mass: 1, shape: playerShape })
    this.playerBody.position.set(0, 2, 0)

    this.playerMaterial = new CANNON.Material("playerMaterial")
    this.playerBody.material = this.playerMaterial

    this.playerBody.linearDamping = 0.5

    this.physicsWorld.addBody(this.playerBody)
  }

  setStairs() {
    for (let i = 0; i < 5; i++) {
      this.addBox(-2, i * 0.5, -3 - i * 1, 2, 0.5, 1, 0x888888)
    }
  }

  setBoxes() {
    this.addBox(2, 1, -2, 1, 1, 1, 0xff0000)
    this.addBox(-3, 1, 3, 2, 2, 2, 0x00ff00)
  }

  setContactMaterial() {
    // Contact Material
    const contactMaterial = new CANNON.ContactMaterial(this.playerMaterial, this.groundMaterial, {
      friction: 0.3, // Increase this for more grip
      restitution: 0.0, // No bouncing
    })
    // this.physicsWorld.addContactMaterial(contactMaterial)
  }

  setMovements() {
    // Movement Variables
    this.moveSpeed = 5
    this.jumpStrength = 5
    this.velocity = new CANNON.Vec3()
    this.canJump = false

    // Keyboard Input
    this.keys = {}
    document.addEventListener("keydown", (e) => (this.keys[e.code] = true))
    document.addEventListener("keyup", (e) => (this.keys[e.code] = false))
  }

  updatePhysics() {
    this.physicsWorld.step(1 / 60)

    // Apply movement
    if (this.keys["KeyW"]) this.velocity.z = -this.moveSpeed
    if (this.keys["KeyS"]) this.velocity.z = this.moveSpeed
    if (this.keys["KeyA"]) this.velocity.x = -this.moveSpeed
    if (this.keys["KeyD"]) this.velocity.x = this.moveSpeed
    if (this.keys["Space"] && this.canJump) {
      this.velocity.y = this.jumpStrength
      this.canJump = false
    }

    this.playerBody.velocity.x = this.velocity.x
    this.playerBody.velocity.z = this.velocity.z

    // Check if on ground
    if (this.playerBody.position.y <= 1.01) {
      this.canJump = true
    }

    // Sync camera with player
    this.camera.position.copy(this.playerBody.position)
  }

  setGeometry() {
    this.geometry = new THREE.CircleGeometry(5, 64)
  }

  setTextures() {
    this.textures = {}

    this.textures.color = this.resources.items.grassColorTexture
    this.textures.color.colorSpace = THREE.SRGBColorSpace
    this.textures.color.repeat.set(1.5, 1.5)
    this.textures.color.wrapS = THREE.RepeatWrapping
    this.textures.color.wrapT = THREE.RepeatWrapping

    this.textures.normal = this.resources.items.grassNormalTexture
    this.textures.normal.repeat.set(1.5, 1.5)
    this.textures.normal.wrapS = THREE.RepeatWrapping
    this.textures.normal.wrapT = THREE.RepeatWrapping
  }

  setMaterial() {
    this.material = new THREE.MeshStandardMaterial({
      map: this.textures.color,
      normalMap: this.textures.normal,
    })
  }

  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.rotation.x = -Math.PI * 0.5
    this.mesh.receiveShadow = true
    this.scene.add(this.mesh)
  }
}
