import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202533);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4, 3, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.update();

const moveState = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
};
const moveSpeed = 4;

const keyIndicator = document.createElement('div');
keyIndicator.style.position = 'fixed';
keyIndicator.style.left = '16px';
keyIndicator.style.bottom = '16px';
keyIndicator.style.padding = '10px 12px';
keyIndicator.style.borderRadius = '10px';
keyIndicator.style.background = 'rgba(0, 0, 0, 0.55)';
keyIndicator.style.color = '#f5f5f5';
keyIndicator.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
keyIndicator.style.fontSize = '13px';
keyIndicator.style.lineHeight = '1.4';
keyIndicator.style.pointerEvents = 'none';
keyIndicator.style.userSelect = 'none';
keyIndicator.style.zIndex = '9999';
keyIndicator.textContent = '按键: 无';
document.body.appendChild(keyIndicator);

function updateKeyIndicator(extra = '') {
  const pressed = [];
  if (moveState.KeyW) pressed.push('W');
  if (moveState.KeyA) pressed.push('A');
  if (moveState.KeyS) pressed.push('S');
  if (moveState.KeyD) pressed.push('D');

  const keyText = pressed.length > 0 ? pressed.join(' + ') : '无';
  keyIndicator.textContent = `按键: ${keyText}${extra}`;
}

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envRT.texture;
scene.environmentIntensity = 1.15;
pmremGenerator.dispose();

// 室内环境
const roomMaterial = new THREE.MeshStandardMaterial({
  color: 0xb9b1a2,
  roughness: 0.9,
  metalness: 0.05,
  side: THREE.BackSide,
});
const room = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 16), roomMaterial);
room.position.y = 4;
room.receiveShadow = true;
scene.add(room);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 16),
  new THREE.MeshStandardMaterial({
    color: 0x6a5f52,
    roughness: 0.95,
    metalness: 0.02,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.03;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(16, 16, 0xffffff, 0x7a7a7a);
gridHelper.position.y = 0.03;
scene.add(gridHelper);

// 灯光
const ambientLight = new THREE.AmbientLight(0xfff2dc, 0.7);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xbfd7ff, 0x6d5f50, 0.85);
scene.add(hemiLight);

const ceilingLight = new THREE.PointLight(0xfff4e8, 2.4, 28, 2);
ceilingLight.position.set(0, 7.85, 0);
ceilingLight.castShadow = true;
ceilingLight.shadow.mapSize.set(1024, 1024);
scene.add(ceilingLight);

const fillLight = new THREE.DirectionalLight(0xdde7ff, 1.1);
fillLight.position.set(-4, 4, 5);
scene.add(fillLight);

const frontFillLight = new THREE.DirectionalLight(0xffffff, 0.8);
frontFillLight.position.set(5, 3, 6);
scene.add(frontFillLight);

const lampShade = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.55, 0.6, 24, 1, true),
  new THREE.MeshStandardMaterial({
    color: 0xf2e6cc,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
  })
);
lampShade.position.copy(ceilingLight.position);
lampShade.position.y -= 0.2;
scene.add(lampShade);

// 模型容器（替代原方块）
const modelGroup = new THREE.Group();
modelGroup.position.y = 3;
scene.add(modelGroup);

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const mixers = [];

function setupModelToCenter(model, targetSize = 2.2) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxAxis;
  model.scale.setScalar(scale);

  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            if (mat) {
              mat.envMapIntensity = 1.25;
              mat.needsUpdate = true;
            }
          });
        } else {
          obj.material.envMapIntensity = 1.25;
          obj.material.needsUpdate = true;
        }
      }
    }
  });
}

loader.load(
  './assets/models/1930_time_spray.glb',
  (gltf) => {
    const model = gltf.scene;
    setupModelToCenter(model, 2.2);
    modelGroup.add(model);
  },
  undefined,
  (error) => {
    console.error('1930_time_spray.glb 加载失败：', error);
  }
);

const trumpetGroup = new THREE.Group();
scene.add(trumpetGroup);

let trumpetHalfHeight = 0;
let tableTopY = null;
let tablePlaced = false;

function updateTrumpetOnTablePlacement() {
  if (!tablePlaced || tableTopY === null || trumpetHalfHeight <= 0) return;

  trumpetGroup.position.set(
    tableGroup.position.x,
    tableTopY + trumpetHalfHeight - 2.5,
    tableGroup.position.z
  );
}

loader.load(
  './assets/models/1930_trumpet.glb',
  (gltf) => {
    const trumpet = gltf.scene;
    setupModelToCenter(trumpet, 1.8);
    trumpet.rotation.y = Math.PI * -0.5;

    const trumpetBox = new THREE.Box3().setFromObject(trumpet);
    const trumpetSize = trumpetBox.getSize(new THREE.Vector3());
    trumpetHalfHeight = trumpetSize.y * 0.5;

    trumpetGroup.add(trumpet);
    updateTrumpetOnTablePlacement();
  },
  undefined,
  (error) => {
    console.error('1930_trumpet.glb 加载失败：', error);
  }
);

const heatingGroup = new THREE.Group();
scene.add(heatingGroup);

loader.load(
  './assets/models/1930_heating.glb',
  (gltf) => {
    const heating = gltf.scene;
    setupModelToCenter(heating, 3.2);
    heating.rotation.y = Math.PI * 0.5;

    const heatingBox = new THREE.Box3().setFromObject(heating);
    const heatingSize = heatingBox.getSize(new THREE.Vector3());

    const floorY = floor.position.y;
    const leftWallX = -8;
    const wallGap = 0.03;

    heatingGroup.position.set(
      leftWallX + heatingSize.x * 0.5 + wallGap,
      floorY + heatingSize.y * 0.5,
      -1.6
    );

    heatingGroup.add(heating);
  },
  undefined,
  (error) => {
    console.error('1930_heating.glb 加载失败：', error);
  }
);

const doorGroup = new THREE.Group();
scene.add(doorGroup);

loader.load(
  './assets/models/1930_door.glb',
  (gltf) => {
    const door = gltf.scene;
    setupModelToCenter(door, 5.4);
    door.rotation.y = -Math.PI * 0.5;

    const doorBox = new THREE.Box3().setFromObject(door);
    const doorSize = doorBox.getSize(new THREE.Vector3());

    const floorY = floor.position.y;
    const rightWallX = 8;
    const wallGap = 0.03;

    const overflowX = 0.8;
    doorGroup.position.set(
      rightWallX - doorSize.x * 0.5 - wallGap + overflowX,
      floorY + doorSize.y * 0.5,
      1.2
    );

    doorGroup.add(door);
  },
  undefined,
  (error) => {
    console.error('1930_door.glb 加载失败：', error);
  }
);

const tableGroup = new THREE.Group();
scene.add(tableGroup);

loader.load(
  './assets/models/1930_table.glb',
  (gltf) => {
    const table = gltf.scene;
    setupModelToCenter(table, 6.0);
    table.rotation.y = 0;

    const tableBox = new THREE.Box3().setFromObject(table);
    const tableSize = tableBox.getSize(new THREE.Vector3());

    const floorY = floor.position.y;
    const rightWallX = 8;
    const oppositeWallZ = -8;
    const wallGap = 0.06;

    tableGroup.position.set(
      rightWallX - tableSize.x * 0.5 - wallGap,
      floorY + tableSize.y * 0.5,
      oppositeWallZ + tableSize.z * 0.5 + wallGap
    );

    tableTopY = floorY + tableSize.y;
    tablePlaced = true;

    tableGroup.add(table);
    updateTrumpetOnTablePlacement();
  },
  undefined,
  (error) => {
    console.error('1930_table.glb 加载失败：', error);
  }
);


const settings = {
  autoRotate: true,
  rotateSpeedX: 0.008,
  rotateSpeedY: 0.01,
  rotateSpeedZ: 0.006,
  ambientIntensity: ambientLight.intensity,
  hemisphereIntensity: hemiLight.intensity,
  ceilingIntensity: ceilingLight.intensity,
  fillIntensity: fillLight.intensity,
  frontFillIntensity: frontFillLight.intensity,
  envIntensity: scene.environmentIntensity,
  exposure: renderer.toneMappingExposure,
  showGrid: true,
};

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    settings.autoRotate = !settings.autoRotate;
    updateKeyIndicator(` ｜ 旋转: ${settings.autoRotate ? '开' : '关'}`);
    return;
  }

  if (event.code in moveState) {
    event.preventDefault();
    moveState[event.code] = true;
    updateKeyIndicator();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code in moveState) {
    event.preventDefault();
    moveState[event.code] = false;
    updateKeyIndicator();
  }
});

window.addEventListener('blur', () => {
  Object.keys(moveState).forEach((key) => {
    moveState[key] = false;
  });
  updateKeyIndicator();
});

const gui = new GUI({ title: 'Scene Controls' });
const rotateFolder = gui.addFolder('Rotation');
rotateFolder.add(settings, 'autoRotate').name('Auto Rotate');
rotateFolder.add(settings, 'rotateSpeedX', -0.1, 0.1, 0.001).name('X Speed');
rotateFolder.add(settings, 'rotateSpeedY', -0.1, 0.1, 0.001).name('Y Speed');
rotateFolder.add(settings, 'rotateSpeedZ', -0.1, 0.1, 0.001).name('Z Speed');

const lightFolder = gui.addFolder('Lights');
lightFolder
  .add(settings, 'ambientIntensity', 0, 2, 0.01)
  .name('Ambient')
  .onChange((value) => {
    ambientLight.intensity = value;
  });
lightFolder
  .add(settings, 'hemisphereIntensity', 0, 2, 0.01)
  .name('Hemisphere')
  .onChange((value) => {
    hemiLight.intensity = value;
  });
lightFolder
  .add(settings, 'ceilingIntensity', 0, 6, 0.01)
  .name('Ceiling')
  .onChange((value) => {
    ceilingLight.intensity = value;
  });
lightFolder
  .add(settings, 'fillIntensity', 0, 3, 0.01)
  .name('Fill')
  .onChange((value) => {
    fillLight.intensity = value;
  });
lightFolder
  .add(settings, 'frontFillIntensity', 0, 3, 0.01)
  .name('Front Fill')
  .onChange((value) => {
    frontFillLight.intensity = value;
  });
lightFolder
  .add(settings, 'envIntensity', 0, 3, 0.01)
  .name('Environment')
  .onChange((value) => {
    scene.environmentIntensity = value;
  });
lightFolder
  .add(settings, 'exposure', 0.3, 2.5, 0.01)
  .name('Exposure')
  .onChange((value) => {
    renderer.toneMappingExposure = value;
  });

const helperFolder = gui.addFolder('Helpers');
helperFolder
  .add(settings, 'showGrid')
  .name('Show Grid')
  .onChange((value) => {
    gridHelper.visible = value;
  });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (settings.autoRotate) {
    modelGroup.rotation.x += settings.rotateSpeedX;
    modelGroup.rotation.y += settings.rotateSpeedY;
    modelGroup.rotation.z += settings.rotateSpeedZ;
  }

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() > 0) forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const movement = new THREE.Vector3();

  if (moveState.KeyW) movement.add(forward);
  if (moveState.KeyS) movement.sub(forward);
  if (moveState.KeyA) movement.sub(right);
  if (moveState.KeyD) movement.add(right);

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(moveSpeed * delta);

    camera.position.add(movement);
    controls.target.add(movement);
  }

  mixers.forEach((mixer) => mixer.update(delta));

  controls.update();
  renderer.render(scene, camera);
}

animate();
