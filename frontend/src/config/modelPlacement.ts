import { MODEL_PLACEMENT_2030, type ModelPlacement2030 } from './modelPlacement2030'
import { MODEL_PLACEMENT_1930, type ModelPlacement1930 } from './modelPlacement1930'

export type ItemPlacementConfig = {
  modelPath: string
  historicModelPath: string
  position: [number, number, number]
  targetSize: number
  rotationX?: number
  rotationY: number
  rotationZ?: number
  historicPosition: [number, number, number]
  historicTargetSize: number
  historicRotationX?: number
  historicRotationY: number
  historicRotationZ?: number
}

if (MODEL_PLACEMENT_2030.length !== MODEL_PLACEMENT_1930.length) {
  throw new Error(
    `Model placement length mismatch: 2030=${MODEL_PLACEMENT_2030.length}, 1930=${MODEL_PLACEMENT_1930.length}`,
  )
}

function mergePlacementConfig(
  future: ModelPlacement2030,
  historic: ModelPlacement1930,
): ItemPlacementConfig {
  return {
    modelPath: future.modelPath,
    historicModelPath: historic.historicModelPath,
    position: future.position,
    targetSize: future.targetSize,
    rotationX: future.rotationX,
    rotationY: future.rotationY,
    rotationZ: future.rotationZ,
    historicPosition: historic.historicPosition,
    historicTargetSize: historic.historicTargetSize,
    historicRotationX: historic.historicRotationX,
    historicRotationY: historic.historicRotationY,
    historicRotationZ: historic.historicRotationZ,
  }
}

export const DEFAULT_ITEM_CONFIGS: ItemPlacementConfig[] = MODEL_PLACEMENT_2030.map((future, index) =>
  mergePlacementConfig(future, MODEL_PLACEMENT_1930[index]),
)
