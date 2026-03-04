import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

type SceneItem = {
  id: string
  name: string
  answered: boolean
}

type ThreeSceneProps = {
  items: SceneItem[]
  onItemClick: (id: string) => void
}

const ROOM_SIZE = 16
const INTERACT_DISTANCE = 2.4
const ITEM_POSITIONS: [number, number, number][] = [
  [-5, 0.7, -2],
  [-2.5, 0.7, -4],
  [0, 0.7, -3],
  [2.8, 0.7, -4.6],
  [5, 0.7, -2],
  [-5, 0.7, 2],
  [-2, 0.7, 3],
  [1.2, 0.7, 2.6],
  [4.3, 0.7, 3.1],
  [0, 0.7, 5.2],
]

type ItemVisual = {
  id: string
  base: THREE.Mesh
  core: THREE.Mesh
  index: number
}

type SceneContext = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  pmremGenerator: THREE.PMREMGenerator
  envRT: THREE.WebGLRenderTarget
  itemGroup: THREE.Group
  itemVisuals: Map<string, ItemVisual>
  slotById: Map<string, number>
  clickableMeshes: THREE.Mesh[]
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  raf: number
  clock: THREE.Clock
}

export default function ThreeScene({ items, onItemClick }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneCtxRef = useRef<SceneContext | null>(null)
  const onItemClickRef = useRef(onItemClick)

  onItemClickRef.current = onItemClick

  const syncItemsToScene = (sceneCtx: SceneContext, latestItems: SceneItem[]) => {
    const { itemVisuals, itemGroup, clickableMeshes, slotById } = sceneCtx
    const nextIds = new Set(latestItems.map((item) => item.id))

    for (const [id, visual] of itemVisuals.entries()) {
      if (!nextIds.has(id)) {
        itemGroup.remove(visual.base)
        itemGroup.remove(visual.core)

        visual.base.geometry.dispose()
        ;(visual.base.material as THREE.Material).dispose()
        visual.core.geometry.dispose()
        ;(visual.core.material as THREE.Material).dispose()

        itemVisuals.delete(id)
        slotById.delete(id)
        const meshIndex = clickableMeshes.indexOf(visual.core)
        if (meshIndex !== -1) clickableMeshes.splice(meshIndex, 1)
      }
    }

    latestItems.forEach((item, index) => {
      const existed = itemVisuals.get(item.id)
      const slot = slotById.get(item.id) ?? (index % ITEM_POSITIONS.length)
      if (!slotById.has(item.id)) {
        slotById.set(item.id, slot)
      }
      const [x, y, z] = ITEM_POSITIONS[slot]

      if (!existed) {
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.75, 0.16, 24),
          new THREE.MeshStandardMaterial({
            color: 0x2e3445,
            roughness: 0.65,
            metalness: 0.2,
          }),
        )
        base.position.set(x, 0.08, z)
        base.castShadow = true
        base.receiveShadow = true
        itemGroup.add(base)

        const core = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.9),
          new THREE.MeshStandardMaterial({
            color: item.answered ? '#2be694' : '#f7fbff',
            emissive: item.answered ? '#1a8f62' : '#2f364a',
            emissiveIntensity: item.answered ? 0.6 : 0.08,
            roughness: 0.5,
            metalness: 0.1,
          }),
        )
        core.position.set(x, y, z)
        core.castShadow = true
        core.receiveShadow = true
        core.userData = {
          itemId: item.id,
          answered: item.answered,
          active: false,
          baseY: y,
        }
        itemGroup.add(core)
        clickableMeshes.push(core)

        itemVisuals.set(item.id, { id: item.id, base, core, index: slot })
        return
      }

      existed.index = slot
      existed.base.position.set(x, 0.08, z)
      existed.core.position.set(x, y, z)
      existed.core.userData.itemId = item.id
      existed.core.userData.answered = item.answered
      existed.core.userData.baseY = y
    })
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x202533)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(4, 3, 6)

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
    controls.target.set(0, 1.2, 0)
    controls.update()

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture

    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9b1a2,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.BackSide,
    })
    const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, 8, ROOM_SIZE), roomMaterial)
    room.position.y = 4
    room.receiveShadow = true
    scene.add(room)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
      new THREE.MeshStandardMaterial({
        color: 0x6a5f52,
        roughness: 0.95,
        metalness: 0.02,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.03
    floor.receiveShadow = true
    scene.add(floor)

    const gridHelper = new THREE.GridHelper(ROOM_SIZE, 16, 0xffffff, 0x7a7a7a)
    gridHelper.position.y = 0.03
    scene.add(gridHelper)

    const ambientLight = new THREE.AmbientLight(0xfff2dc, 0.7)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xbfd7ff, 0x6d5f50, 0.85)
    scene.add(hemiLight)

    const ceilingLight = new THREE.PointLight(0xfff4e8, 2.4, 28, 2)
    ceilingLight.position.set(0, 7.85, 0)
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
    const clickableMeshes: THREE.Mesh[] = []
    const itemVisuals = new Map<string, ItemVisual>()
    const slotById = new Map<string, number>()

    const sceneCtx: SceneContext = {
      scene,
      camera,
      renderer,
      controls,
      pmremGenerator,
      envRT,
      itemGroup,
      itemVisuals,
      slotById,
      clickableMeshes,
      raycaster,
      pointer,
      raf: 0,
      clock: new THREE.Clock(),
    }

    sceneCtxRef.current = sceneCtx
    syncItemsToScene(sceneCtx, items)

    const moveState = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
    }
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
      const hit = raycaster.intersectObjects(clickableMeshes)[0]
      if (!hit) return

      const target = hit.object as THREE.Mesh
      const targetItemId = target.userData?.itemId as string | undefined
      const answered = Boolean(target.userData?.answered)
      const active = Boolean(target.userData?.active)

      if (!targetItemId || answered || !active) return
      onItemClickRef.current(targetItemId)
    }

    const animate = () => {
      sceneCtx.raf = requestAnimationFrame(animate)
      const delta = sceneCtx.clock.getDelta()

      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() > 0) {
        forward.normalize()
      }

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

      clickableMeshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshStandardMaterial
        const answered = Boolean(mesh.userData.answered)
        const baseY = Number(mesh.userData.baseY ?? 0.7)
        const visual = itemVisuals.get(String(mesh.userData.itemId))
        const phase = (visual?.index ?? 0) + sceneCtx.clock.elapsedTime * 2

        if (answered) {
          material.color.set('#2be694')
          material.emissive.set('#1a8f62')
          material.emissiveIntensity = 0.6
          return
        }

        mesh.rotation.y += 0.006
        mesh.position.y = baseY + Math.sin(phase) * 0.035

        const flatCameraPos = new THREE.Vector3(camera.position.x, baseY, camera.position.z)
        const distance = mesh.position.distanceTo(flatCameraPos)
        const inRange = distance <= INTERACT_DISTANCE

        mesh.userData.active = inRange

        if (inRange) {
          material.color.set('#fff4c4')
          material.emissive.set('#ffd84d')
          material.emissiveIntensity = 0.85
        } else {
          material.color.set('#f7fbff')
          material.emissive.set('#2f364a')
          material.emissiveIntensity = 0.08
        }
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

    return () => {
      cancelAnimationFrame(sceneCtx.raf)
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

      renderer.dispose()
      mount.innerHTML = ''
      sceneCtxRef.current = null
    }
  }, [])

  useEffect(() => {
    const sceneCtx = sceneCtxRef.current
    if (!sceneCtx) return

    syncItemsToScene(sceneCtx, items)
  }, [items])

  return <div className="three-mount" ref={mountRef} />
}
