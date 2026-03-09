# 未使用的模型文件 (assets/models)

以下文件在代码中未被引用（ThreeScene 仅使用 `_opt.glb` 且仅列在 `ITEM_CONFIGS` 与 `HISTORIC_MODEL_BY_SLOT` 中的文件）。

## 未使用文件列表（共 32 个）

### 非 _opt 的 2030 模型（17 个）
- 2030_air_conditioner.glb
- 2030_bed.glb
- 2030_chair.glb
- 2030_coffee_machine.glb
- 2030_computer.glb
- 2030_digital_wallet.glb
- 2030_door.glb
- 2030_handphone.glb
- 2030_laptop.glb
- 2030_lighter.glb
- 2030_projector_01.glb
- 2030_projector_02.glb
- 2030_sofa.glb
- 2030_soundbox.glb
- 2030_table.glb
- 2030_tea_table.glb
- 2030_time_spray.glb

### 非 _opt 的 1930 模型（12 个）
- 1930_bag.glb
- 1930_door.glb
- 1930_envelop.glb
- 1930_handmade_coffee.glb
- 1930_heating.glb
- 1930_light.glb
- 1930_matchstick.glb
- 1930_radio.glb
- 1930_table.glb
- 1930_time_spray.glb
- 1930_trumpet.glb
- 1930_typewriter.glb

### 未在 HISTORIC_MODEL_BY_SLOT 中使用的 _opt 模型（3 个）
- 1930_door_opt.glb
- 1930_table_opt.glb
- 1930_trumpet_opt.glb

## 删除方式

- **仅列出、不删除**：在 `frontend` 目录执行  
  `.\scripts\list-unused-models.ps1`
- **确认后删除**：执行  
  `.\scripts\list-unused-models.ps1 -Delete`  
  按提示输入 `yes` 后才会删除上述文件。

脚本未自动执行，需人工确认后再删。
