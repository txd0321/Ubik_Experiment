# Ubik 实验导出 JSON 说明文档

本文档描述从 Ubik 实验前端导出的 JSON 文件中可能出现的所有字段及其含义。导出文件通常以 `ubik_<sessionId>_<timestamp>.json` 命名。

---

## 顶层结构

导出 JSON 根对象包含以下键：

| 字段 | 类型 | 说明 |
|------|------|------|
| `meta` | object | 会话与环境的元信息 |
| `practice` | object | 练习阶段的数据（含交互记录与答案） |
| `formal` | object | 正式实验阶段的数据（含每题交互、轨迹等） |
| `survey` | object | 问卷阶段的数据 |
| `eventLog` | array | 全流程事件日志（按时间顺序） |

---

## 1. `meta` — 元信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 当前会话唯一标识，格式通常为 `{timestamp}-{random}` |
| `userId` | string | 用户唯一标识（如 UUID），可能来自本地存储 |
| `participantPhone` | string | 参与者手机号（在欢迎页填写，用于标识被试） |
| `exportedAt` | string | 导出发生时的 ISO 8601 时间戳 |
| `windowSize` | object | 导出时浏览器窗口尺寸 |
| `windowSize.innerWidth` | number | 视口宽度（像素） |
| `windowSize.innerHeight` | number | 视口高度（像素） |
| `userAgent` | string | 导出时浏览器的 User-Agent 字符串 |

---

## 2. `practice` — 练习阶段

| 字段 | 类型 | 说明 |
|------|------|------|
| `interactionRecord` | object \| null | 练习题的交互记录；若未进入或未提交则为 `null` |
| `answer` | object \| null | 练习题的答案；若未提交则为 `null` |

### 2.1 `practice.interactionRecord`

| 字段 | 类型 | 说明 |
|------|------|------|
| `interaction_id` | string | 该次交互的唯一 ID（UUID） |
| `panel_open_ts` | number | 选项面板打开时的 Unix 时间戳（毫秒） |
| `option_hover_map` | object | 各选项（A/B/C/D）的累计悬停时长（毫秒） |
| `first_click` | object \| null | 用户第一次点击的选项信息 |
| `q_submitted_at` | number | 提交答案时的 Unix 时间戳（毫秒） |
| `total_duration_ms` | number | 从打开面板到提交的总耗时（毫秒） |
| `window_size` | object | 当时窗口尺寸 `{ innerWidth, innerHeight }` |

### 2.2 `practice.interactionRecord.first_click`

| 字段 | 类型 | 说明 |
|------|------|------|
| `ts` | number | 首次点击时的 Unix 时间戳（毫秒） |
| `itemId` | string | 题目/物体 ID（练习题为 `practice-cube`） |
| `optionId` | string | 被点击的选项 ID（如 `"A"`、`"D"`） |
| `optionType` | string | 可选；选项类型（如 `visual`、`narrative` 等） |

### 2.3 `practice.answer`

| 字段 | 类型 | 说明 |
|------|------|------|
| `itemId` | string | 题目 ID |
| `selectedOptionId` | string | 用户选择的选项 ID |
| `isCorrect` | boolean | 是否答对 |
| `durationMs` | number | 作答耗时（毫秒） |

---

## 3. `formal` — 正式实验阶段

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalDurationMs` | number | 从进入正式阶段到完成所有题目的总时长（毫秒） |
| `interactions` | array | 每道正式题的交互记录（含截图等） |
| `movement_trajectory` | object | 用户在场景中的移动轨迹数据 |

### 3.1 `formal.interactions[]` — 单题交互记录

每项对应一道正式题的完整记录，包含交互与题目元数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| `interaction_id` | string | 该次交互的唯一 ID（UUID） |
| `panel_open_ts` | number | 选项面板打开时的 Unix 时间戳（毫秒） |
| `option_hover_map` | object | 各选项（A/B/C/D）的累计悬停时长（毫秒） |
| `first_click` | object \| null | 用户第一次点击的选项（结构同 practice） |
| `q_submitted_at` | number | 提交答案时的 Unix 时间戳（毫秒） |
| `total_duration_ms` | number | 从打开面板到提交的总耗时（毫秒） |
| `window_size` | object | 当时窗口尺寸 |
| `itemId` | string | 题目/物体 ID（如 `smart-environment-lamp`） |
| `modelFile` | string | 可选；对应的 3D 模型文件名（如 `2030_light.glb`） |
| `selectedOptionId` | string | 用户最终选择的选项 ID |
| `orderIndex` | number | 该题在正式阶段的顺序（1-based） |
| `viewport_screenshot` | string | 可选；提交瞬间的视口截图，Base64 编码的 Data URL（如 `data:image/jpeg;base64,...`） |

### 3.2 `formal.movement_trajectory` — 移动轨迹

| 字段 | 类型 | 说明 |
|------|------|------|
| `roomOrigin` | [number, number, number] | 场景房间原点在世界坐标系中的位置 `[x, y, z]` |
| `roomSize` | [number, number, number] | 房间尺寸 `[宽, 高, 深]`（与场景配置一致） |
| `points` | array | 轨迹点数组，每项为一个点（见下方点格式） |
| `skippedTimestamps` | array | 可选；在 200ms 采样时刻因“位置与朝向在 20 秒内未变化”而未记录的采样时间戳（毫秒） |
| `postSubmitSamples` | array | 可选；每题提交后立即采样得到的点，带题目索引 |

#### 轨迹点格式（`points[]` 中每个元素）

每个点为 **7 个数字** 的数组，顺序为：

| 索引 | 含义 | 说明 |
|------|------|------|
| 0 | `timestamp_ms` | 采样时刻的 Unix 时间戳（毫秒） |
| 1 | `positionX` | 相机/角色 X 坐标（世界坐标） |
| 2 | `positionY` | 相机/角色 Y 坐标（世界坐标） |
| 3 | `positionZ` | 相机/角色 Z 坐标（世界坐标） |
| 4 | `directionX` | 视线方向向量 X 分量（单位向量） |
| 5 | `directionY` | 视线方向向量 Y 分量 |
| 6 | `directionZ` | 视线方向向量 Z 分量 |

- 采样间隔：每 **200ms** 采样一次（当处于 practice/formal 场景且未打开选项面板时）。
- 相机位置与用户位置在本实验中一致，因此只保留一组位置与一组朝向，无重复字段。

#### `postSubmitSamples[]` 中每项

| 字段 | 类型 | 说明 |
|------|------|------|
| `afterQuestionIndex` | number | 题目索引：0 表示练习后，1～N 表示第 1～N 道正式题提交后 |
| `point` | number[] | 与 `points` 相同的 7 元组格式：`[timestamp_ms, posX, posY, posZ, dirX, dirY, dirZ]` |

---

## 4. `survey` — 问卷阶段

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | object | 问卷各题的回答内容 |
| `questionDurationsMs` | object | 各问卷题从打开到失去焦点/下一步的停留时长（毫秒） |

### 4.1 `survey.data`

| 字段 | 类型 | 说明 |
|------|------|------|
| `taskDifficulty` | string | 任务难度（如 "1"～"5" 或类似量表值） |
| `coreDifficulties` | string[] | 核心困难项（多选，字符串数组） |
| `decisionBases` | string[] | 决策依据（多选，字符串数组） |
| `noticedEnvironmentChanges` | string | 是否注意到环境变化（如 "是" / "否"） |
| `environmentImpact` | string | 环境对决策的影响描述（当注意到变化时填写） |
| `narrativePresence` | string | 叙事存在感相关评分或选项 |
| `feedback` | string | 自由文本反馈 |

### 4.2 `survey.questionDurationsMs`

键为问卷题目在代码中的 key（如 `taskDifficulty`、`coreDifficulties`、`decisionBases`、`noticedEnvironmentChanges`、`environmentImpact`、`narrativePresence`、`feedback`），值为该题从打开到下一步的停留时长（毫秒）。

---

## 5. `eventLog` — 事件日志

`eventLog` 为数组，按时间顺序记录实验过程中的前端事件，用于行为与时间线分析。

### 5.1 每个事件对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `event_id` | string | 事件唯一 ID（如 `{timestamp}-{random}`） |
| `event_name` | string | 事件名称（见下方常见事件名） |
| `event_time` | string | 事件发生时的 ISO 8601 时间戳 |
| `step` | string | 当前步骤：`welcome` \| `tutorial` \| `practice` \| `formal` \| `survey` |
| `session_id` | string | 会话 ID，与 `meta.sessionId` 一致 |
| `page_url` | string | 当前页面路径（如 `"/"`） |
| `payload` | object | 可选；该事件附加数据，依 `event_name` 不同而不同 |

### 5.2 常见 `event_name` 与 `payload`

| event_name | 说明 | payload 常见字段 |
|------------|------|------------------|
| `welcome_view` | 欢迎页展示 | — |
| `start_experiment_click` | 点击开始实验 | `participantPhone` |
| `practice_view` | 练习场景展示 | — |
| `tutorial_view` | 教程展示 | — |
| `practice_scene_loaded` | 练习场景加载完成 | — |
| `practice_object_clicked` | 点击练习物体 | `itemId`, `interaction_id` |
| `formal_answer_submitted` | 正式题提交 | `itemId`, `selectedOptionId`, `durationMs`, `orderIndex`, `interaction_id`, 等 |
| `formal_all_completed` | 所有正式题完成 | — |
| `movement_key_press` | 移动按键（W/A/S/D） | `key` |
| `survey_view` | 问卷页展示 | — |
| `survey_submit_click` | 点击提交问卷 | — |
| `survey_submit_success` | 问卷提交成功 | — |

---

## 版本与兼容说明

- **轨迹点格式**：当前导出使用 **7 元组** `[timestamp_ms, posX, posY, posZ, dirX, dirY, dirZ]`。旧版本曾使用 9 元组并包含重复的相机/位置信息，若需解析旧数据请根据是否存在 9 个元素做分支处理。
- **截图**：`viewport_screenshot` 在提交时截取前会先强制渲染一帧，以避免出现全黑图；若仍缺失或异常，可能与浏览器或 WebGL 限制有关。
- 未完成的流程（如未提交练习、未进入正式、未提交问卷）中，对应顶层键仍存在，但内部部分字段可能为 `null` 或空数组。
