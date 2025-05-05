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
    // this.controls = this.experience.camera.controls
    this.debug = this.experience.debug

    this.setLights()

    this.setCannon()
    this.setPointerLockCannonControls()
    this.setTime()

    this.dracoLoader = new DRACOLoader()
    this.dracoLoader.setDecoderPath("/draco/")

    this.gltfloader = new GLTFLoader()
    this.gltfloader.setDRACOLoader(this.dracoLoader)

    this.setSounds()
    this.createIsland()
    this.createMoon()
    this.placeBooks()

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
    const radius = 0.55
    this.sphereShape = new CANNON.Sphere(radius)
    this.sphereBody = new CANNON.Body({ mass: 5, material: this.physicsMaterial })
    // this.sphereBody.fixedRotation = true // Prevent rotation
    this.sphereBody.addShape(this.sphereShape)
    this.sphereBody.linearDamping = 0.9
    this.world.addBody(this.sphereBody)

    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyR") {
        this.sphereBody.position.set(-30, 20, -21) // Reset position
        this.sphereBody.velocity.set(0, 0, 0) // Reset velocity
        this.sphereBody.angularVelocity.set(0, 0, 0) // Reset angular velocity
      }
    })
  }

  setPointerLockCannonControls() {
    this.controls = new PointerLockControlsCannon(this.camera, this.sphereBody)
    this.scene.add(this.controls.getObject())
  }

  setTime() {
    this.timeStep = 1 / 60
    this.lastCallTime = performance.now()
  }

  setSounds() {
    // adding audio
    const listener = new THREE.AudioListener()
    this.camera.add(listener)

    const sound = new THREE.Audio(listener)

    const audioLoader = new THREE.AudioLoader()
    audioLoader.load("/audio/fellowship.mp3", function (buffer) {
      sound.setBuffer(buffer)
      sound.setLoop(true)
      sound.setVolume(0.1)

      const btn = document.getElementById("musicToggle")

      let isPlaying = false

      btn.addEventListener("click", () => {
        if (isPlaying) {
          sound.pause()
          btn.textContent = "🔇"
        } else {
          sound.play()
          btn.textContent = "🔊"
        }
        isPlaying = !isPlaying
      })
    })
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
                material.depthTest = true // better visual layering
                material.side = THREE.DoubleSide // better visual layering
              }
              child.material = material
            }

            if (child.name == "water") {
              child.material = new THREE.MeshBasicMaterial({
                color: 0x3366ff,
                transparent: true,
                opacity: 0.2, // Try 0.2–0.6 for tuning
                depthWrite: false, // Important: allows objects behind to render
                side: THREE.DoubleSide, // Important: allows objects behind to render
              })
            }

            // if (child.name == "hiders") {
            //   child.material = new THREE.MeshBasicMaterial({
            //     color: 0x000000,
            //     side: THREE.DoubleSide, // Important: allows objects behind to render
            //   })
            // }
            // if (child.name.startsWith("hiders_")) {
            //   child.visible = false // Hide the collider mesh if you want
            // }
          }
        }
      })

      this.scene.add(gltf.scene)

      this.sphereBody.position.set(-30, 20, -21) // (SPAWN POINT)
      // this.sphereBody.position.set(-57, 3, 85) // (HAXAGON SPAWN POINT)

      this.finishLoading()
    })
  }

  createMoon() {
    // Scale Controls
    const moonScale = { size: 75 }

    const moonTexture = this.resources.items["moon"]

    const moonMaterial = new THREE.SpriteMaterial({
      map: moonTexture,
      transparent: true,
      fog: false,
    })

    const moonSprite = new THREE.Sprite(moonMaterial)
    moonSprite.scale.set(moonScale.size, moonScale.size, 1)
    moonSprite.position.set(-10, 500, -60)
    this.scene.add(moonSprite)

    if (this.debug.active) {
      const moonFolder = this.debug.ui.addFolder("Moon 🌙")
      moonFolder.add(moonSprite.position, "x", -1000, 1000, 10).name("Position X")
      moonFolder.add(moonSprite.position, "y", -1000, 1000, 10).name("Position Y")
      moonFolder.add(moonSprite.position, "z", -1000, 1000, 10).name("Position Z")

      moonFolder
        .add(moonScale, "size", 50, 150)
        .name("Moon Size")
        .onChange((value) => {
          moonSprite.scale.set(value, value, 1)
        })

      moonFolder.open()
    }
  }

  placeBooks() {
    this.books = this.experience.books

    const book = [
      // {
      //   title: "tempBook",
      //   position: { x: -21.0, y: 16.0, z: -29.0 },
      //   text: "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      // },
      {
        title: "Lake of Echoes",
        position: { x: -4.5, y: 14.0, z: -12.0 },
        text: "No Fish stir these waters. Only stillness, and echoes of what once was. The glow beneath mourns quietly.",
      },
      {
        title: "Beneath the Blossom",
        position: { x: 69.5, y: 14.0, z: 43.0 },
        text: "The tree blooms, unyielding to time. Two sentinels drift above unmanned, unwavering. Some say they await a signal that may never come.",
      },
      {
        title: "Ivory Descent",
        position: { x: -89.0, y: 15.5, z: -59.0 },
        text: "Light spills across the circular path. Whispers cling to its base—of voices long sealed. The tower listens but never answers.",
      },
      {
        title: "The Forsaken Spire",
        position: { x: -57.0, y: 4.5, z: 73.0 },
        text: "They carved knowledge from silence. The portal remains mute, dormant, and hungering. Something passed through once it may again.",
      },
      {
        title: "Crown of the Island",
        position: { x: -59.0, y: 110.0, z: 43.5 },
        text: "No path leads here. Only will, and broken breath. Beyond the heights — only fog. Some say it hides what was never meant to be found.",
      },
      {
        title: "The Offering",
        position: { x: -29.0, y: -210.0, z: 13.0 },
        text: "A toll is demanded. Not in coin, but in form. The body may return but not unchanged. Each return is a memory etched deeper than before.",
      },
      {
        title: "The Last Witness",
        position: { x: -41.5, y: 24.5, z: 10.5 },
        text: "He wrote what he saw. Now silence keeps his place. The island remembers.",
      },
    ]

    book.forEach((book) => {
      this.books.createBook(book.title, book.position, book.text)
    })
  }

  finishLoading() {
    const loadingScreen = document.getElementById("loading-screen")
    loadingScreen.style.opacity = "0"
    loadingScreen.style.display = "none"

    const instructions = document.getElementById("instructions")
    instructions.style.opacity = "1"
    instructions.style.display = "flex"

    const musicToggle = document.getElementById("musicToggle")
    musicToggle.style.opacity = "1"
    musicToggle.style.display = "inline-block"

    instructions.addEventListener("click", () => this.controls.lock())

    this.controls.addEventListener("lock", () => {
      this.controls.enabled = true
      instructions.style.display = "none"
      musicToggle.style.display = "none"
    })

    this.controls.addEventListener("unlock", () => {
      this.controls.enabled = false
      instructions.style.display = "flex"
      musicToggle.style.display = "inline-block"
    })
  }

  update() {
    const time = performance.now() / 1000
    const dt = time - this.lastCallTime
    this.lastCallTime = time

    if (this.controls.enabled) {
      this.world.step(this.timeStep, dt)

      if (this.sphereBody.position.y < -220) {
        // Reset position and velocity
        this.sphereBody.position.set(-30, 20, -21)
      }
    }

    this.books.update(this.sphereBody.position)

    // console.log(this.sphereBody.position)

    this.controls.update(dt)

    if (this.debug.active) {
      this.cannonDebugger.update()
    }
  }
}
