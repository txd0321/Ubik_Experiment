import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { DEFAULT_ITEM_CONFIGS, type ItemPlacementConfig } from '../config/modelPlacement'

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
  itemConfigs?: ItemPlacementConfig[]
  forceHistoricModels?: boolean
}

const ROOM_SIZE = 16
const ROOM_HEIGHT = 8
const CAMERA_EYE_HEIGHT = ROOM_HEIGHT / 2
const INTERACT_DISTANCE = 4.2
const GLOBAL_MODEL_SCALE = 0.9

type ItemVisual = {
  id: string
  slot: number
  root: THREE.Group
  clickable: THREE.Object3D
  placeholder: THREE.Mesh | null
  emissiveMaterials: THREE.MeshStandardMaterial[]
  glowHalo: THREE.Mesh
  haloBaseScale: number
  haloPulseAmplitude: number
  suppressAnsweredGreen: boolean
  answered: boolean
  active: boolean
  isInteractive: boolean
  baseY: number
  futureModel: THREE.Object3D | null
  transitioningToHistoric: boolean
  hasSwitchedToHistoric: boolean
  loadingHistoricModel: boolean
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
  '/assets/models/nonitr_04_2030_chair_bedroom.glb',
  '/assets/models/nonitr_05_2030_sofa_bedroom.glb',
  '/assets/models/nonitr_02_2030_bed_bedroom.glb',
  '/assets/models/nonitr_03_2030_teaTable_bedroom.glb',
  '/assets/models/itr_10_2030_electricLighter_bedroom.glb',
  '/assets/models/itr_03_2030_holographicProjectorA_bedroom.glb',
  '/assets/models/itr_03_2030_holographicProjectorB_bedroom.glb',
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
  const { answered, active, placeholder, emissiveMaterials, glowHalo } = visual

  if (placeholder) {
    const mat = placeholder.material as THREE.MeshStandardMaterial
    if (active && !answered) {
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
    if (active && !answered) {
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

export default function ThreeScene({
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
  itemConfigs = DEFAULT_ITEM_CONFIGS,
  forceHistoricModels = false,
}: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const coreRef = useRef<SceneCore | null>(null)
  const itemsRef = useRef<SceneItem[]>(items)
  const onItemClickRef = useRef(onItemClick)
  const onActiveItemsChangeRef = useRef(onActiveItemsChange)
  const interactionLockedRef = useRef(interactionLocked)

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.enablePan = false
    controls.enableRotate = false
    controls.enableZoom = false
    controls.enabled = false
    const targetPos = initialTarget ?? [0, CAMERA_EYE_HEIGHT, 0]
    controls.target.set(targetPos[0], targetPos[1], targetPos[2])
    camera.lookAt(new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]))
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

    const wall1930BaseMap = textureLoader.load('/assets/textures/scuffed_cement_diff_4k.jpg')
    wall1930BaseMap.colorSpace = THREE.SRGBColorSpace
    wall1930BaseMap.wrapS = THREE.RepeatWrapping
    wall1930BaseMap.wrapT = THREE.RepeatWrapping
    wall1930BaseMap.repeat.set(15.0, 15.0)

    const wall1930HeightMap = textureLoader.load('/assets/textures/scuffed_cement_disp_4k.png')
    wall1930HeightMap.wrapS = THREE.RepeatWrapping
    wall1930HeightMap.wrapT = THREE.RepeatWrapping
    wall1930HeightMap.repeat.copy(wall1930BaseMap.repeat)

    const floorNormalMap = textureLoader.load('/assets/textures/floor_normal.png')
    floorNormalMap.wrapS = THREE.RepeatWrapping
    floorNormalMap.wrapT = THREE.RepeatWrapping
    floorNormalMap.repeat.set(4, 4)

    const floor2030BaseMap = textureLoader.load('/assets/textures/granite_tile_diff_4k.jpg')
    floor2030BaseMap.colorSpace = THREE.SRGBColorSpace
    floor2030BaseMap.wrapS = THREE.RepeatWrapping
    floor2030BaseMap.wrapT = THREE.RepeatWrapping
    floor2030BaseMap.repeat.set(1, 1)

    const floor2030HeightMap = textureLoader.load('/assets/textures/granite_tile_disp_4k.png')
    floor2030HeightMap.wrapS = THREE.RepeatWrapping
    floor2030HeightMap.wrapT = THREE.RepeatWrapping
    floor2030HeightMap.repeat.set(1, 1)

    const floor1930BaseMap = textureLoader.load('/assets/textures/floor_1930_bedroom_basecolor.jpg')
    floor1930BaseMap.colorSpace = THREE.SRGBColorSpace
    floor1930BaseMap.wrapS = THREE.RepeatWrapping
    floor1930BaseMap.wrapT = THREE.RepeatWrapping
    floor1930BaseMap.repeat.set(4, 4)

    const floor1930HeightMap = textureLoader.load('/assets/textures/floor_1930_bedroom_height.png')
    floor1930HeightMap.wrapS = THREE.RepeatWrapping
    floor1930HeightMap.wrapT = THREE.RepeatWrapping
    floor1930HeightMap.repeat.set(4, 4)

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
    wallpaperMap.anisotropy = maxAnisotropy
    wallNormalMap.anisotropy = maxAnisotropy
    wallRoughnessMap.anisotropy = maxAnisotropy
    wallMetalnessMap.anisotropy = maxAnisotropy
    wall1930BaseMap.anisotropy = maxAnisotropy
    wall1930HeightMap.anisotropy = maxAnisotropy
    floorNormalMap.anisotropy = maxAnisotropy
    floor2030BaseMap.anisotropy = maxAnisotropy
    floor2030HeightMap.anisotropy = maxAnisotropy
    floor1930BaseMap.anisotropy = maxAnisotropy
    floor1930HeightMap.anisotropy = maxAnisotropy

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
      side: THREE.DoubleSide,
    })
    const wallAndCeilingMaterials: THREE.MeshStandardMaterial[] = [roomMaterial]
    if (scenePreset === 'practice') {
      const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE), roomMaterial)
      room.position.y = ROOM_HEIGHT / 2
      room.receiveShadow = true
      scene.add(room)
    } else {
      const wallThickness = 0.08
      const wallGroup = new THREE.Group()

      const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, ROOM_SIZE),
        roomMaterial,
      )
      westWall.position.set(-ROOM_SIZE / 2, ROOM_HEIGHT / 2, 0)
      wallGroup.add(westWall)

      const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, wallThickness),
        roomMaterial,
      )
      northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_SIZE / 2)
      wallGroup.add(northWall)

      // 南侧墙（z=8）开门洞：中心 x=-4，宽3，高7（通往厕所）
      const southTop = new THREE.Mesh(
        new THREE.BoxGeometry(3, ROOM_HEIGHT - 7, wallThickness),
        roomMaterial,
      )
      southTop.position.set(-4, 7 + (ROOM_HEIGHT - 7) / 2, ROOM_SIZE / 2)
      wallGroup.add(southTop)

      const southLeft = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, ROOM_HEIGHT, wallThickness),
        roomMaterial,
      )
      southLeft.position.set(-6.75, ROOM_HEIGHT / 2, ROOM_SIZE / 2)
      wallGroup.add(southLeft)

      const southRight = new THREE.Mesh(
        new THREE.BoxGeometry(10.5, ROOM_HEIGHT, wallThickness),
        roomMaterial,
      )
      southRight.position.set(2.75, ROOM_HEIGHT / 2, ROOM_SIZE / 2)
      wallGroup.add(southRight)

      const mainCeilingMaterial = new THREE.MeshStandardMaterial({
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
        side: THREE.FrontSide,
      })
      wallAndCeilingMaterials.push(mainCeilingMaterial)

      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
        mainCeilingMaterial,
      )
      ceiling.rotation.x = Math.PI / 2
      ceiling.position.set(0, ROOM_HEIGHT, 0)
      wallGroup.add(ceiling)

      // 东侧墙（x=8）开门洞：中心 z=-5，宽3，高7
      const eastTop = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT - 7, 3),
        roomMaterial,
      )
      eastTop.position.set(ROOM_SIZE / 2, 7 + (ROOM_HEIGHT - 7) / 2, -5)
      wallGroup.add(eastTop)

      const eastLeft = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, 1.5),
        roomMaterial,
      )
      eastLeft.position.set(ROOM_SIZE / 2, ROOM_HEIGHT / 2, -7.25)
      wallGroup.add(eastLeft)

      const eastRight = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, 11.5),
        roomMaterial,
      )
      eastRight.position.set(ROOM_SIZE / 2, ROOM_HEIGHT / 2, 2.25)
      wallGroup.add(eastRight)

      scene.add(wallGroup)
    }

    let extFloorMaterial: THREE.MeshStandardMaterial | null = null
    let kitchenDoorFrameMaterial: THREE.MeshStandardMaterial | null = null

    // Step2 三空间：主房间为卧室；厨房由(8,0,-5)门洞外扩6x5；厕所由(-5,0,8)门洞外扩6x6
    if (scenePreset === 'default') {
      const partitionMaterial = new THREE.MeshStandardMaterial({
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
      })
      wallAndCeilingMaterials.push(partitionMaterial)

      extFloorMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        map: floor2030BaseMap,
        bumpMap: floor2030HeightMap,
        bumpScale: 0.12,
        roughness: 0.95,
        metalness: 0.02,
      })

      // 厨房地面：8x10，整体沿 z 轴正方向平移 2（中心 z=-3）
      const kitchenFloor = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), extFloorMaterial)
      kitchenFloor.rotation.x = -Math.PI / 2
      kitchenFloor.position.set(12, 0.02, -3)
      kitchenFloor.receiveShadow = true
      scene.add(kitchenFloor)

      // 厨房天花板
      const kitchenCeilingMaterial = new THREE.MeshStandardMaterial({
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
        side: THREE.FrontSide,
      })
      wallAndCeilingMaterials.push(kitchenCeilingMaterial)

      const kitchenCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 10),
        kitchenCeilingMaterial,
      )
      kitchenCeiling.rotation.x = Math.PI / 2
      kitchenCeiling.position.set(12, ROOM_HEIGHT, -3)
      scene.add(kitchenCeiling)

      // 厕所地面：8x10，门洞中心调整为 x=-4
      const toiletFloor = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), extFloorMaterial)
      toiletFloor.rotation.x = -Math.PI / 2
      toiletFloor.position.set(-4, 0.02, 13)
      toiletFloor.receiveShadow = true
      scene.add(toiletFloor)

      // 厕所天花板
      const toiletCeilingMaterial = new THREE.MeshStandardMaterial({
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
        side: THREE.FrontSide,
      })
      wallAndCeilingMaterials.push(toiletCeilingMaterial)

      const toiletCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 10),
        toiletCeilingMaterial,
      )
      toiletCeiling.rotation.x = Math.PI / 2
      toiletCeiling.position.set(-4, ROOM_HEIGHT, 13)
      scene.add(toiletCeiling)

      const wallThickness = 0.12

      // 厨房外侧封闭墙（x=16）
      const kitchenOuterWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, 10),
        partitionMaterial,
      )
      kitchenOuterWall.position.set(16, ROOM_HEIGHT / 2, -3)
      scene.add(kitchenOuterWall)

      // 厨房上下侧墙（z=-8 和 z=2）
      const kitchenTopWall = new THREE.Mesh(
        new THREE.BoxGeometry(8, ROOM_HEIGHT, wallThickness),
        partitionMaterial,
      )
      kitchenTopWall.position.set(12, ROOM_HEIGHT / 2, -8)
      scene.add(kitchenTopWall)

      const kitchenBottomWall = new THREE.Mesh(
        new THREE.BoxGeometry(8, ROOM_HEIGHT, wallThickness),
        partitionMaterial,
      )
      kitchenBottomWall.position.set(12, ROOM_HEIGHT / 2, 2)
      scene.add(kitchenBottomWall)

      kitchenDoorFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xd3c9b6,
        roughness: 0.7,
        metalness: 0.05,
      })
      wallAndCeilingMaterials.push(kitchenDoorFrameMaterial)

      const kitchenDoorLintel = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.14, 3.15),
        kitchenDoorFrameMaterial,
      )
      kitchenDoorLintel.position.set(8.03, 7.02, -5)
      scene.add(kitchenDoorLintel)

      const kitchenDoorLeftPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 7, 0.1),
        kitchenDoorFrameMaterial,
      )
      kitchenDoorLeftPost.position.set(8.03, 3.5, -6.5)
      scene.add(kitchenDoorLeftPost)

      const kitchenDoorRightPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 7, 0.1),
        kitchenDoorFrameMaterial,
      )
      kitchenDoorRightPost.position.set(8.03, 3.5, -3.5)
      scene.add(kitchenDoorRightPost)

      // 卧室 -> 厕所门框（南侧墙 z=8，门洞中心 x=-4，宽3，高7）
      const toiletDoorLintel = new THREE.Mesh(
        new THREE.BoxGeometry(3.15, 0.14, 0.16),
        kitchenDoorFrameMaterial,
      )
      toiletDoorLintel.position.set(-4, 7.02, 8.03)
      scene.add(toiletDoorLintel)

      const toiletDoorLeftPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 7, 0.16),
        kitchenDoorFrameMaterial,
      )
      toiletDoorLeftPost.position.set(-5.5, 3.5, 8.03)
      scene.add(toiletDoorLeftPost)

      const toiletDoorRightPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 7, 0.16),
        kitchenDoorFrameMaterial,
      )
      toiletDoorRightPost.position.set(-2.5, 3.5, 8.03)
      scene.add(toiletDoorRightPost)

      // 厕所外侧封闭墙（z=18）
      const toiletOuterWall = new THREE.Mesh(
        new THREE.BoxGeometry(8, ROOM_HEIGHT, wallThickness),
        partitionMaterial,
      )
      toiletOuterWall.position.set(-4, ROOM_HEIGHT / 2, 18)
      scene.add(toiletOuterWall)

      // 厕所左右侧墙（x=-8 和 x=0）
      const toiletLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, 10),
        partitionMaterial,
      )
      toiletLeftWall.position.set(-8, ROOM_HEIGHT / 2, 13)
      scene.add(toiletLeftWall)

      const toiletRightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, ROOM_HEIGHT, 10),
        partitionMaterial,
      )
      toiletRightWall.position.set(0, ROOM_HEIGHT / 2, 13)
      scene.add(toiletRightWall)
    }

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: scenePreset === 'practice' ? 0x000000 : 0x8a8a8a,
      map: scenePreset === 'practice' ? null : floor2030BaseMap,
      normalMap: scenePreset === 'practice' ? null : floorNormalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      bumpMap: scenePreset === 'practice' ? null : floor2030HeightMap,
      bumpScale: scenePreset === 'practice' ? 0 : 0.12,
      roughness: scenePreset === 'practice' ? 1 : 0.92,
      metalness: 0.02,
    })
    let hasSwitchedFloorTo1930 = false
    let hasSwitchedWallsTo1930 = false

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
    if (scenePreset !== 'default') {
      scene.add(gridHelper)
    }

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

    const ceilingLight = new THREE.PointLight(0xfff4e8, 2.1, 28, 2)
    ceilingLight.position.set(0, ROOM_HEIGHT - 0.15, 0)
    // PointLight 阴影开销很高，这里关闭以提升性能
    ceilingLight.castShadow = false
    if (scenePreset !== 'default') {
      scene.add(ceilingLight)
    }

    const fillLight = new THREE.DirectionalLight(0xdde7ff, 1.05)
    fillLight.position.set(-4, 4, 5)
    // 仅保留一盏主阴影灯，显著降低阴影渲染成本
    fillLight.castShadow = true
    fillLight.shadow.mapSize.set(1024, 1024)
    fillLight.shadow.radius = 0
    fillLight.shadow.camera.left = -7
    fillLight.shadow.camera.right = 7
    fillLight.shadow.camera.top = 7
    fillLight.shadow.camera.bottom = -7
    fillLight.shadow.camera.near = 0.5
    fillLight.shadow.camera.far = 18
    fillLight.shadow.bias = -0.0001
    fillLight.shadow.normalBias = 0.012
    scene.add(fillLight)

    const frontFillLight = new THREE.DirectionalLight(0xffffff, 0.75)
    frontFillLight.position.set(5, 3, 6)
    frontFillLight.castShadow = false
    scene.add(frontFillLight)

    if (scenePreset !== 'default') {
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
    }

    const itemGroup = new THREE.Group()
    scene.add(itemGroup)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const clickableRoots: THREE.Object3D[] = []
    const visualsById = new Map<string, ItemVisual>()
    const slotById = new Map<string, number>()

    const gltfLoader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    gltfLoader.setDRACOLoader(dracoLoader)
    const modelCache = new Map<string, THREE.Object3D>()
    const historicModelCache = new Map<number, THREE.Object3D>()

    const loadGltfWithFallback = async (path: string) => {
      try {
        return await gltfLoader.loadAsync(path)
      } catch {
        const fileName = path.split('/').pop()
        if (!fileName) throw new Error('invalid model path')
        const backupPath = `/assets/models/_backup_original_glb/${fileName}`
        return await gltfLoader.loadAsync(backupPath)
      }
    }

    const loadModelIntoVisual = async (visual: ItemVisual) => {
      const config = itemConfigs[visual.slot]
      const modelPath2030 = config?.modelPath
      const modelPath1930 = config?.historicModelPath
      if (!config) return
      const activeModelPath = forceHistoricModels ? modelPath1930 : modelPath2030

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

      if (!activeModelPath) return

      try {
        const cacheKey = `${visual.slot}:${activeModelPath}`
        let model = modelCache.get(cacheKey)
        if (!model) {
          const gltf = await loadGltfWithFallback(activeModelPath)
          model = gltf.scene
          modelCache.set(cacheKey, model)
        }

        if (!visualsById.has(visual.id)) return

        const modelInstance = model.clone(true)
        const targetSize = forceHistoricModels ? (config.historicTargetSize ?? config.targetSize) : config.targetSize
        const rotX = forceHistoricModels ? (config.historicRotationX ?? config.rotationX ?? 0) : (config.rotationX ?? 0)
        const rotY = forceHistoricModels ? (config.historicRotationY ?? config.rotationY) : config.rotationY
        const rotZ = forceHistoricModels ? (config.historicRotationZ ?? config.rotationZ ?? 0) : (config.rotationZ ?? 0)
        fitModelToTarget(modelInstance, targetSize * modelScaleMultiplier * GLOBAL_MODEL_SCALE)
        modelInstance.rotation.x = rotX
        modelInstance.rotation.y = rotY
        modelInstance.rotation.z = rotZ

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

    const loadHistoricModelIntoVisual = async (visual: ItemVisual) => {
      if (scenePreset === 'practice') return
      const config = itemConfigs[visual.slot]
      if (!config || visual.futureModel || visual.hasSwitchedToHistoric || visual.loadingHistoricModel) return
      const historicPath = config.historicModelPath
      if (!historicPath) return

      visual.loadingHistoricModel = true

      try {
        let model = historicModelCache.get(visual.slot)
        if (!model) {
          const gltf = await loadGltfWithFallback(historicPath)
          model = gltf.scene
          historicModelCache.set(visual.slot, model)
        }

        if (!visualsById.has(visual.id)) return

        const modelInstance = model.clone(true)
        fitModelToTarget(
          modelInstance,
          (config.historicTargetSize ?? config.targetSize) * modelScaleMultiplier * GLOBAL_MODEL_SCALE,
        )
        modelInstance.rotation.x = config.historicRotationX ?? config.rotationX ?? 0
        modelInstance.rotation.y = config.historicRotationY ?? config.rotationY
        modelInstance.rotation.z = config.historicRotationZ ?? config.rotationZ ?? 0

        if (config.historicPosition) {
          const [hx, hy, hz] = config.historicPosition
          visual.root.position.set(hx, hy, hz)
          visual.baseY = hy
        }

        const fittedScale = modelInstance.scale.x
        modelInstance.userData.fittedScale = fittedScale
        modelInstance.scale.setScalar(fittedScale * 0.001)
        visual.root.add(modelInstance)
        visual.futureModel = modelInstance
        visual.transitioningToHistoric = true
      } catch {
        // ignore historic model load failure
      } finally {
        visual.loadingHistoricModel = false
      }
    }

    const createItemVisual = (item: SceneItem, slot: number) => {
      const config = itemConfigs[slot]
      if (!config) return
      const rootPos = forceHistoricModels && config.historicPosition ? config.historicPosition : config.position
      const [x, y, z] = rootPos
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

      const glowHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 28, 28),
        new THREE.MeshBasicMaterial({
          color: '#ffd84d',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      )
      glowHalo.visible = false
      root.add(glowHalo)

      const targetSize = itemConfigs[slot]?.targetSize ?? 1
      const haloBaseScale = THREE.MathUtils.clamp(0.62 + targetSize * 0.06, 0.72, 1.15)
      const haloPulseAmplitude = THREE.MathUtils.clamp(0.06 + targetSize * 0.012, 0.07, 0.15)

      const isInteractive = !item.id.includes('-nonitr-')

      const visual: ItemVisual = {
        id: item.id,
        slot,
        root,
        clickable: placeholder,
        placeholder,
        emissiveMaterials: [],
        glowHalo,
        haloBaseScale,
        haloPulseAmplitude,
        suppressAnsweredGreen,
        answered: item.answered,
        active: false,
        isInteractive,
        baseY: y,
        futureModel: null,
        transitioningToHistoric: false,
        hasSwitchedToHistoric: false,
        loadingHistoricModel: false,
      }

      visualsById.set(item.id, visual)
      clickableRoots.push(root)
      loadModelIntoVisual(visual)
      updateVisualAppearance(visual)
    }

    itemsRef.current.forEach((item, index) => {
      const slot = item.slotOverride ?? (index % itemConfigs.length)
      slotById.set(item.id, slot)
      createItemVisual(item, slot)
    })

    if (renderUnusedSlots) {
      // 对于配置中未被题目 items 占用的槽位，也渲染为静态模型，便于手动调参预览
      const usedSlots = new Set<number>(Array.from(slotById.values()))
      itemConfigs.forEach((_, slot) => {
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
    }

    const moveState = { KeyW: false, KeyA: false, KeyS: false, KeyD: false }
    const moveSpeed = 4
    const lookState = { active: false, lastX: 0, lastY: 0 }
    const yawPitch = new THREE.Euler(0, 0, 0, 'YXZ')
    const rotateSensitivity = 0.0025

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

      if (lookState.active) {
        const deltaX = event.clientX - lookState.lastX
        const deltaY = event.clientY - lookState.lastY
        lookState.lastX = event.clientX
        lookState.lastY = event.clientY

        yawPitch.setFromQuaternion(camera.quaternion)
        yawPitch.y -= deltaX * rotateSensitivity
        yawPitch.x -= deltaY * rotateSensitivity
        yawPitch.x = THREE.MathUtils.clamp(yawPitch.x, -Math.PI / 2.2, Math.PI / 2.2)
        camera.quaternion.setFromEuler(yawPitch)
        return
      }

      const hoveredItemId = resolveHoveredItemId(event)
      if (!hoveredItemId) {
        renderer.domElement.style.cursor = 'default'
        return
      }

      const visual = visualsById.get(hoveredItemId)
      const isClickable = Boolean(visual && visual.isInteractive && !visual.answered && visual.active)
      renderer.domElement.style.cursor = isClickable ? 'pointer' : 'default'
    }

    const onMouseDown = (event: MouseEvent) => {
      if (interactionLockedRef.current) return
      if (event.button !== 0) return
      lookState.active = true
      lookState.lastX = event.clientX
      lookState.lastY = event.clientY
      renderer.domElement.style.cursor = 'grabbing'
    }

    const onMouseUp = () => {
      lookState.active = false
      renderer.domElement.style.cursor = 'default'
    }

    const onClick = (event: MouseEvent) => {
      if (interactionLockedRef.current) return
      if (lookState.active) return
      const targetItemId = resolveHoveredItemId(event)
      if (!targetItemId) return
      const visual = visualsById.get(targetItemId)
      if (!visual || !visual.isInteractive || visual.answered || !visual.active) return
      onItemClickRef.current(targetItemId)
    }

    let raf = 0
    const clock = new THREE.Clock()
    let lastActiveIdsKey = ''
    let lastValidCameraX = camera.position.x
    let lastValidCameraZ = camera.position.z

    const isMovementBlocked = (prevX: number, prevZ: number, nextX: number, nextZ: number) => {
      const PLAYER_RADIUS = 0.22
      // 外墙留碰撞半径，室内分区交界处不留缝隙，避免门洞被“卡死”
      const inBedroom =
        nextX >= -8 + PLAYER_RADIUS &&
        nextX <= 8 &&
        nextZ >= -8 + PLAYER_RADIUS &&
        nextZ <= 8
      const inKitchen =
        nextX >= 8 &&
        nextX <= 16 - PLAYER_RADIUS &&
        nextZ >= -8 + PLAYER_RADIUS &&
        nextZ <= 2 - PLAYER_RADIUS
      const inToilet =
        nextX >= -8 + PLAYER_RADIUS &&
        nextX <= 0 - PLAYER_RADIUS &&
        nextZ >= 8 &&
        nextZ <= 18 - PLAYER_RADIUS

      const isCrossingKitchenWall =
        (prevX <= 8 && nextX > 8) || (prevX >= 8 && nextX < 8)
      const canPassKitchenDoor = nextZ >= -6.5 && nextZ <= -3.5

      const isCrossingToiletWall =
        (prevZ <= 8 && nextZ > 8) || (prevZ >= 8 && nextZ < 8)
      const canPassToiletDoor = nextX >= -5.5 && nextX <= -2.5

      if (!(inBedroom || inKitchen || inToilet)) return true
      if (isCrossingKitchenWall && !canPassKitchenDoor) return true
      if (isCrossingToiletWall && !canPassToiletDoor) return true
      return false
    }

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

        const prevCameraX = camera.position.x
        const prevCameraZ = camera.position.z
        const nextX = THREE.MathUtils.clamp(prevCameraX + movement.x, -8.2, 16)
        const nextZ = THREE.MathUtils.clamp(prevCameraZ + movement.z, -8.2, 18)

        if (!isMovementBlocked(prevCameraX, prevCameraZ, nextX, nextZ)) {
          camera.position.set(nextX, camera.position.y, nextZ)
          lastValidCameraX = nextX
          lastValidCameraZ = nextZ
        }
      }

      const elapsed = clock.elapsedTime

      visualsById.forEach((visual) => {
        visual.root.position.y = visual.baseY

        // 仅按 (x, z) 平面上的直线距离判定可交互范围
        const dx = camera.position.x - visual.root.position.x
        const dz = camera.position.z - visual.root.position.z
        const planarDistance = Math.hypot(dx, dz)
        visual.active = visual.isInteractive && !visual.answered && planarDistance <= INTERACT_DISTANCE

        const haloMat = visual.glowHalo.material as THREE.MeshBasicMaterial
        if (visual.active && !visual.answered) {
          const pulse = (Math.sin(elapsed * 4.2) + 1) / 2
          const scale = visual.haloBaseScale + pulse * visual.haloPulseAmplitude
          visual.glowHalo.scale.setScalar(scale)
          haloMat.opacity = 0.1 + pulse * 0.1
        }

        if (!forceHistoricModels && visual.answered && !visual.futureModel && !visual.hasSwitchedToHistoric) {
          void loadHistoricModelIntoVisual(visual)
        }

        if (!forceHistoricModels && visual.transitioningToHistoric && visual.clickable) {
          const transitionSpeed = visual.isInteractive ? 1.8 : 0.4
          const currentScale = visual.clickable.scale.x
          const nextScale = Math.max(0.001, currentScale - delta * transitionSpeed)
          visual.clickable.scale.setScalar(nextScale)

          if (visual.futureModel) {
            const targetScale = (visual.futureModel.userData.fittedScale as number) ?? 1
            const histScale = Math.min(targetScale, visual.futureModel.scale.x + delta * transitionSpeed)
            visual.futureModel.scale.setScalar(histScale)

            if (histScale >= targetScale && nextScale <= 0.02) {
              visual.root.remove(visual.clickable)
              visual.clickable.traverse((obj) => {
                const mesh = obj as THREE.Mesh
                if (!mesh.isMesh) return
                mesh.geometry.dispose()
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((m) => m.dispose())
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

        updateVisualAppearance(visual)
      })

      const allAnswered =
        scenePreset === 'default' &&
        Array.from(visualsById.values())
          .filter((visual) => !visual.id.startsWith(EXTRA_ITEM_ID_PREFIX)).length > 0 &&
        Array.from(visualsById.values())
          .filter((visual) => !visual.id.startsWith(EXTRA_ITEM_ID_PREFIX))
          .every((visual) => visual.answered)

      if (allAnswered) {
        roomMaterial.emissiveIntensity = THREE.MathUtils.lerp(roomMaterial.emissiveIntensity, 0.28, 0.02)

        if (!hasSwitchedWallsTo1930) {
          wallAndCeilingMaterials.forEach((material) => {
            material.map = wall1930BaseMap
            material.normalMap = null
            material.roughnessMap = null
            material.metalnessMap = null
            material.bumpMap = wall1930HeightMap
            material.bumpScale = 0.16
            material.roughness = 0.88
            material.metalness = 0.03
            material.emissive.set('#1a140d')
            material.emissiveIntensity = 0.06
            material.needsUpdate = true
          })

          if (kitchenDoorFrameMaterial) {
            const doorFrameMap = wall1930BaseMap.clone()
            doorFrameMap.needsUpdate = true
            doorFrameMap.wrapS = THREE.RepeatWrapping
            doorFrameMap.wrapT = THREE.RepeatWrapping
            doorFrameMap.repeat.set(3, 3)

            const doorFrameBumpMap = wall1930HeightMap.clone()
            doorFrameBumpMap.needsUpdate = true
            doorFrameBumpMap.wrapS = THREE.RepeatWrapping
            doorFrameBumpMap.wrapT = THREE.RepeatWrapping
            doorFrameBumpMap.repeat.set(3, 3)

            kitchenDoorFrameMaterial.map = doorFrameMap
            kitchenDoorFrameMaterial.bumpMap = doorFrameBumpMap
            kitchenDoorFrameMaterial.bumpScale = 0.16
            kitchenDoorFrameMaterial.roughness = 0.88
            kitchenDoorFrameMaterial.metalness = 0.03
            kitchenDoorFrameMaterial.emissive.set('#1a140d')
            kitchenDoorFrameMaterial.emissiveIntensity = 0.06
            kitchenDoorFrameMaterial.needsUpdate = true
          }
          hasSwitchedWallsTo1930 = true
        }

        if (!hasSwitchedFloorTo1930) {
          floorMaterial.map = floor1930BaseMap
          floorMaterial.bumpMap = floor1930HeightMap
          floorMaterial.bumpScale = 0.22
          floorMaterial.needsUpdate = true

          if (extFloorMaterial) {
            extFloorMaterial.map = floor1930BaseMap
            extFloorMaterial.bumpMap = floor1930HeightMap
            extFloorMaterial.bumpScale = 0.22
            extFloorMaterial.needsUpdate = true
          }

          hasSwitchedFloorTo1930 = true
        }

        floorMaterial.color.lerp(new THREE.Color('#6a6a6a'), 0.02)
        if (extFloorMaterial) {
          extFloorMaterial.color.lerp(new THREE.Color('#6a6a6a'), 0.02)
        }
      }

      const activeIds = Array.from(visualsById.values())
        .filter((visual) => visual.active && !visual.id.startsWith(EXTRA_ITEM_ID_PREFIX))
        .map((visual) => visual.id)
        .sort()
      const activeIdsKey = activeIds.join('|')
      if (activeIdsKey !== lastActiveIdsKey) {
        lastActiveIdsKey = activeIdsKey
        onActiveItemsChangeRef.current?.(activeIds)
      }

      // OrbitControls 已禁用，仅保留手写视角/位移控制
      renderer.render(scene, camera)
    }

    animate()

    const onResize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blurReset)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
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

      controls.dispose()
      pmremGenerator.dispose()
      envRT.dispose()
      dracoLoader.dispose()

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
      const slot = core.slotById.get(item.id) ?? item.slotOverride ?? (index % itemConfigs.length)
      if (!core.slotById.has(item.id)) {
        core.slotById.set(item.id, slot)
      }

      const visual = core.visualsById.get(item.id)
      if (!visual) return

      visual.answered = item.answered
      visual.isInteractive = !item.id.includes('-nonitr-')
      if (visual.answered || !visual.isInteractive) {
        visual.active = false
      }

      // 03 题特殊规则：A/B 同题时，B 模型答题后直接退场，不再生成历史模型
      if (item.id === 'holographic-projector-buddy') {
        visual.root.visible = !item.answered
      }
    })
  }, [items])

  return <div className="three-mount" ref={mountRef} />
}
