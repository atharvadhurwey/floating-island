import * as THREE from "three"
import * as CANNON from "cannon-es"
import Experience from "../Experience.js"
import { PointerLockControlsCannon } from "../Utils/PointerLockControlsCannon.js"
import { DRACOLoader } from "three/examples/jsm/Addons.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import CannonDebugger from "cannon-es-debugger"

export default class Player {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.camera = this.experience.camera.instance
    this.physicsWorld = this.experience.physicsWorld
    this.controls = this.experience.camera.controls
    this.debug = this.experience.debug

    this.setLights()

    this.setCannon()
    this.setPointerLockCannonControls()
    this.setTime()

    this.dracoLoader = new DRACOLoader()
    this.dracoLoader.setDecoderPath("/draco/")

    this.gltfloader = new GLTFLoader()
    this.gltfloader.setDRACOLoader(this.dracoLoader)

    this.textureLoader = new THREE.TextureLoader()

    this.createIsland()

    // this.respawnPosition = new THREE.Vector3(-30, 20, -21) // set to your desired spawn point

    if (this.debug.active) {
      this.debug.ui.addFolder("press 'E' to toggle view collisions").close()
      this.setCannonDebug()
    }
  }

  setCannonDebug() {
    const debugMeshes = []

    // Initialize CannonDebugger
    this.cannonDebugger = new CannonDebugger(this.scene, this.world, {
      onInit(body, mesh) {
        debugMeshes.push(mesh)
        mesh.visible = false // Set initial state
      },
    })

    let debugVisible = false

    // Toggle visibility on key press (e.g., press 'E' key)
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyE") {
        debugVisible = !debugVisible
        debugMeshes.forEach((mesh) => {
          mesh.visible = debugVisible
        })
      }
    })
  }

  setLights() {
    // const ambientLight = new THREE.AmbientLight(0x222244, 1)
    // const ambientLight = new THREE.AmbientLight(0x2e4482, 4)
    // this.scene.add(ambientLight)

    this.scene.fog = new THREE.Fog("#2e4482", 10, 100)
    this.scene.background = new THREE.Color("#2e4482") // Light blue sky
  }

  setCannon() {
    this.world = new CANNON.World()

    this.world.gravity.set(0, -20, 0)

    // Create a slippery material (friction coefficient = 0.0)
    this.physicsMaterial = new CANNON.Material("physics")
    const physics_physics = new CANNON.ContactMaterial(this.physicsMaterial, this.physicsMaterial, {
      friction: 0.6,
      restitution: 0.0,
    })

    // We must add the contact materials to the world
    this.world.addContactMaterial(physics_physics)

    // Create the user collision sphere
    const radius = 0.45
    this.sphereShape = new CANNON.Sphere(radius)
    this.sphereBody = new CANNON.Body({ mass: 5, material: this.physicsMaterial })
    // this.sphereBody.fixedRotation = true // Prevent rotation
    this.sphereBody.addShape(this.sphereShape)
    this.sphereBody.linearDamping = 0.9
    this.world.addBody(this.sphereBody)
  }

  setPointerLockCannonControls() {
    this.controls = new PointerLockControlsCannon(this.camera, this.sphereBody)
    this.scene.add(this.controls.getObject())

    document.addEventListener("click", () => this.controls.lock())

    this.controls.addEventListener("lock", () => {
      this.controls.enabled = true
      instructions.style.display = "none"
    })

    this.controls.addEventListener("unlock", () => {
      this.controls.enabled = false
      instructions.style.display = null
    })
  }

  setTime() {
    this.timeStep = 1 / 60
    this.lastCallTime = performance.now()
  }

  createIsland() {
    function createTrimesh(geometry) {
      const position = geometry.attributes.position
      const vertices = []
      for (let i = 0; i < position.count; i++) {
        vertices.push(position.getX(i), position.getY(i), position.getZ(i))
      }

      const indices = geometry.index ? Array.from(geometry.index.array) : [...Array(position.count).keys()]

      return new CANNON.Trimesh(vertices, indices)
    }

    this.gltfloader.load("/models/Skyisland/glTF/untitled.glb", (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          if (child.name.startsWith("Collider_")) {
            child.material.dispose()
            child.material = undefined
            child.visible = false // Hide the collider mesh if you want
            // Convert geometry to Cannon.js Trimesh
            const shape = createTrimesh(child.geometry)
            const position = new THREE.Vector3()
            child.getWorldPosition(position)

            const quaternion = new THREE.Quaternion()
            child.getWorldQuaternion(quaternion)

            const body = new CANNON.Body({
              mass: 0, // static
              friction: 0.9,
              shape: shape,
              position: position,
              quaternion: quaternion,
            })

            this.world.addBody(body)
          } else {
            if (this.resources.items[child.name]) {
              const material = new THREE.MeshBasicMaterial({
                map: this.resources.items[child.name],
                color: new THREE.Color(0.3, 0.3, 0.3),
              })
              if (child.name.includes("alpha")) {
                material.transparent = true
                material.alphaTest = 0.5 // helps with sorting artifacts
                material.depthWrite = true // better visual layering
                material.side = THREE.DoubleSide // Render both sides of the mesh
              }
              child.material = material
            }

            // if (!(child.name.startsWith("hiders_") || child.name.startsWith("Quartz"))) {
            //   child.material.map.magFilter = THREE.NearestFilter
            //   child.material.map.minFilter = THREE.NearestFilter
            // }
            // if (child.name.startsWith("hiders_")) {
            //   child.visible = false // Hide the collider mesh if you want
            // }
          }
        }
      })

      this.scene.add(gltf.scene)

      // Now place player on top of island (estimate top Y value or get max)
      // this.controls.target.set(0, 250, 0) // Set a Y value above island
      this.sphereBody.position.set(-30, 20, -21) // Set a Y value above island
      this.finishLoading()
    })
  }

  finishLoading() {
    const loadingScreen = document.getElementById("loading-screen")
    loadingScreen.style.opacity = "0"
    loadingScreen.style.display = "none"

    const instructions = document.getElementById("instructions")
    instructions.style.opacity = "1"
    instructions.style.display = "flex"
  }

  update() {
    const time = performance.now() / 1000
    const dt = time - this.lastCallTime
    this.lastCallTime = time

    if (this.controls.enabled) {
      this.world.step(this.timeStep, dt)

      if (this.sphereBody.position.y < -150) {
        // Reset position and velocity
        this.sphereBody.position.set(-30, 20, -21)
      }
    }

    this.controls.update(dt)

    if (this.debug.active) {
      this.cannonDebugger.update()
    }
  }
}
