import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type SceneItem = {
  id: string
  name: string
  answered: boolean
}

type ThreeSceneProps = {
  items: SceneItem[]
  onItemClick: (id: string) => void
  modelScaleMultiplier?: number
  showAxesHelper?: boolean
}

const ROOM_SIZE = 16
const ROOM_HEIGHT = 8
const CAMERA_EYE_HEIGHT = ROOM_HEIGHT / 2
const INTERACT_DISTANCE = 2.4
const GLOBAL_MODEL_SCALE = 0.3

type ItemPlacementConfig = {
  modelPath: string
  position: [number, number, number]
  targetSize: number
  rotationY: number
  rotationZ?: number
}

// 手动调参区：统一管理所有模型的坐标/缩放/Y轴旋转
const ITEM_CONFIGS: ItemPlacementConfig[] = [
  {
    modelPath: '/assets/models/2030_air_conditioner.glb',
    position: [-7.5, 6, 2],
    targetSize: 5,
    rotationY: 1.5,
  },
  {
    modelPath: '/assets/models/2030_coffee_machine.glb',
    position: [-7, 2, -7],
    targetSize: 3.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_computer.glb',
    position: [1, 0, -7],
    targetSize: 6.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_digital_wallet.glb',
    position: [2.8, 0.7, -4.6],
    targetSize: 1.1,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_door.glb',
    position: [6, 0, -8],
    targetSize: 8,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_handphone.glb',
    position: [-6, 2, -5],
    targetSize: 1.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_laptop.glb',
    position: [-4, 2, -5.6],
    targetSize: 2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_soundbox.glb',
    position: [-6.8, 6, -7.5],
    targetSize: 2.4,
    rotationY: 0.5,
  },
  {
    modelPath: '/assets/models/2030_table.glb',
    position: [-4.8, 0, -5.7],
    targetSize: 7,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_time_spray.glb',
    position: [0, 0.7, 5.2],
    targetSize: 1.1,
    rotationY: 0,
    rotationZ: -Math.PI / 2,
  },
  {
    modelPath: '/assets/models/2030_chair.glb',
    position: [-5, 0, -1.5],
    targetSize: 4,
    rotationY: Math.PI*5/6,
  },
  {
    modelPath: '/assets/models/2030_sofa.glb',
    position: [-6.5, 0, 4.5],
    targetSize: 6.5,
    rotationY: Math.PI/2,
  },
  {
    modelPath: '/assets/models/2030_bed.glb',
    position: [4.6, 0,4.6],
    targetSize: 7.5,
    rotationY: -Math.PI / 1,
  },
]

type ItemVisual = {
  id: string
  slot: number
  root: THREE.Group
  clickable: THREE.Object3D
  placeholder: THREE.Mesh | null
  emissiveMaterials: THREE.MeshStandardMaterial[]
  suppressAnsweredGreen: boolean
  answered: boolean
  active: boolean
  baseY: number
}

type SceneCore = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  pmremGenerator: THREE.PMREMGenerator
  envRT: THREE.WebGLRenderTarget
  itemGroup: THREE.Group
  visualsById: Map<string, ItemVisual>
  clickableRoots: THREE.Object3D[]
  slotById: Map<string, number>
  dispose: () => void
}

const EXTRA_ITEM_ID_PREFIX = '__extra_slot_'

const NO_GREEN_MODEL_PATHS = new Set([
  '/assets/models/2030_chair.glb',
  '/assets/models/2030_sofa.glb',
  '/assets/models/2030_bed.glb',
])

function fitModelToTarget(model: THREE.Object3D, targetSize = 1.1) {
  const box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)

  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) {
    const scale = targetSize / maxDim
    model.scale.setScalar(scale)
  }

  const fittedBox = new THREE.Box3().setFromObject(model)
  const center = fittedBox.getCenter(new THREE.Vector3())
  const minY = fittedBox.min.y

  model.position.x -= center.x
  model.position.z -= center.z
  model.position.y -= minY
}

function collectEmissiveMaterials(root: THREE.Object3D) {
  const materials: THREE.MeshStandardMaterial[] = []

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = true
    mesh.receiveShadow = true

    const mat = mesh.material
    if (Array.isArray(mat)) {
      mat.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          materials.push(m)
        }
      })
      return
    }

    if (mat instanceof THREE.MeshStandardMaterial) {
      materials.push(mat)
    }
  })

  return materials
}

function updateVisualAppearance(visual: ItemVisual) {
  const { answered, active, placeholder, emissiveMaterials, suppressAnsweredGreen } = visual
  const shouldShowAnsweredGreen = answered && !suppressAnsweredGreen

  if (placeholder) {
    const mat = placeholder.material as THREE.MeshStandardMaterial
    if (shouldShowAnsweredGreen) {
      mat.color.set('#2be694')
      mat.emissive.set('#1a8f62')
      mat.emissiveIntensity = 0.6
    } else if (active) {
      mat.color.set('#fff4c4')
      mat.emissive.set('#ffd84d')
      mat.emissiveIntensity = 0.85
    } else {
      mat.color.set('#f7fbff')
      mat.emissive.set('#2f364a')
      mat.emissiveIntensity = 0.08
    }
  }

  emissiveMaterials.forEach((mat) => {
    if (shouldShowAnsweredGreen) {
      mat.emissive.set('#1a8f62')
      mat.emissiveIntensity = 0.5
    } else if (active) {
      mat.emissive.set('#ffd84d')
      mat.emissiveIntensity = 0.45
    } else {
      mat.emissive.set('#000000')
      mat.emissiveIntensity = 0
    }
  })
}

export default function ThreeScene({
  items,
  onItemClick,
  modelScaleMultiplier = 1,
  showAxesHelper = false,
}: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const coreRef = useRef<SceneCore | null>(null)
  const itemsRef = useRef<SceneItem[]>(items)
  const onItemClickRef = useRef(onItemClick)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    onItemClickRef.current = onItemClick
  }, [onItemClick])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x202533)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(4, CAMERA_EYE_HEIGHT, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, CAMERA_EYE_HEIGHT, 0)
    controls.update()

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture

    const textureLoader = new THREE.TextureLoader()

    const wallpaperMap = textureLoader.load('/assets/textures/wall_basecolor.jpg')
    wallpaperMap.colorSpace = THREE.SRGBColorSpace
    wallpaperMap.wrapS = THREE.RepeatWrapping
    wallpaperMap.wrapT = THREE.RepeatWrapping
    wallpaperMap.repeat.set(3.5, 1.8)

    const wallNormalMap = textureLoader.load('/assets/textures/wall_Normal.png')
    wallNormalMap.wrapS = THREE.RepeatWrapping
    wallNormalMap.wrapT = THREE.RepeatWrapping
    wallNormalMap.repeat.copy(wallpaperMap.repeat)

    const wallRoughnessMap = textureLoader.load('/assets/textures/wall_Roughness.jpg')
    wallRoughnessMap.wrapS = THREE.RepeatWrapping
    wallRoughnessMap.wrapT = THREE.RepeatWrapping
    wallRoughnessMap.repeat.copy(wallpaperMap.repeat)

    const wallMetalnessMap = textureLoader.load('/assets/textures/wall_Metallic.jpg')
    wallMetalnessMap.wrapS = THREE.RepeatWrapping
    wallMetalnessMap.wrapT = THREE.RepeatWrapping
    wallMetalnessMap.repeat.copy(wallpaperMap.repeat)

    const floorMap = textureLoader.load('/assets/textures/floor_basecolor.jpg')
    floorMap.colorSpace = THREE.SRGBColorSpace
    floorMap.wrapS = THREE.RepeatWrapping
    floorMap.wrapT = THREE.RepeatWrapping
    floorMap.repeat.set(4, 4)

    const floorNormalMap = textureLoader.load('/assets/textures/floor_normal.png')
    floorNormalMap.wrapS = THREE.RepeatWrapping
    floorNormalMap.wrapT = THREE.RepeatWrapping
    floorNormalMap.repeat.copy(floorMap.repeat)

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
    wallpaperMap.anisotropy = maxAnisotropy
    wallNormalMap.anisotropy = maxAnisotropy
    wallRoughnessMap.anisotropy = maxAnisotropy
    wallMetalnessMap.anisotropy = maxAnisotropy
    floorMap.anisotropy = maxAnisotropy
    floorNormalMap.anisotropy = maxAnisotropy

    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9b1a2,
      map: wallpaperMap,
      normalMap: wallNormalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: wallRoughnessMap,
      metalnessMap: wallMetalnessMap,
      roughness: 0.85,
      metalness: 0.08,
      side: THREE.BackSide,
    })
    const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE), roomMaterial)
    room.position.y = ROOM_HEIGHT / 2
    room.receiveShadow = true
    scene.add(room)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
      new THREE.MeshStandardMaterial({
        color: 0x6a5f52,
        map: floorMap,
        normalMap: floorNormalMap,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughness: 0.92,
        metalness: 0.02,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    // Room box底面在 y=0，地板需要略高于它，否则会看到房间底面的墙纸贴图
    floor.position.y = 0.01
    floor.receiveShadow = true
    scene.add(floor)

    const gridHelper = new THREE.GridHelper(ROOM_SIZE, 16, 0xffffff, 0x7a7a7a)
    gridHelper.position.y = 0.03
    scene.add(gridHelper)

    let axesHelper: THREE.AxesHelper | null = null
    let axisLabelsGroup: THREE.Group | null = null
    const axisLabelTextures: THREE.CanvasTexture[] = []
    const axisLabelMaterials: THREE.SpriteMaterial[] = []

    if (showAxesHelper) {
      const axesOriginY = 0.05
      axesHelper = new THREE.AxesHelper(2.8)
      axesHelper.position.set(0, axesOriginY, 0)
      scene.add(axesHelper)

      axisLabelsGroup = new THREE.Group()
      axisLabelsGroup.position.set(0, axesOriginY, 0)
      scene.add(axisLabelsGroup)

      const createAxisLabelSprite = (text: string, color: string) => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(24, 28, 208, 72)
        ctx.font = 'bold 40px ui-monospace, SFMono-Regular, Menlo, monospace'
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        const material = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          depthWrite: false,
        })
        const sprite = new THREE.Sprite(material)
        sprite.scale.set(0.45, 0.225, 1)

        axisLabelTextures.push(texture)
        axisLabelMaterials.push(material)
        return sprite
      }

      const tickStep = 0.5
      const tickRange = 2.5

      for (let value = -tickRange; value <= tickRange + 1e-6; value += tickStep) {
        const rounded = Number(value.toFixed(1))
        if (Math.abs(rounded) < 1e-6) continue

        const xLabel = createAxisLabelSprite(rounded.toFixed(1), '#ff6b6b')
        if (xLabel && axisLabelsGroup) {
          xLabel.position.set(rounded, 0.08, 0)
          axisLabelsGroup.add(xLabel)
        }

        const yLabel = createAxisLabelSprite(rounded.toFixed(1), '#77e089')
        if (yLabel && axisLabelsGroup) {
          yLabel.position.set(0.1, rounded, 0)
          axisLabelsGroup.add(yLabel)
        }

        const zLabel = createAxisLabelSprite(rounded.toFixed(1), '#6bb8ff')
        if (zLabel && axisLabelsGroup) {
          zLabel.position.set(0, 0.08, rounded)
          axisLabelsGroup.add(zLabel)
        }
      }
    }

    scene.add(new THREE.AmbientLight(0xfff2dc, 0.7))
    scene.add(new THREE.HemisphereLight(0xbfd7ff, 0x6d5f50, 0.85))

    const ceilingLight = new THREE.PointLight(0xfff4e8, 2.4, 28, 2)
    ceilingLight.position.set(0, ROOM_HEIGHT - 0.15, 0)
    ceilingLight.castShadow = true
    ceilingLight.shadow.mapSize.set(1024, 1024)
    scene.add(ceilingLight)

    const fillLight = new THREE.DirectionalLight(0xdde7ff, 1.1)
    fillLight.position.set(-4, 4, 5)
    scene.add(fillLight)

    const frontFillLight = new THREE.DirectionalLight(0xffffff, 0.8)
    frontFillLight.position.set(5, 3, 6)
    scene.add(frontFillLight)

    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 0.6, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xf2e6cc,
        roughness: 0.6,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    )
    lampShade.position.copy(ceilingLight.position)
    lampShade.position.y -= 0.2
    scene.add(lampShade)

    const itemGroup = new THREE.Group()
    scene.add(itemGroup)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const clickableRoots: THREE.Object3D[] = []
    const visualsById = new Map<string, ItemVisual>()
    const slotById = new Map<string, number>()

    const gltfLoader = new GLTFLoader()
    const modelCache = new Map<number, THREE.Object3D>()

    const loadModelIntoVisual = async (visual: ItemVisual) => {
      const config = ITEM_CONFIGS[visual.slot]
      const modelPath = config?.modelPath
      if (!modelPath || !config) return

      try {
        let model = modelCache.get(visual.slot)
        if (!model) {
          const gltf = await gltfLoader.loadAsync(modelPath)
          model = gltf.scene
          modelCache.set(visual.slot, model)
        }

        if (!visualsById.has(visual.id)) return

        const modelInstance = model.clone(true)
        fitModelToTarget(modelInstance, config.targetSize * modelScaleMultiplier * GLOBAL_MODEL_SCALE)
        modelInstance.rotation.y = config.rotationY
        modelInstance.rotation.z = config.rotationZ ?? 0

        if (visual.placeholder) {
          visual.root.remove(visual.placeholder)
          visual.placeholder.geometry.dispose()
          ;(visual.placeholder.material as THREE.Material).dispose()
          visual.placeholder = null
        }

        visual.root.add(modelInstance)
        visual.clickable = modelInstance
        visual.emissiveMaterials = collectEmissiveMaterials(modelInstance)
        updateVisualAppearance(visual)
      } catch {
        // keep placeholder when loading fails
      }
    }

    const createItemVisual = (item: SceneItem, slot: number) => {
      const config = ITEM_CONFIGS[slot]
      if (!config) return
      const [x, y, z] = config.position
      const suppressAnsweredGreen = NO_GREEN_MODEL_PATHS.has(config.modelPath)

      const root = new THREE.Group()
      root.position.set(x, y, z)
      root.userData = { itemId: item.id }
      itemGroup.add(root)

      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({
          color: item.answered && !suppressAnsweredGreen ? '#2be694' : '#f7fbff',
          emissive: item.answered && !suppressAnsweredGreen ? '#1a8f62' : '#2f364a',
          emissiveIntensity: item.answered && !suppressAnsweredGreen ? 0.6 : 0.08,
          roughness: 0.5,
          metalness: 0.1,
        }),
      )
      placeholder.castShadow = true
      placeholder.receiveShadow = true
      root.add(placeholder)

      const visual: ItemVisual = {
        id: item.id,
        slot,
        root,
        clickable: placeholder,
        placeholder,
        emissiveMaterials: [],
        suppressAnsweredGreen,
        answered: item.answered,
        active: false,
        baseY: y,
      }

      visualsById.set(item.id, visual)
      clickableRoots.push(root)
      loadModelIntoVisual(visual)
      updateVisualAppearance(visual)
    }

    itemsRef.current.forEach((item, index) => {
      const slot = index % ITEM_CONFIGS.length
      slotById.set(item.id, slot)
      createItemVisual(item, slot)
    })

    // 对于配置中未被题目 items 占用的槽位，也渲染为静态模型，便于手动调参预览
    const usedSlots = new Set<number>(Array.from(slotById.values()))
    ITEM_CONFIGS.forEach((_, slot) => {
      if (usedSlots.has(slot)) return
      createItemVisual(
        {
          id: `${EXTRA_ITEM_ID_PREFIX}${slot}`,
          name: `extra-${slot}`,
          answered: true,
        },
        slot,
      )
    })

    const moveState = { KeyW: false, KeyA: false, KeyS: false, KeyD: false }
    const moveSpeed = 4

    const keyDown = (event: KeyboardEvent) => {
      if (event.code in moveState) {
        event.preventDefault()
        moveState[event.code as keyof typeof moveState] = true
      }
    }

    const keyUp = (event: KeyboardEvent) => {
      if (event.code in moveState) {
        event.preventDefault()
        moveState[event.code as keyof typeof moveState] = false
      }
    }

    const blurReset = () => {
      moveState.KeyW = false
      moveState.KeyA = false
      moveState.KeyS = false
      moveState.KeyD = false
    }

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const hits = raycaster.intersectObjects(clickableRoots, true)
      if (!hits.length) return

      let target: THREE.Object3D | null = hits[0].object
      let targetItemId: string | undefined

      while (target && !targetItemId) {
        targetItemId = target.userData?.itemId as string | undefined
        target = target.parent
      }

      if (!targetItemId) return
      const visual = visualsById.get(targetItemId)
      if (!visual || visual.answered || !visual.active) return
      onItemClickRef.current(targetItemId)
    }

    let raf = 0
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() > 0) forward.normalize()

      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
      const movement = new THREE.Vector3()

      if (moveState.KeyW) movement.add(forward)
      if (moveState.KeyS) movement.sub(forward)
      if (moveState.KeyA) movement.sub(right)
      if (moveState.KeyD) movement.add(right)

      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(moveSpeed * delta)
        camera.position.add(movement)
        controls.target.add(movement)

        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -7.2, 7.2)
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -7.2, 7.2)
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -7.2, 7.2)
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -7.2, 7.2)
      }

      visualsById.forEach((visual) => {
        visual.root.position.y = visual.baseY

        const flatCameraPos = new THREE.Vector3(camera.position.x, visual.baseY, camera.position.z)
        const distance = visual.root.position.distanceTo(flatCameraPos)
        visual.active = !visual.answered && distance <= INTERACT_DISTANCE

        updateVisualAppearance(visual)
      })

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    const onResize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blurReset)
    renderer.domElement.addEventListener('click', onClick)

    const dispose = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blurReset)
      renderer.domElement.removeEventListener('click', onClick)

      controls.dispose()
      pmremGenerator.dispose()
      envRT.dispose()

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      })

      axisLabelMaterials.forEach((material) => material.dispose())
      axisLabelTextures.forEach((texture) => texture.dispose())

      renderer.dispose()
      mount.innerHTML = ''
    }

    coreRef.current = {
      scene,
      camera,
      renderer,
      controls,
      pmremGenerator,
      envRT,
      itemGroup,
      visualsById,
      clickableRoots,
      slotById,
      dispose,
    }

    return () => {
      coreRef.current?.dispose()
      coreRef.current = null
    }
  }, [])

  useEffect(() => {
    const core = coreRef.current
    if (!core) return

    const nextIds = new Set(items.map((item) => item.id))

    core.visualsById.forEach((visual, itemId) => {
      const isExtra = itemId.startsWith(EXTRA_ITEM_ID_PREFIX)
      if (isExtra) return

      if (!nextIds.has(itemId)) {
        core.itemGroup.remove(visual.root)

        core.visualsById.delete(itemId)
        core.slotById.delete(itemId)
      }
    })

    items.forEach((item, index) => {
      const slot = core.slotById.get(item.id) ?? (index % ITEM_CONFIGS.length)
      if (!core.slotById.has(item.id)) {
        core.slotById.set(item.id, slot)
      }

      const visual = core.visualsById.get(item.id)
      if (!visual) return

      visual.answered = item.answered
      if (visual.answered) {
        visual.active = false
      }
    })
  }, [items])

  return <div className="three-mount" ref={mountRef} />
}
