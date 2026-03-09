# 3D 模型优化（计划 C1 执行指南）

场景中的 GLB 模型总大小约 **785 MB**，会导致加载慢、帧率低甚至崩溃。前端已集成 **DRACOLoader**，压缩后的 Draco 模型可直接使用，无需改代码。

---

## C1 执行顺序

### 第一步：安装 gltf-transform（一次性）

在项目根目录或 `frontend` 目录下执行：

```powershell
npm install -g @gltf-transform/cli
```

或每次用 npx（不全局安装）：

```powershell
npx @gltf-transform/cli --help
```

（若用 npx，下面所有 `gltf-transform` 改为 `npx @gltf-transform/cli`。）

---

### 第二步：Draco 压缩（优先做）

**单文件示例：**

```powershell
cd frontend
npx @gltf-transform/cli draco assets/models/2030_projector_02.glb assets/models/2030_projector_02_draco.glb --method edgebreaker
```

**批量处理当前目录下所有 .glb（PowerShell）：**

```powershell
cd frontend
Get-ChildItem -Path "assets/models" -Filter "*.glb" | ForEach-Object {
  $out = $_.FullName -replace '\.glb$','_draco.glb'
  npx @gltf-transform/cli draco $_.FullName $out --method edgebreaker
}
```

- 会生成 `xxx_draco.glb`。  
- 用压缩文件替换原文件：把 `_draco.glb` 改名为原文件名，或修改 `ThreeScene.tsx` 里 `ITEM_CONFIGS` / `HISTORIC_MODEL_BY_SLOT` 的路径指向 `*_draco.glb`。  
- 典型可减少 60–80% 体积（例如 80MB → 约 16–25MB）。

---

### 第三步：贴图缩小（可选，进一步减体积）

大贴图会撑大 GLB。可先把长宽限制到 1024 再 Draco：

**单文件：**

```powershell
npx @gltf-transform/cli resize input.glb resized.glb --width 1024 --height 1024
npx @gltf-transform/cli draco resized.glb output.glb --method edgebreaker
```

**批量：先 resize 再 draco（PowerShell）：**

```powershell
cd frontend
Get-ChildItem -Path "assets/models" -Filter "*.glb" | ForEach-Object {
  $resized = $_.FullName -replace '\.glb$','_resized.glb'
  $out = $_.FullName -replace '\.glb$','_opt.glb'
  npx @gltf-transform/cli resize $_.FullName $resized --width 1024 --height 1024
  npx @gltf-transform/cli draco $resized $out --method edgebreaker
  Remove-Item $resized -ErrorAction SilentlyContinue
}
```

得到 `*_opt.glb`，再按需替换原文件或改配置路径。

---

### 第四步：确认前端已支持 Draco

无需再改代码。项目里已：

- 在 `ThreeScene.tsx` 中接入 **DRACOLoader** 并传给 GLTFLoader；
- 使用 CDN 解码器：`https://www.gstatic.com/draco/versioned/decoders/1.5.7/`。

只要把原来的 `.glb` 换成用上述步骤生成的 Draco 版（或改路径指向 Draco 文件），刷新页面即可自动用 Draco 解码。