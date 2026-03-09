# List and optionally delete unused model files in frontend/assets/models.
# Usage: .\list-unused-models.ps1           # list only (dry run)
#        .\list-unused-models.ps1 -Delete   # actually delete (use with caution)
#
# Used models are those referenced in ThreeScene.tsx:
#   - ITEM_CONFIGS (17 files): 2030_*_opt.glb for scene objects
#   - HISTORIC_MODEL_BY_SLOT (9 files): 1930_*_opt.glb for historic variants

$ErrorActionPreference = 'Stop'
$modelsDir = Join-Path $PSScriptRoot '..\assets\models'

$used = @(
    '2030_air_conditioner_opt.glb',
    '2030_coffee_machine_opt.glb',
    '2030_computer_opt.glb',
    '2030_digital_wallet_opt.glb',
    '2030_door_opt.glb',
    '2030_handphone_opt.glb',
    '2030_laptop_opt.glb',
    '2030_soundbox_opt.glb',
    '2030_table_opt.glb',
    '2030_time_spray_opt.glb',
    '2030_chair_opt.glb',
    '2030_sofa_opt.glb',
    '2030_bed_opt.glb',
    '2030_tea_table_opt.glb',
    '2030_lighter_opt.glb',
    '2030_projector_01_opt.glb',
    '2030_projector_02_opt.glb',
    '1930_heating_opt.glb',
    '1930_handmade_coffee_opt.glb',
    '1930_bag_opt.glb',
    '1930_envelop_opt.glb',
    '1930_typewriter_opt.glb',
    '1930_radio_opt.glb',
    '1930_time_spray_opt.glb',
    '1930_matchstick_opt.glb',
    '1930_light_opt.glb'
)

$usedSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($u in $used) { [void]$usedSet.Add($u) }

$allFiles = Get-ChildItem -LiteralPath $modelsDir -File -Filter '*.glb' | ForEach-Object { $_.Name }
$unused = $allFiles | Where-Object { -not $usedSet.Contains($_) } | Sort-Object

Write-Host "Total .glb in assets/models: $($allFiles.Count)"
Write-Host "Used (in ThreeScene): $($used.Count)"
Write-Host "Unused (candidates for removal): $($unused.Count)"
Write-Host ""
Write-Host "Unused files:"
$unused | ForEach-Object { Write-Host "  $_" }

$paramDelete = $false
foreach ($arg in $args) { if ($arg -eq '-Delete') { $paramDelete = $true; break } }
if ($paramDelete) {
    Write-Host ""
    $confirm = Read-Host "Type 'yes' to delete the $($unused.Count) unused files"
    if ($confirm -eq 'yes') {
        foreach ($f in $unused) {
            $path = Join-Path $modelsDir $f
            Remove-Item -LiteralPath $path -Force
            Write-Host "Deleted: $f"
        }
    }
    else { Write-Host "Aborted." }
}
else {
    Write-Host ""
    Write-Host "To delete these files, run from frontend dir: .\scripts\list-unused-models.ps1 -Delete"
}
