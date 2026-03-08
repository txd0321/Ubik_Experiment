import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type SceneItem = {
  id: string
  name: string
  answered: boolean
  slotOverride?: number
}

type ThreeSceneProps = {
  items: SceneItem[]
  onItemClick: (id: string) => void
  onActiveItemsChange?: (activeIds: string[]) => void
  modelScaleMultiplier?: number
  showAxesHelper?: boolean
  renderUnusedSlots?: boolean
  initialCameraPosition?: [number, number, number]
  initialTarget?: [number, number, number]
  scenePreset?: 'default' | 'practice'
  interactionLocked?: boolean
}

export type ThreeSceneHandle = {
  getCameraState: () => { position: [number, number, number]; direction: [number, number, number] } | null
  captureScreenshot: (width: number, height: number, quality?: number) => string
}

export const ROOM_SIZE = 16
export const ROOM_HEIGHT = 8
const CAMERA_EYE_HEIGHT = ROOM_HEIGHT / 2
const INTERACT_DISTANCE = 4.2
const GLOBAL_MODEL_SCALE = 0.9

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
    modelPath: '/assets/models/2030_air_conditioner_opt.glb',
    position: [-7.5, 6, 4],
    targetSize: 6,
    rotationY: Math.PI/2,
  },
  {
    modelPath: '/assets/models/2030_coffee_machine_opt.glb',
    position: [-7, 2, -7],
    targetSize: 3.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_computer_opt.glb',
    position: [1, 0, -7],
    targetSize: 6.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_digital_wallet_opt.glb',
    position: [-2,1, 5.4],
    targetSize: 1.1,
    rotationY: Math.PI / 2,
  },
  {
    modelPath: '/assets/models/2030_door_opt.glb',
    position: [6, 0, -8],
    targetSize: 8,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_handphone_opt.glb',
    position: [-6, 2, -5],
    targetSize: 1.2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_laptop_opt.glb',
    position: [-4, 2, -5.6],
    targetSize: 2,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_soundbox_opt.glb',
    position: [-6.8, 6, -7.5],
    targetSize: 2.4,
    rotationY: 0.5,
  },
  {
    modelPath: '/assets/models/2030_table_opt.glb',
    position: [-4.8, 0, -5.7],
    targetSize: 7,
    rotationY: 0,
  },
  {
    modelPath: '/assets/models/2030_time_spray_opt.glb',
    position: [-3, 1.45, 5.5],
    targetSize: 1.5,
    rotationY: 0,
    rotationZ: -Math.PI / 2,
  },
  {
    modelPath: '/assets/models/2030_chair_opt.glb',
    position: [-5, 0, -1.5],
    targetSize: 4,
    rotationY: Math.PI*5/6,
  },
  {
    modelPath: '/assets/models/2030_sofa_opt.glb',
    position: [-6.5, 0, 4.5],
    targetSize: 6.5,
    rotationY: Math.PI/2,
  },
  {
    modelPath: '/assets/models/2030_bed_opt.glb',
    position: [4.6, 0,4.6],
    targetSize: 7.5,
    rotationY: -Math.PI / 1,
  },
  // ===== 新增模型手动调参（和上面同格式）=====
  {
    modelPath: '/assets/models/2030_tea_table_opt.glb',
    position: [-2.5, 0, 4.5],
    targetSize: 4,
    rotationY: Math.PI / 2,
  },
  {
    modelPath: '/assets/models/2030_lighter_opt.glb',
    position: [6, 1, -6.5],
    targetSize: 1,
    rotationY: Math.PI / 5,
  },
  {
    modelPath: '/assets/models/2030_projector_01_opt.glb',
    position: [8, 2, 4.2],
    targetSize: 7.5,
    rotationY: Math.PI/2,
  },
  {
    modelPath: '/assets/models/2030_projector_02_opt.glb',
    position: [-1.8, 1.02, 3.6],
    targetSize: 1.4,
    rotationY: Math.PI / 2,
  },
]

type ItemVisual = {
  id: string
  slot: number
  root: THREE.Group
  clickable: THREE.Object3D
  placeholder: THREE.Mesh | null
  emissiveMaterials: THREE.MeshStandardMaterial[]
  glowHalo: THREE.Mesh
  suppressAnsweredGreen: boolean
  answered: boolean
  active: boolean
  baseY: number
  futureModel: THREE.Object3D | null
  transitioningToHistoric: boolean
  hasSwitchedToHistoric: boolean
  isExtraSlot: boolean
  prevAnswered: boolean
  prevActive: boolean
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
  '/assets/models/2030_chair_opt.glb',
  '/assets/models/2030_sofa_opt.glb',
  '/assets/models/2030_bed_opt.glb',
  '/assets/models/2030_tea_table_opt.glb',
  '/assets/models/2030_lighter_opt.glb',
  '/assets/models/2030_projector_01_opt.glb',
  '/assets/models/2030_projector_02_opt.glb',
])

const HISTORIC_MODEL_BY_SLOT: Partial<Record<number, string>> = {
  0: '/assets/models/1930_heating_opt.glb',
  1: '/assets/models/1930_handmade_coffee_opt.glb',
  3: '/assets/models/1930_bag_opt.glb',
  5: '/assets/models/1930_envelop_opt.glb',
  6: '/assets/models/1930_typewriter_opt.glb',
  7: '/assets/models/1930_radio_opt.glb',
  9: '/assets/models/1930_time_spray_opt.glb',
  14: '/assets/models/1930_matchstick_opt.glb',
  15: '/assets/models/1930_light_opt.glb',
}

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

function collectEmissiveMaterials(root: THREE.Object3D, enableShadows = true) {
  const materials: THREE.MeshStandardMaterial[] = []

  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = enableShadows
    mesh.receiveShadow = enableShadows

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
  const { answered, active, placeholder, emissiveMaterials, glowHalo, suppressAnsweredGreen } = visual
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
      mat.emissiveIntensity = 1.2
    } else {
      mat.emissive.set('#000000')
      mat.emissiveIntensity = 0
    }
  })

  const haloMat = glowHalo.material as THREE.MeshBasicMaterial
  if (active && !answered) {
    glowHalo.visible = true
    haloMat.color.set('#ffd84d')
    haloMat.opacity = 0.28
  } else {
    glowHalo.visible = false
    haloMat.opacity = 0
  }
}

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(function ThreeScene({
  items,
  onItemClick,
  onActiveItemsChange,
  modelScaleMultiplier = 1,
  showAxesHelper = false,
  renderUnusedSlots = true,
  initialCameraPosition,
  initialTarget,
  scenePreset = 'default',
  interactionLocked = false,
}, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const coreRef = useRef<SceneCore | null>(null)
  const itemsRef = useRef<SceneItem[]>(items)
  const onItemClickRef = useRef(onItemClick)
  const onActiveItemsChangeRef = useRef(onActiveItemsChange)
  const interactionLockedRef = useRef(interactionLocked)

  useImperativeHandle(ref, () => ({
    getCameraState() {
      const core = coreRef.current
      if (!core) return null
      const { camera } = core
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      return {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
        direction: [direction.x, direction.y, direction.z] as [number, number, number],
      }
    },
    captureScreenshot(width: number, height: number, quality = 0.6) {
      const core = coreRef.current
      if (!core) return ''
      const { scene, camera, renderer } = core
      // Force one frame render before capture so the buffer is up-to-date (avoids black image)
      renderer.render(scene, camera)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.drawImage(renderer.domElement, 0, 0, width, height)
      return canvas.toDataURL('image/jpeg', quality)
    },
  }), [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    onItemClickRef.current = onItemClick
  }, [onItemClick])

  useEffect(() => {
    onActiveItemsChangeRef.current = onActiveItemsChange
  }, [onActiveItemsChange])

  useEffect(() => {
    interactionLockedRef.current = interactionLocked
    const core = coreRef.current
    if (core) {
      core.controls.enableRotate = !interactionLocked
      core.controls.enablePan = false
    }
    if (interactionLocked) {
      const mount = mountRef.current
      const canvas = mount?.querySelector('canvas') as HTMLCanvasElement | null
      if (canvas) {
        canvas.style.cursor = 'default'
      }
    }
  }, [interactionLocked])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(scenePreset === 'practice' ? 0xffffff : 0x202533)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    const cameraPos = initialCameraPosition ?? [4, CAMERA_EYE_HEIGHT, 6]
    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2])

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    const targetPos = initialTarget ?? [0, CAMERA_EYE_HEIGHT, 0]
    controls.target.set(targetPos[0], targetPos[1], targetPos[2])
    controls.update()

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture

    const textureLoader = new THREE.TextureLoader()

    const wallpaperCanvas = document.createElement('canvas')
    wallpaperCanvas.width = 2048
    wallpaperCanvas.height = 1024
    const wallpaperCtx = wallpaperCanvas.getContext('2d')
    if (wallpaperCtx) {
      // 使用竖向渐变，避免不同墙面在水平方向出现明显拼接边界
      const wallpaperGradient = wallpaperCtx.createLinearGradient(0, 0, 0, wallpaperCanvas.height)
      wallpaperGradient.addColorStop(0, '#9fc3ff')
      wallpaperGradient.addColorStop(0.72, '#bbaeff')
      wallpaperGradient.addColorStop(1, '#f4b3dc')
      wallpaperCtx.fillStyle = wallpaperGradient
      wallpaperCtx.fillRect(0, 0, wallpaperCanvas.width, wallpaperCanvas.height)

      const glowGradient = wallpaperCtx.createRadialGradient(
        wallpaperCanvas.width * 0.25,
        wallpaperCanvas.height * 0.35,
        40,
        wallpaperCanvas.width * 0.25,
        wallpaperCanvas.height * 0.35,
        420,
      )
      glowGradient.addColorStop(0, 'rgba(195, 235, 255, 0.18)')
      glowGradient.addColorStop(1, 'rgba(195, 235, 255, 0)')
      wallpaperCtx.fillStyle = glowGradient
      wallpaperCtx.fillRect(0, 0, wallpaperCanvas.width, wallpaperCanvas.height)
    }

    const wallpaperMap = new THREE.CanvasTexture(wallpaperCanvas)
    wallpaperMap.colorSpace = THREE.SRGBColorSpace
    wallpaperMap.wrapS = THREE.ClampToEdgeWrapping
    wallpaperMap.wrapT = THREE.ClampToEdgeWrapping
    wallpaperMap.repeat.set(1, 1)

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

    const floorNormalMap = textureLoader.load('/assets/textures/floor_normal.png')
    floorNormalMap.wrapS = THREE.RepeatWrapping
    floorNormalMap.wrapT = THREE.RepeatWrapping
    floorNormalMap.repeat.set(4, 4)

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
    wallpaperMap.anisotropy = maxAnisotropy
    wallNormalMap.anisotropy = maxAnisotropy
    wallRoughnessMap.anisotropy = maxAnisotropy
    wallMetalnessMap.anisotropy = maxAnisotropy
    floorNormalMap.anisotropy = maxAnisotropy

    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: scenePreset === 'practice' ? null : wallpaperMap,
      normalMap: scenePreset === 'practice' ? null : wallNormalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughnessMap: scenePreset === 'practice' ? null : wallRoughnessMap,
      metalnessMap: scenePreset === 'practice' ? null : wallMetalnessMap,
      roughness: scenePreset === 'practice' ? 0.95 : 0.62,
      metalness: scenePreset === 'practice' ? 0.02 : 0.18,
      emissive: new THREE.Color(scenePreset === 'practice' ? '#000000' : '#2e1a66'),
      emissiveIntensity: scenePreset === 'practice' ? 0 : 0.14,
      side: THREE.BackSide,
    })
    const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE), roomMaterial)
    room.position.y = ROOM_HEIGHT / 2
    room.receiveShadow = true
    scene.add(room)

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: scenePreset === 'practice' ? 0x000000 : 0xffffff,
      normalMap: scenePreset === 'practice' ? null : floorNormalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: scenePreset === 'practice' ? 1 : 0.92,
      metalness: 0.02,
    })

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
      floorMaterial,
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
    ceilingLight.shadow.mapSize.set(512, 512)
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

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)
    const modelCache = new Map<number, THREE.Object3D>()
    const historicModelCache = new Map<number, THREE.Object3D>()

    const loadModelIntoVisual = async (visual: ItemVisual) => {
      const config = ITEM_CONFIGS[visual.slot]
      const modelPath = config?.modelPath
      if (!config) return

      if (scenePreset === 'practice') {
        if (!visualsById.has(visual.id)) return

        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 1.4),
          new THREE.MeshStandardMaterial({
            color: '#6889F4',
            roughness: 0.35,
            metalness: 0.08,
          }),
        )
        cube.castShadow = true
        cube.receiveShadow = true

        if (visual.placeholder) {
          visual.root.remove(visual.placeholder)
          visual.placeholder.geometry.dispose()
          ;(visual.placeholder.material as THREE.Material).dispose()
          visual.placeholder = null
        }

        visual.root.add(cube)
        visual.clickable = cube
        visual.emissiveMaterials = collectEmissiveMaterials(cube)
        updateVisualAppearance(visual)
        return
      }

      if (!modelPath) return

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
        visual.emissiveMaterials = collectEmissiveMaterials(modelInstance, !visual.isExtraSlot)
        updateVisualAppearance(visual)
      } catch {
        // keep placeholder when loading fails
      }
    }

    const loadHistoricModelIntoVisual = async (visual: ItemVisual) => {
      if (scenePreset === 'practice') return
      const config = ITEM_CONFIGS[visual.slot]
      if (!config || visual.futureModel || visual.hasSwitchedToHistoric) return
      const historicPath = HISTORIC_MODEL_BY_SLOT[visual.slot]
      if (!historicPath) return

      try {
        let model = historicModelCache.get(visual.slot)
        if (!model) {
          const gltf = await gltfLoader.loadAsync(historicPath)
          model = gltf.scene
          historicModelCache.set(visual.slot, model)
        }

        if (!visualsById.has(visual.id)) return

        const modelInstance = model.clone(true)
        fitModelToTarget(modelInstance, config.targetSize * modelScaleMultiplier * GLOBAL_MODEL_SCALE)
        modelInstance.rotation.y = config.rotationY
        modelInstance.rotation.z = config.rotationZ ?? 0
        modelInstance.scale.setScalar(0.001)
        visual.root.add(modelInstance)
        visual.futureModel = modelInstance
        visual.transitioningToHistoric = true
      } catch {
        // ignore historic model load failure
      }
    }

    const createItemVisual = (item: SceneItem, slot: number, isExtraSlot = false) => {
      const config = ITEM_CONFIGS[slot]
      if (!config) return
      const [x, y, z] = config.position
      const suppressAnsweredGreen = NO_GREEN_MODEL_PATHS.has(config.modelPath)
      const enableShadows = !isExtraSlot

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
      placeholder.castShadow = enableShadows
      placeholder.receiveShadow = enableShadows
      root.add(placeholder)

      const glowHalo = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 16, 16),
        new THREE.MeshBasicMaterial({
          color: '#ffd84d',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      )
      glowHalo.visible = false
      root.add(glowHalo)

      const visual: ItemVisual = {
        id: item.id,
        slot,
        root,
        clickable: placeholder,
        placeholder,
        emissiveMaterials: [],
        glowHalo,
        suppressAnsweredGreen,
        answered: item.answered,
        active: false,
        baseY: y,
        futureModel: null,
        transitioningToHistoric: false,
        hasSwitchedToHistoric: false,
        isExtraSlot,
        prevAnswered: item.answered,
        prevActive: false,
      }

      visualsById.set(item.id, visual)
      clickableRoots.push(root)
      loadModelIntoVisual(visual)
      updateVisualAppearance(visual)
    }

    itemsRef.current.forEach((item, index) => {
      const slot = item.slotOverride ?? (index % ITEM_CONFIGS.length)
      slotById.set(item.id, slot)
      createItemVisual(item, slot)
    })

    if (renderUnusedSlots) {
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
          true,
        )
      })
    }

    const moveState = { KeyW: false, KeyA: false, KeyS: false, KeyD: false }
    const moveSpeed = 4

    const keyDown = (event: KeyboardEvent) => {
      if (!(event.code in moveState)) return
      event.preventDefault()
      if (interactionLockedRef.current) {
        moveState.KeyW = false
        moveState.KeyA = false
        moveState.KeyS = false
        moveState.KeyD = false
        return
      }
      moveState[event.code as keyof typeof moveState] = true
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

    const resolveHoveredItemId = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const hits = raycaster.intersectObjects(clickableRoots, true)
      if (!hits.length) return undefined

      let target: THREE.Object3D | null = hits[0].object
      let targetItemId: string | undefined

      while (target && !targetItemId) {
        targetItemId = target.userData?.itemId as string | undefined
        target = target.parent
      }

      return targetItemId
    }

    const onPointerMove = (event: MouseEvent) => {
      if (interactionLockedRef.current) {
        renderer.domElement.style.cursor = 'default'
        return
      }
      const hoveredItemId = resolveHoveredItemId(event)
      if (!hoveredItemId) {
        renderer.domElement.style.cursor = 'default'
        return
      }

      const visual = visualsById.get(hoveredItemId)
      const isClickable = Boolean(visual && !visual.answered && visual.active)
      renderer.domElement.style.cursor = isClickable ? 'pointer' : 'default'
    }

    const onClick = (event: MouseEvent) => {
      if (interactionLockedRef.current) return
      const targetItemId = resolveHoveredItemId(event)
      if (!targetItemId) return
      const visual = visualsById.get(targetItemId)
      if (!visual || visual.answered || !visual.active) return
      onItemClickRef.current(targetItemId)
    }

    let raf = 0
    const clock = new THREE.Clock()
    let lastActiveIdsKey = ''
    const floorDarkColor = new THREE.Color('#252525')
    let taskVisualsList: ItemVisual[] | null = null
    const activeIdsBuffer: string[] = []
    const _forward = new THREE.Vector3()
    const _right = new THREE.Vector3()
    const _movement = new THREE.Vector3()
    const _flatCamPos = new THREE.Vector3()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      _forward.set(0, 0, 0)
      camera.getWorldDirection(_forward)
      _forward.y = 0
      if (_forward.lengthSq() > 0) _forward.normalize()

      _right.crossVectors(_forward, camera.up).normalize()
      _movement.set(0, 0, 0)

      if (moveState.KeyW) _movement.add(_forward)
      if (moveState.KeyS) _movement.sub(_forward)
      if (moveState.KeyA) _movement.sub(_right)
      if (moveState.KeyD) _movement.add(_right)

      if (_movement.lengthSq() > 0) {
        _movement.normalize().multiplyScalar(moveSpeed * delta)
        camera.position.add(_movement)
        controls.target.add(_movement)

        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -7.2, 7.2)
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -7.2, 7.2)
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -7.2, 7.2)
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -7.2, 7.2)
      }

      const elapsed = clock.elapsedTime

      visualsById.forEach((visual) => {
        visual.root.position.y = visual.baseY

        if (!visual.isExtraSlot) {
          _flatCamPos.set(camera.position.x, visual.baseY, camera.position.z)
          const distance = visual.root.position.distanceTo(_flatCamPos)
          visual.active = !visual.answered && distance <= INTERACT_DISTANCE
        }

        if (visual.active && !visual.answered) {
          const haloMat = visual.glowHalo.material as THREE.MeshBasicMaterial
          const pulse = (Math.sin(elapsed * 4.2) + 1) / 2
          const scale = 1.12 + pulse * 0.14
          visual.glowHalo.scale.setScalar(scale)
          haloMat.opacity = 0.1 + pulse * 0.1
        }

        if (visual.answered && !visual.futureModel && !visual.hasSwitchedToHistoric) {
          void loadHistoricModelIntoVisual(visual)
        }

        if (visual.transitioningToHistoric && visual.clickable) {
          const currentScale = visual.clickable.scale.x
          const nextScale = Math.max(0.001, currentScale - delta * 2.8)
          visual.clickable.scale.setScalar(nextScale)

          if (visual.futureModel) {
            const targetScale = 1
            const histScale = Math.min(targetScale, visual.futureModel.scale.x + delta * 2.8)
            visual.futureModel.scale.setScalar(histScale)

            if (histScale >= targetScale && nextScale <= 0.02) {
              visual.root.remove(visual.clickable)
              visual.clickable.traverse((obj: THREE.Object3D) => {
                const mesh = obj as THREE.Mesh
                if (!mesh.isMesh) return
                mesh.geometry.dispose()
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((m: THREE.Material) => m.dispose())
                } else {
                  mesh.material.dispose()
                }
              })
              visual.clickable = visual.futureModel
              visual.futureModel = null
              visual.emissiveMaterials = collectEmissiveMaterials(visual.clickable)
              visual.transitioningToHistoric = false
              visual.hasSwitchedToHistoric = true
            }
          }
        }

        const stateChanged = visual.prevAnswered !== visual.answered || visual.prevActive !== visual.active
        if (stateChanged || visual.transitioningToHistoric) {
          updateVisualAppearance(visual)
          visual.prevAnswered = visual.answered
          visual.prevActive = visual.active
        }
      })

      if (taskVisualsList === null) {
        taskVisualsList = Array.from(visualsById.values()).filter(
          (visual) => !visual.id.startsWith(EXTRA_ITEM_ID_PREFIX),
        )
      }
      const allAnswered =
        scenePreset === 'default' &&
        taskVisualsList.length > 0 &&
        taskVisualsList.every((visual) => visual.answered)

      if (allAnswered) {
        roomMaterial.emissiveIntensity = THREE.MathUtils.lerp(roomMaterial.emissiveIntensity, 0.28, 0.02)
        floorMaterial.color.lerp(floorDarkColor, 0.02)
      }

      activeIdsBuffer.length = 0
      for (const visual of taskVisualsList) {
        if (visual.active) activeIdsBuffer.push(visual.id)
      }
      activeIdsBuffer.sort()
      const activeIdsKey = activeIdsBuffer.join('|')
      if (activeIdsKey !== lastActiveIdsKey) {
        lastActiveIdsKey = activeIdsKey
        onActiveItemsChangeRef.current?.([...activeIdsBuffer])
      }

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
    renderer.domElement.addEventListener('mousemove', onPointerMove)
    renderer.domElement.addEventListener('click', onClick)

    const dispose = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blurReset)
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.style.cursor = 'default'

      dracoLoader.dispose()
      controls.dispose()
      pmremGenerator.dispose()
      envRT.dispose()

      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material: THREE.Material) => material.dispose())
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
      const slot = core.slotById.get(item.id) ?? item.slotOverride ?? (index % ITEM_CONFIGS.length)
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
})

export default ThreeScene
