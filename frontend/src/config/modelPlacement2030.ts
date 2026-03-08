// 调参说明（2030）
// 1) position: [x, y, z] 控制模型在场景中的世界坐标位置。
// 2) targetSize: 模型自动归一化后的目标尺寸（越大模型看起来越大）。
// 3) rotationX / rotationY / rotationZ: 三轴旋转（单位：弧度）。
//    - 常用角度换算：90° = Math.PI / 2，180° = Math.PI，45° = Math.PI / 4。
// 4) 建议流程：先调 position，再调 targetSize，最后微调 rotation。
// 5) 预览页面：
//    - 2030 初始场景：http://localhost:5？？？/?step=formal
//    - 1930 终态场景：http://localhost:5？？？/?step=formal&all1930=1
// 6) 该文件仅维护“2030 初始场景”参数；1930 终态参数请改 modelPlacement1930.ts。

export type ModelPlacement2030 = {
  modelPath: string
  position: [number, number, number]
  targetSize: number
  rotationX: number
  rotationY: number
  rotationZ: number
}

export const MODEL_PLACEMENT_2030: ModelPlacement2030[] = [
  {
    modelPath: '/assets/models/itr_09_2030_airConditioner_bedroom.glb',
    position: [-7.5, 6, 4],
    targetSize: 6,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_08_2030_coffeeMachine_bedroom.glb',
    position: [-7, 2, -7],
    targetSize: 3.2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_07_2030_roboticTree_bedroom.glb',
    position: [1, 0, -6],
    targetSize: 6.2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_07_2030_digitalWallet_bedroom.glb',
    position: [-2, 1, 5.4],
    targetSize: 1.1,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_06_2030_frontDoor_bedroom.glb',
    position: [6, 0, -8],
    targetSize: 8,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_06_2030_smartPhone_bedroom.glb',
    position: [-6, 2, -5],
    targetSize: 1.2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_05_2030_laptop_bedroom.glb',
    position: [-4, 2, -5.6],
    targetSize: 2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_02_2030_soundbox_bedroom.glb',
    position: [-6.8, 6, -7.5],
    targetSize: 2.4,
    rotationX: 0,
    rotationY: 0.5,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_01_2030_table_bedroom.glb',
    position: [-4.8, 0, -5.7],
    targetSize: 7,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_01_2030_spray_bedroom.glb',
    position: [-3, 1.45, 5.5],
    targetSize: 1.5,
    rotationX: 0,
    rotationY: 0,
    rotationZ: -Math.PI / 2,
  },
  {
    modelPath: '/assets/models/nonitr_04_2030_chair_bedroom.glb',
    position: [-5, 0, -1.5],
    targetSize: 4,
    rotationX: 0,
    rotationY: (Math.PI * 5) / 6,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_05_2030_sofa_bedroom.glb',
    position: [-6.5, 0, 4.5],
    targetSize: 6.5,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_02_2030_bed_bedroom.glb',
    position: [4.6, 0, 4.6],
    targetSize: 7.5,
    rotationX: 0,
    rotationY: -Math.PI,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_03_2030_teaTable_bedroom.glb',
    position: [-2.5, 0, 4.5],
    targetSize: 4,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_10_2030_electricLighter_bedroom.glb',
    position: [-5.8,0.97, 3.5],
    targetSize: 0.8,
    rotationX: 0,
    rotationY: Math.PI / 5,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_03_2030_holographicProjectorB_bedroom.glb',
    position: [7.8, 2, 4.2],
    targetSize: 7.5,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_03_2030_holographicProjectorA_bedroom.glb',
    position: [-1.8, 1.02, 3.6],
    targetSize: 1.4,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_04_2030_smartLight_bedroom.glb',
    position: [1, 6, -7.5],
    targetSize: 1.6,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_11_2030_smart_toilet_toilet.glb',
    position: [-6.5, 0, 10],
    targetSize: 4.5,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_12_2030_sonic_toothbrush_toilet.glb',
    position: [-0.5, 3, 15.6],
    targetSize: 1.2,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_13_2030_hair_dryer_toilet.glb',
    position: [-1.5, 2.6, 12],
    targetSize: 1.4,
    rotationX: 0,
    rotationY: -Math.PI ,
    rotationZ: Math.PI/2,
  },
  {
    modelPath: '/assets/models/itr_14_2030_smart_shower_system_toilet.glb',
    position: [-6.5, 2, 16],
    targetSize: 6,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_15_2030_smart_washbasin_toilet.glb',
    position: [-1.4, 1.2, 14.2],
    targetSize: 6,
    rotationX: 0,
    rotationY: -Math.PI / 2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_16_2030_smart_refrigerator_kitchen.glb',
    position: [9.5, 0,1],
    targetSize: 5,
    rotationX: 0,
    rotationY: Math.PI,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_17_2030_smart_rice_cooker_kitchen.glb',
    position: [14, 2.7, 1],
    targetSize: 1.8,
    rotationX: 0,
    rotationY: -Math.PI/2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_18_2030_robot_vacuum_cleaner_kitchen.glb',
    position: [9.5, 0, -7],
    targetSize: 1.6,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_19_2030_smart_kettle_kitchen.glb',
    position: [13.8, 2.7, -7],
    targetSize: 1,
    rotationX: 0,
    rotationY: -Math.PI / 5,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/itr_20_2030_microwave_oven_kitchen.glb',
    position: [14, 2.7,-3.8],
    targetSize: 3,
    rotationX: 0,
    rotationY: -Math.PI/2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_08_2030_stove_hood_kitchen.glb',
    position: [14, 0, -3],
    targetSize: 12,
    rotationX: 0,
    rotationY: -Math.PI/2,
    rotationZ: 0,
  },
  {
    modelPath: '/assets/models/nonitr_09_2030_window_kitchen.glb',
    position: [15, 3.6, -5.1],
    targetSize: 5.2,
    rotationX: 0,
    rotationY: -Math.PI/2,
    rotationZ: 0,
  },
]
