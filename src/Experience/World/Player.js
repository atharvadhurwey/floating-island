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

    this.setLights()
    this.setGround()

    this.boxes = []
    this.boxMeshes = []

    this.setCannon()
    this.setPointerLockCannonControls()
    this.setTime()

    // this.setPlayer()
    // this.setContactMaterial()
    // this.setMovements()

    // this.setGeometry()
    // this.setTextures()
    // this.setMaterial()
    // this.setMesh()

    this.dracoLoader = new DRACOLoader()
    this.dracoLoader.setDecoderPath("/draco/")
    console.log(this.dracoLoader)

    this.gltfloader = new GLTFLoader()
    this.gltfloader.setDRACOLoader(this.dracoLoader)

    this.createHouse()

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    const spotlight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 10)
    spotlight.position.set(10, 30, 20)
    spotlight.target.position.set(0, 0, 0)

    spotlight.castShadow = true

    spotlight.shadow.camera.near = 10
    spotlight.shadow.camera.far = 100
    spotlight.shadow.camera.fov = 30

    // spotlight.shadow.bias = -0.0001
    spotlight.shadow.mapSize.width = 2048
    spotlight.shadow.mapSize.height = 2048

    this.scene.add(spotlight)
  }

  setGround() {
    // Generic material
    this.material = new THREE.MeshLambertMaterial({ color: 0xdddddd })
    this.boxMateiral = new THREE.MeshLambertMaterial({ color: 0x00ff00 })

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(300, 300, 100, 100)
    floorGeometry.rotateX(-Math.PI / 2)
    const floor = new THREE.Mesh(floorGeometry, this.material)
    floor.receiveShadow = true
    this.scene.add(floor)
  }

  setCannon() {
    this.world = new CANNON.World()

    // Tweak contact properties.
    // Contact stiffness - use to make softer/harder contacts
    this.world.defaultContactMaterial.contactEquationStiffness = 1e9

    // Stabilization time in number of timesteps
    this.world.defaultContactMaterial.contactEquationRelaxation = 4

    const solver = new CANNON.GSSolver()
    solver.iterations = 7
    solver.tolerance = 0.1
    this.world.solver = new CANNON.SplitSolver(solver)
    // use this to test non-split solver
    // world.solver = solver

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
    const radius = 0.5
    this.sphereShape = new CANNON.Sphere(radius)
    this.sphereBody = new CANNON.Body({ mass: 5, material: this.physicsMaterial })
    this.sphereBody.addShape(this.sphereShape)
    // this.sphereBody.position.set(0, 5, 0)
    this.sphereBody.linearDamping = 0.9
    this.world.addBody(this.sphereBody)

    // Create the ground plane
    const groundShape = new CANNON.Plane()
    const groundBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial })
    groundBody.addShape(groundShape)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(groundBody)

    // Add boxes both in cannon.js and three.js
    const halfExtents = new CANNON.Vec3(1, 1, 1)
    const boxShape = new CANNON.Box(halfExtents)
    const boxGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2)

    for (let i = 0; i < 7; i++) {
      const boxBody = new CANNON.Body({ mass: 5 })
      boxBody.addShape(boxShape)
      const boxMesh = new THREE.Mesh(boxGeometry, this.boxMateiral)

      const x = (Math.random() - 0.5) * 20
      const y = (Math.random() - 0.5) * 1 + 1
      const z = (Math.random() - 0.5) * 20

      boxBody.position.set(x, y, z)
      boxMesh.position.copy(boxBody.position)

      boxMesh.castShadow = true
      boxMesh.receiveShadow = true

      this.world.addBody(boxBody)
      this.scene.add(boxMesh)
      this.boxes.push(boxBody)
      this.boxMeshes.push(boxMesh)
    }
  }

  setPointerLockCannonControls() {
    this.controls = new PointerLockControlsCannon(this.camera, this.sphereBody)
    this.scene.add(this.controls.getObject())

    document.addEventListener("click", () => this.controls.lock())

    this.controls.addEventListener("lock", () => {
      this.controls.enabled = true
      // instructions.style.display = "none"
    })

    this.controls.addEventListener("unlock", () => {
      this.controls.enabled = false
      // instructions.style.display = null
    })
  }

  setTime() {
    this.timeStep = 1 / 60
    this.lastCallTime = performance.now()
  }

  createHouse() {
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
      const sceneModel = gltf.scene
      this.scene.add(sceneModel)

      sceneModel.traverse((child) => {
        if (child.isMesh) {
          console.log(child)
          if (child.name.startsWith("Collider_")) {
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
            child.visible = false // Hide the collider mesh if you want
          } else {
            child.material.map.minFilter = THREE.NearestFilter
            child.material.map.magFilter = THREE.NearestFilter
            // child.material.opacity = 0.5 // Make it 50% opaque
            // child.material.transparent = true // Enable transparency
          }
          // if (child.name.startsWith("Birch_Leaves")) {
          //   child.material.depthWrite = true
          // }
          // if (child.name.startsWith("Oak_Leaves")) {
          //   child.material.depthWrite = true
          // }
        }
      })

      // Now place player on top of island (estimate top Y value or get max)
      // this.controls.target.set(0, 250, 0) // Set a Y value above island
      this.sphereBody.position.set(-50, 300, 0) // Set a Y value above island
    })
  }

  update() {
    const time = performance.now() / 1000
    const dt = time - this.lastCallTime
    this.lastCallTime = time

    if (this.controls.enabled) {
      this.world.step(this.timeStep, dt)

      // // Update ball positions
      // for (let i = 0; i < balls.length; i++) {
      //   ballMeshes[i].position.copy(balls[i].position)
      //   ballMeshes[i].quaternion.copy(balls[i].quaternion)
      // }

      // Update box positions
      for (let i = 0; i < this.boxes.length; i++) {
        this.boxMeshes[i].position.copy(this.boxes[i].position)
        this.boxMeshes[i].quaternion.copy(this.boxes[i].quaternion)
      }
    }

    this.controls.update(dt)

    this.cannonDebugger.update()
  }
}
