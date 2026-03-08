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

function extractPlacementKey(modelPath: string) {
  const match = modelPath.match(/\/(?:assets\/models\/)?((?:itr|nonitr)_\d+)_/)
  return match?.[1] ?? modelPath
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

const historicBuckets = new Map<string, ModelPlacement1930[]>()

MODEL_PLACEMENT_1930.forEach((historic) => {
  const key = extractPlacementKey(historic.historicModelPath)
  const list = historicBuckets.get(key) ?? []
  list.push(historic)
  historicBuckets.set(key, list)
})

export const DEFAULT_ITEM_CONFIGS: ItemPlacementConfig[] = MODEL_PLACEMENT_2030.map((future) => {
  const key = extractPlacementKey(future.modelPath)
  const bucket = historicBuckets.get(key)
  const historic = bucket?.shift()

  if (!historic) {
    throw new Error(`Missing matched 1930 config for 2030 model: ${future.modelPath}`)
  }

  return mergePlacementConfig(future, historic)
})

const leftovers = Array.from(historicBuckets.entries()).filter(([, list]) => list.length > 0)
if (leftovers.length > 0) {
  const detail = leftovers.map(([key, list]) => `${key}:${list.length}`).join(', ')
  throw new Error(`Unused 1930 placement config entries detected: ${detail}`)
}
