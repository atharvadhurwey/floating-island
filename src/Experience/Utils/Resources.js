import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import EventEmitter from "./EventEmitter.js"
import Experience from "../Experience.js"

export default class Resources extends EventEmitter {
  constructor(sources) {
    super()

    this.experience = new Experience()
    this.renderer = this.experience.renderer.instance
    this.sources = sources

    this.items = {}
    this.toLoad = this.sources.length
    this.loaded = 0

    this.setLoaders()
    this.startLoading()
  }

  setLoaders() {
    this.loaders = {}
    this.loaders.gltfLoader = new GLTFLoader()
    this.loaders.textureLoader = new THREE.TextureLoader()
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
  }

  startLoading() {
    // Load each source
    for (const source of this.sources) {
      if (source.type === "gltfModel") {
        this.loaders.gltfLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file)
        })
      } else if (source.type === "texture") {
        this.loaders.textureLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file)
        })
      } else if (source.type === "cubeTexture") {
        this.loaders.cubeTextureLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file)
        })
      }
    }
  }

  sourceLoaded(source, file) {
    this.items[source.name] = file

    this.items[source.name].colorSpace = THREE.SRGBColorSpace
    this.items[source.name].flipY = false // Fixes texture flipping issue
    this.items[source.name].minFilter = THREE.NearestFilter
    this.items[source.name].magFilter = THREE.NearestFilter
    this.items[source.name].combine = THREE.MultiplyOperation

    this.renderer.initTexture(this.items[source.name])

    this.loaded++

    if (this.loaded === this.toLoad) {
      this.trigger("ready")
    }
  }
}
