# 《尤比克》物品退行实验 - 产品与技术开发文档（PRD + Tech Spec）

## 1. 文档信息

- **项目名称**：物品功能退行认知实验（《尤比克》世界观）
- **文档版本**：v2.0
- **目标平台**：桌面端 Web（Chrome / Edge / Safari 最新版）
- **核心形态**：Three.js 第一人称 3D 交互实验网页
- **目标用户**：实验被试（普通成年网民）
- **预估时长**：10~15 分钟

---

## 2. 项目目标与范围

### 2.1 业务目标

构建一套完整的线上实验系统，引导被试完成以下全流程：

1. 欢迎与知情同意
2. 操作教学 + 练习题（1 题，3D 场景内完成）
3. 正式实验（10 题）
4. 实验后问卷与数据提交

### 2.2 研究目标

验证被试在“现代物品退行到 1960 年代”语境下，对“功能对应关系”的认知匹配策略，并采集行为数据用于后续统计分析。

### 2.3 非目标（Out of Scope）

- 移动端完整适配（可后续扩展）
- 社交分享、排行榜等游戏化功能
- 多语言版本（当前仅中文）

---

## 3. 页面与信息架构

## 3.1 页面结构（4 步）

1. **Step 0：欢迎页**（静态）
2. **Step 1：操作教学 + 练习场景**（3D，教学浮窗叠加）
3. **Step 2：正式实验场景**（3D）
4. **Step 3：结束页 + 问卷**（静态表单）

## 3.2 路由建议

- `/` → 欢迎页
- `/practice` → 操作教学 + 练习场景
- `/experiment` → 正式实验场景
- `/survey` → 结束问卷页

> 若使用单页应用（SPA），可通过状态机控制步骤，不强依赖 URL 路由。

## 3.3 状态机（核心）

- `INIT`
- `CONSENTED`
- `PRACTICE_DONE`
- `EXPERIMENT_IN_PROGRESS`
- `EXPERIMENT_DONE`
- `SURVEY_READY`
- `SUBMITTING`
- `SUBMITTED` / `SUBMIT_FAILED`

---

## 4. 全局交互规范

## 4.1 输入控制

- **移动**：W / A / S / D
- **视角**：鼠标控制视角（Orbit 视角控制）
- **交互**：鼠标左键点击发光物品
- **悬停反馈**：当物体处于可点击状态且鼠标悬停其上时，光标变为小手（pointer）
- **UI 操作**：点击、单选、下拉、输入、按钮确认
- **顶部全局导航栏**：左侧显示 `Ubik Experiment`；步骤为：`Step 0 知情同意 ---- Step 1 操作教学 ---- Step 2 正式试验 ---- Step 3 问卷与反馈 ---- ☑️谢谢参与`。当前步骤为蓝色粗体，其他步骤为灰色

## 4.2 交互对象状态

- `idle`：默认不可点击
- `active`：用户进入触发距离（当前阈值约 4.2）后，物体进入发光可点击状态
- `hover`：鼠标悬停在 `active` 物体上，光标变为小手
- `answered`：已完成对象不可重复答题（正式实验）

## 4.3 UI 与视觉要求

- 面板：白底半透明、圆角、阴影
- 全局导航：同一行展示品牌与步骤，品牌在左，步骤居中；字号已放大
- Step 0 主卡片：位于页面偏上（黄金分割附近）
- Step 1 教学提示卡：位于页面底部居中，深色半透明背景（#333333，约 0.6），白色粗体大字
- Step 1 场景提示卡：位于偏上居中位置，深色半透明背景（#333333，约 0.4），白字；点击物体弹题后隐藏
- Step 1 场景：白墙黑地
- Step 1 可交互物：单个粉蓝色正方体（颜色 #6889F4），当前坐标 `(6, 1, -6.5)`
- Step 1 发光反馈：采用物体自发光 + 柔光晕 + 局部光照增强，强调可点击状态
- 底部计时器：已移除（不展示总时长/步骤时长/单题时长）

## 4.4 时间口径统一

- `panel_open_at`：题目面板打开时刻
- `answer_confirm_at`：点击“确认选择”时刻
- `question_duration_ms = answer_confirm_at - panel_open_at`
- `total_duration_ms = survey_submit_at - experiment_start_at`
- 补充说明：Step 0、Step 1 不展示页面计时条；实验总时长用于提交统计

---

## 5. 分页面功能与交互细则

## 5.1 Step 0 欢迎页

### 页面元素

- 全局导航栏
- 标题：`尤比克认知匹配实验`
- 背景说明文字：在著名科幻作家菲利普迪克所著小说《尤比克》的世界观中，现代物品会“退行”为 1930 年代在功能上对应的物品，你将进入 2030 现代客厅并完成 10 道判断题
- 用户ID输入：请填写电话号码
- 主按钮：`开始`（默认禁用，填写电话号码后启用）

### 交互规则

- 电话号码仅允许数字输入
- 电话号码为空时按钮禁用
- 点击“开始”后进入 Step 1

### 埋点事件

- `start_experiment_click`（携带 participantPhone）

---

## 5.2 Step 1 操作教学 + 练习题（3D）

### 页面元素

- 全局导航栏
- 页面底部教学提示卡（进入练习页即显示，点击物体弹题后隐藏）
  - 文案（单行）：`键盘W,A, S, D 可控制前后左右移动，鼠标可控制视角`
- 练习场景提示卡（仅在未弹题时显示）
  - 未接近：`请靠近物体直到物体发光`
  - 可点击：`请点击物体`
- 3D 练习场景（白墙黑地）
- 单个可交互物：正方体（#6889F4）
- 练习题卡：`正方体有几个面？`
  - 选项：A 3个 / B 4个 / C 5个 / D 6个
  - 按钮：`确认选择`
- 反馈卡：仅显示“回答正确/回答错误”及说明（不再展示原题与选项）
- 反馈后延时显示按钮：`进入正式实验`（按钮位于卡片内）
- 进入按钮出现后，卡片切换为简化内容：`恭喜完成操作教学环节！` + `进入正式实验`

### 交互规则

- 进入页面即显示教学提示卡并可直接在场景中操作
- 用户靠近物体至触发距离后，物体发光并进入可点击状态；未触发前不可点击
- 可点击状态下鼠标悬停为小手
- 点击物体后弹出练习题卡，同时隐藏场景提示卡与教学提示卡
- 提交答案后显示对错反馈
  - 正确：标题绿色
  - 错误：标题红色
- 约 3 秒后显示“进入正式实验”按钮，点击进入 Step 2

### 埋点事件

- `tutorial_view`（教学提示展示）
- `practice_scene_loaded`
- `practice_object_clicked`
- `practice_option_selected`
- `practice_answer_submitted`
- `practice_feedback_shown`
- `enter_formal_experiment_click`

---

## 5.3 Step 2 正式实验（3D）

### 页面概述

正式实验场景为完整小户型 3D 空间，包含卧室、厨房、厕所三个区域，连接关系如下：

- 卧室可通往厨房与厕所
- 厨房仅与卧室相连
- 厕所仅与卧室相连
- 厨房与厕所不直接连通

场景存在两种时代状态：`2030` 与 `1930`。

- 用户进入 Step 2 时，场景初始为 `2030` 状态
- 用户可在全空间自由移动与浏览
- 场景内有 20 个可交互物件（卧室 10、厨房 5、厕所 5）
- 其他物件为非交互背景

当用户靠近可交互物件时，物件高亮发光并可点击。点击后弹出答题卡，提交答案后该物件由 `2030` 替换为对应 `1930` 版本（1930 版本不可点击）。

当 20 个交互任务全部完成后：

1. 弹出提示：`恭喜你已完成所有任务`（约 2 秒）
2. 全场景非交互内容（墙面、灯光、环境等）逐步从 `2030` 过渡到 `1930`
3. 显示 `退出实验` 按钮，点击进入 Step 3

### 页面元素（Step 2 页面内容）

#### 1) 3D 场景主体

- 卧室、厨房、厕所三空间联通结构（厨房/厕所仅与卧室相连）
- 页面初始为 **2030 状态**（可交互物件与非交互环境均为 2030 版本）

#### 2) 可交互物件层

- 共 20 个可交互物件（卧室 10、厨房 5、厕所 5）
- 用户接近后高亮发光并进入可点击态；远离后恢复不可点击态
- 已完成物件替换为 1930 版本并锁定不可再次点击

**卧室（10 个）**

| 编号 | 2030 模型（交互前） | 1930 模型（交互后） | 备注 |
|---|---|---|---|
| 01 | `itr_01_2030_spray_bedroom` | `itr_01_1930_spray_bedroom` | 一对一替换 |
| 02 | `itr_02_2030_soundbox_bedroom` | `itr_02_1930_phonograph_bedroom` | 一对一替换 |
| 03 | `itr_03_2030_holographicProjectorA_bedroom` + `itr_03_2030_holographicProjectorB_bedroom` | `itr_03_1930_radio_bedroom` | A/B 两个 2030 模型视为同一交互物体，完成后统一替换为 1 个 1930 模型 |
| 04 | `itr_04_2030_smartLight_bedroom` | `itr_04_1930_keroseneLamp_bedroom` | 一对一替换 |
| 05 | `itr_05_2030_laptop_bedroom` | `itr_05_1930_typewriter_bedroom` | 一对一替换 |
| 06 | `itr_06_2030_smartPhone_bedroom` | `itr_06_1930_envelope_bedroom` | 一对一替换 |
| 07 | `itr_07_2030_digitalWallet_bedroom` | `itr_07_1930_purse_bedroom` | 一对一替换 |
| 08 | `itr_08_2030_coffeeMachine_bedroom` | `itr_08_1930_handmadeCoffeeTools_bedroom` | 一对一替换 |
| 09 | `itr_09_2030_airConditioner_bedroom` | `itr_09_1930_heating_bedroom` | 一对一替换 |
| 10 | `itr_10_2030_electricLighter_bedroom` | `itr_10_1930_matchstick_bedroom` | 一对一替换 |

**厕所（5 个）**

| 编号 | 2030 模型（交互前） | 1930 模型（交互后） |
|---|---|---|
| 11 | `itr_11_2030_smart_toilet_toilet` | `itr_11_1930_sputum_bowl_toilet` |
| 12 | `itr_12_2030_sonic_toothbrush_toilet` | `itr_12_1930_tooth_powder_toilet` |
| 13 | `itr_13_2030_hair_dryer_toilet` | `itr_13_1930_hair_dryer_toilet` |
| 14 | `itr_14_2030_smart_shower_system_toilet` | `itr_14_1930_shower_bucket_toilet` |
| 15 | `itr_15_2030_smart_washbasin_toilet` | `itr_15_1930_pitcher_basin_toilet` |

**厨房（5 个）**

| 编号 | 2030 模型（交互前） | 1930 模型（交互后） |
|---|---|---|
| 16 | `itr_16_2030_smart_refrigerator_kitchen` | `itr_16_1930_icebox_kitchen` |
| 17 | `itr_17_2030_smart_rice_cooker_kitchen` | `itr_17_1930_iron_pot_kitchen` |
| 18 | `itr_18_2030_robot_vacuum_cleaner_kitchen` | `itr_18_1930_broom_dustpan_kitchen` |
| 19 | `itr_19_2030_smart_kettle_kitchen` | `itr_19_1930_copper_kettle_kitchen` |
| 20 | `itr_20_2030_microwave_oven_kitchen` | `itr_20_1930_stove_fire_kitchen` |

#### 3) 非交互物件层（9 个）

这些物件为环境背景，不可点击。在 20 个可交互任务全部完成后，按场景过渡逻辑由 `2030` 状态切换为 `1930` 状态。

**卧室（7 个）**

| 编号 | 2030 模型 | 1930 模型 |
|---|---|---|
| 1 | `nonitr_01_2030_table_bedroom` | `nonitr_01_1930_table_bedroom` |
| 2 | `nonitr_02_2030_bed_bedroom` | `nonitr_02_1930_bed_bedroom` |
| 3 | `nonitr_03_2030_teaTable_bedroom` | `nonitr_03_1930_teaTable_bedroom` |
| 4 | `nonitr_04_2030_chair_bedroom` | `nonitr_04_1930_chair_bedroom` |
| 5 | `nonitr_05_2030_sofa_bedroom` | `nonitr_05_1930_sofa_bedroom` |
| 6 | `nonitr_06_2030_frontDoor_bedroom` | `nonitr_06_1930_frontDoor_bedrom` |
| 7 | `nonitr_07_2030_roboticTree_bedroom` | `nonitr_07_1930_pottedPlant_bedroom` |

**厨房（2 个）**

| 编号 | 2030 模型 | 1930 模型 |
|---|---|---|
| 8 | `nonitr_08_2030_stove_hood_kitchen` | `nonitr_08_1930_cupboard_chimney_kitchen` |
| 9 | `nonitr_09_2030_window_kitchen` | `nonitr_09_1930_window_kitchen` |

#### 3) 题目清单（20 题）

> 每个编号与对应可交互物件一一对应；每题 4 选 1。

1. **纳米修复喷雾**  
   A：现代圆柱形运动水壶  
   B：老式马口铁气雾罐  
   C：游乐场旋转木马  
   D：带有发光液体的魔法药水瓶

2. **智能音箱**  
   A：现代头戴式无线耳机  
   B：木质复古相框  
   C：表面光滑的深灰色圆石  
   D：大喇叭铜质留声机

3. **全息投影仪**  
   A：收音机  
   B：铁制家用剪刀  
   C：现代极简透明玻璃立方体/花瓶  
   D：宽屏超薄液晶显示器

4. **智能环境灯**  
   A：强光手电筒  
   B：手提式煤油马灯  
   C：发光的磨砂白色乒乓球  
   D：玻璃水杯

5. **笔记本电脑**  
   A：传统的木框算盘  
   B：雷明顿机械打字机  
   C：银色不锈钢咖啡托盘  
   D：折叠式便携梳妆镜

6. **智能手机**  
   A：牛皮纸信封  
   B：火柴盒  
   C：陶瓷烟灰缸  
   D：黑色磨砂石板

7. **数字钱包**  
   A：黑色扁平充电宝  
   B：磨损的皮革钱袋与银币  
   C：手持雨伞的手柄  
   D：纸质银行存折

8. **智能咖啡机**  
   A：金属垃圾桶  
   B：旧报纸  
   C：手摇研磨机、炭火铜炉  
   D：咖啡包装袋

9. **智能中央空调**  
   A：墙上的白色横梁  
   B：绿色盆栽  
   C：三叶电风扇  
   D：铸铁暖气片

10. **电浆打火机**  
    A：塑料美发梳  
    B：聚光放大镜  
    C：木制火柴盒  
    D：圆柱金属外壳口红

11. **智能马桶（smart toilet）**  
    A：现代白色陶瓷洗手台（visual）  
    B：搪瓷图案夜壶/痰盂（narrative）  
    C：几卷现代卫生纸（semantic）  
    D：木质地球仪（baseline）

12. **电动牙刷（sonic toothbrush）**  
    A：猪鬃牙刷与铁盒牙粉（narrative）  
    B：塑料软毛牙刷（semantic）  
    C：金属螺丝刀（baseline）  
    D：白板笔（visual）

13. **电动吹风机（hair dryer）**  
    A：电直板夹（semantic）  
    B：手持金属放大镜（visual）  
    C：老式美发工具组（narrative）  
    D：陶瓷咖啡杯（baseline）

14. **智能淋浴系统（smart shower system）**  
    A：圆形顶灯 + 金属落地灯组合（visual）  
    B：多功能花洒（semantic）  
    C：掉漆浴缸 + 木质水瓢（narrative）  
    D：木质吉他（baseline）

15. **智能盥洗台（smart washbasin）**  
    A：搪瓷洗脸盆 + 木质洗漱架（narrative）  
    B：不锈钢洗碗池（semantic）  
    C：纯白办公书桌（visual）  
    D：百科全书（baseline）

16. **智能冰箱（smart refrigerator）**  
    A：老式木质冰柜（narrative）  
    B：双开门保险箱（visual）  
    C：智能保温箱（semantic）  
    D：落地衣架（baseline）

17. **智能电饭煲（smart rice cooker）**  
    A：不锈钢高压锅（semantic）  
    B：仙人掌盆栽（baseline）  
    C：摩托车头盔（visual）  
    D：铸铁双耳吊锅（narrative）

18. **扫地机器人（robot vacuum cleaner）**  
    A：圆形玻璃体重秤（visual）  
    B：吸尘器（semantic）  
    C：扫帚与簸箕（narrative）  
    D：陶瓷餐盘（baseline）

19. **电热水壶（smart kettle）**  
    A：保温杯（semantic）  
    B：铜制烧水壶（narrative）  
    C：铁锤（baseline）  
    D：榨汁机（visual）

20. **微波炉（microwave oven）**  
    A：柴火炉（narrative）  
    B：老式天线电视机（visual）  
    C：小提琴琴盒（baseline）  
    D：空气炸锅（semantic）

#### 4) 答题浮窗层

- 点击可交互物件后弹出题卡
- 包含：题干、4 个选项、`确认选择` 按钮
- 未选择选项前按钮禁用
- 提交后关闭题卡并触发物件替换动画

#### 5) 状态与流程 UI

- 右上角进度：`X/20 已完成`
- 全部完成后显示提示：`恭喜你已完成所有任务`（约 2 秒）
- 全场景过渡到 1930 完成后显示 `退出实验` 按钮，点击进入 Step 3

#### 6) 数据采集相关页面要求（用户无感）

- 页面进入 Step 2 后开始记录实验总时长
- 用户移动过程中持续记录路径轨迹（建议 1Hz）
- 每次题卡打开到提交记录单题作答时长
- 每个选项记录 hover 次数与累计悬浮时长（犹豫时间）

### 交互规则

- 用户可在整套空间内自由移动与浏览，不限制作答顺序
- 只有可交互物件可触发题目，其他物件均为非交互背景
- 距离触发前物件不可点击；触发后发光并可点击
- 每个可交互物件仅可作答一次
- 每次答题提交后，触发对应物件替换：
  - 2030 物件退场
  - 对应 1930 物件入场（1930 物件不可点击）
- 20 个物件全部完成后：
  - 先显示完成提示浮窗（约 2 秒）
  - 再触发全场景非交互内容逐步从 2030 过渡到 1930（墙面/灯光/环境等）
- 完成过渡后允许自由浏览，并显示“退出实验”按钮

### 数据记录要求（Step 2 必须采集）

- **用户移动路径**
  - 记录方式：实验进行中按固定频率采集相机位置轨迹（建议 1Hz）
  - 最小字段：`session_id`、`step`、`ts`、`camera_position{x,y,z}`、`camera_rotation{pitch,yaw,roll}`（旋转可选）
  - 用途：还原用户探索路径、空间停留与回访行为

- **整个试验时间（Step 2 总时长）**
  - 起点：进入 Step 2 且场景可交互时（`formal_scene_loaded` 后）
  - 终点：点击“退出实验”按钮时
  - 记录字段：`formal_started_at`、`formal_ended_at`、`formal_duration_ms`

- **单题作答时间**
  - 起点：题卡弹出时
  - 终点：点击“确认选择”提交时
  - 记录字段：`question_opened_at`、`question_submitted_at`、`question_duration_ms`

- **选项悬浮犹豫时间**
  - 定义：鼠标悬停在某选项上的累计停留时长（可用于衡量犹豫程度）
  - 记录方式：
    - 进入选项时记录 `hover_start_at`
    - 离开选项时累计 `hover_duration_ms`
    - 每题按选项汇总：`option_hover_duration_ms_map`
  - 示例字段：`question_id`、`option_id`、`hover_count`、`hover_duration_ms_total`

### 埋点事件

- `formal_scene_loaded`
- `formal_path_tick`（1Hz 轨迹采样）
- `formal_object_nearby`
- `formal_object_clicked`
- `formal_question_opened`
- `formal_option_hover_start`
- `formal_option_hover_end`
- `formal_option_selected`
- `formal_answer_submitted`
- `formal_item_transformed`
- `formal_progress_updated`
- `formal_all_completed`
- `formal_environment_transition_started`
- `formal_environment_transition_finished`
- `formal_exit_experiment_click`

---

## 5.4 Step 3 结束页 + 问卷

### 页面概述

Step 3 为实验结束页与问卷页，用于采集被试主观评价与补充反馈。用户在 Step 2 点击 `退出实验` 后进入本页。

页面目标：

- 收集任务难度与决策依据
- 收集环境细节感知与叙事沉浸感
- 收集开放式反馈建议
- 提交问卷时与实验数据统一汇总上传

### 问卷结构

针对用户刚才交互过的 10 组物品，问卷包含以下题目：

#### 1) 任务难度（量表题）

题干：

- “回顾刚才的交互过程（见下方缩略图提示），请评估各物品‘退行判断’的难度。”

评分量表：

- 1（非常简单）— 7（非常困难）

视觉辅助要求：

- 并排展示 10 组物品的 `2026` 态与 `1939` 态对比图，降低记忆衰减影响

#### 2) 核心难点追问（多选题）

题干：

- “对于你认为难度 ≥ 5 分的物品，主要的困难来源于？”

选项：

- A：视觉干扰项（如形状、颜色）迷惑性强
- B：难以联想到 100 年前对应功能的物理实体（逻辑跨度大）
- C：不确定该物品在《尤比克》世界观下的演变规则
- D：选项中没有我认为完全合理的答案

#### 3) 决策依据偏好（多选题）

题干：

- “你在判断物品‘应该退化成什么’时，最主要的依据是？”

选项：

- A（视觉匹配）：选择与原物形状、材质、空间比例最接近的物体
- B（功能外推 / NLE）：寻找核心用途一致、但技术层级属于旧时代的物体
- C（原著记忆）：基于对《尤比克》小说具体情节或设定的了解
- D（直觉驱动）：没有明确逻辑，根据第一反应选择

#### 4) 环境细节感知（单选 + 开放题）

题干：

- “在实验过程中，你是否察觉到房间内除了目标物品外的其他细节变化（如灯光变昏暗、环境音出现底噪、墙皮脱落等）？”

选项：

- 是
- 否

补充题（当选择“是”时展示）：

- “请简述这些变化是否增强了你对‘退行逻辑’的理解，或影响了你的决策。”

#### 5) 叙事存在感自评（量表题）

题干：

- “你觉得自己多大程度上‘进入’（感受到真实感与紧迫感）了这个正在崩塌的《尤比克》虚拟世界？”

评分量表：

- 1（完全没有共鸣）— 7（极度沉浸）

#### 6) 开放建议（开放题）

题干：

- “请问您对本次试验有什么建议？”

### 交互规则

- 全部题目为必填项，未完成前 `提交问卷` 按钮禁用
- 点击提交后，统一上传问卷与全量实验数据
- 提交成功：显示成功提示，允许返回首页
- 提交失败：显示错误提示，保留填写内容并支持重试

### 埋点事件

- `survey_view`
- `survey_field_changed`
- `survey_submit_click`
- `survey_submit_success`
- `survey_submit_failed`

---

## 6. 功能清单（前端）

## 6.1 核心模块

1. **流程状态管理模块**：控制步骤切换与可恢复状态
2. **3D 引擎模块**：场景初始化、模型加载、相机/控制器
3. **交互检测模块**：raycast 点击检测、物体状态机
4. **题目面板模块**：题干、选项、确认、反馈
5. **数据采集模块**：事件采集、缓存、批量上报
6. **问卷模块**：校验、提交、失败重试

## 6.2 通用能力

- 统一 Toast / 异常提示
- 统一 Loading 管理
- 页面离开防误触（可选）
- 本地缓存草稿（sessionStorage）

---

## 7. 前端技术方案

## 7.1 技术栈建议

- **框架**：React + TypeScript + Vite
- **3D**：Three.js（可结合 `@react-three/fiber`，二选一）
- **状态管理**：Zustand 或 Redux Toolkit
- **UI**：原生 CSS / Tailwind CSS
- **网络请求**：Axios 或 Fetch 封装
- **埋点 SDK**：自研轻量采集器

## 7.2 工程结构建议

- `src/pages`：4 个步骤页面（教学与练习合并）
- `src/three`：场景、模型、材质、交互控制
- `src/components`：问答面板、计数器、加载层
- `src/store`：流程状态与答题结果
- `src/services`：API 与埋点上报
- `src/utils`：计时、重试、设备检测

## 7.3 性能优化

- 模型与纹理压缩（draco / ktx2）
- Frustum Culling + LOD（按需）
- 非必要阴影关闭
- 后处理效果预算控制（发光强度与采样）
- 分步懒加载资源（练习场景与正式场景分包）

---

## 8. 后端技术方案

## 8.1 技术栈建议

- **运行时**：Node.js（NestJS / Express）
- **数据库**：PostgreSQL（推荐）
- **缓存/队列**：Redis（可选）
- **对象存储**：Cloudflare R2（模型/图片资源）
- **部署**：Docker + 云主机 / Serverless

## 8.2 API 设计（最小闭环）

1. `POST /api/v1/session/init`
   - 创建匿名会话，返回 `session_id`

2. `POST /api/v1/events/batch`
   - 批量接收埋点事件

3. `POST /api/v1/experiment/submit`
   - 提交实验核心数据（可与问卷合并）

4. `POST /api/v1/survey/submit`
   - 提交问卷与最终数据（建议最终统一一个提交口）

5. `GET /api/v1/health`
   - 健康检查

## 8.3 数据库模型建议

### 表 1：`participant_session`
- `id` (pk)
- `session_id` (unique)
- `created_at`
- `user_agent`
- `is_ubik_familiar`（可冗余）

### 表 2：`practice_answer`
- `id`
- `session_id`
- `question_id`
- `selected_option`
- `is_correct`
- `duration_ms`
- `submitted_at`

### 表 3：`formal_answer`
- `id`
- `session_id`
- `item_id`
- `question_id`
- `selected_option`
- `duration_ms`
- `order_index`（第几次作答）
- `submitted_at`

### 表 4：`survey_response`
- `id`
- `session_id`
- `hardest_question`
- `judgment_basis`
- `read_ubik_before`
- `feedback_text`
- `submitted_at`

### 表 5：`event_log`（可选大表/分区）
- `id`
- `session_id`
- `event_name`
- `event_time`
- `event_payload` (jsonb)

---

## 9. 埋点与数据采集方案

## 9.1 事件公共字段

每条事件必须包含：

- `event_id`（UUID）
- `event_name`
- `event_time`（ISO）
- `session_id`
- `step`（welcome/practice/formal/survey）
- `page_url`
- `client_ts`（毫秒）
- `device_info`（ua、屏幕分辨率）

## 9.2 关键业务事件

- 页面级：`*_view`
- 行为级：点击物品、选择选项、确认答案
- 流程级：步骤进入/离开、完成进度
- 提交级：提交发起、成功、失败、重试

## 9.2.1 本研究数据采集清单（补充）

### A. 答题数据（必须）

每道题必须采集以下字段：

- `item_id` / `question_id`
- `selected_option`
- `is_correct`
- `answer_opened_at`（题目面板弹出时间戳）
- `answer_submitted_at`（点击“确认选择”时间戳）
- `duration_ms`（`answer_submitted_at - answer_opened_at`）

说明：
- 练习题与正式题统一字段结构，便于后续统计。
- 正式题保留 `order_index`（第几次作答），用于分析作答顺序效应。

### B. 行为数据（强烈建议）

#### 1）移动轨迹（每秒一次）

- 事件建议：`camera_track_tick`
- 记录频率：1Hz（每秒 1 次）
- 建议字段：
  - `session_id`
  - `ts`
  - `camera_position`：`{ x, y, z }`
  - `camera_rotation`（可选）：`{ pitch, yaw, roll }`
  - `step`

#### 2）物品发现与接近

对每个 `item_id` 记录：

- `first_discovered_at`：首次进入视野时间（首次满足“在摄像机前方且可见”判定）
- `first_approached_at`：首次接近时间（首次满足交互距离阈值，如 <= 2.5m）

建议事件：
- `item_first_discovered`
- `item_first_approached`

#### 3）停留时长

- 指标：`dwell_time_ms_total_per_item`
- 统计口径：用户在物品前方且距离阈值内的累计停留时长（可按 200ms tick 累加）

建议事件：
- `item_dwell_tick`（可选）
- 或在最终提交时直接上报聚合结果：`item_dwell_summary`

#### 4）重新审视已完成物品

- 当 `item.answered = true` 后，若用户再次接近/注视该物品，记录复访行为。
- 建议字段：
  - `item_id`
  - `revisit_at`
  - `revisit_duration_ms`（可选）
  - `revisit_count`（可在最终聚合）

建议事件：
- `answered_item_revisit`

### C. 元数据（必须）

每个 session 至少包含：

- `user_id`（随机 UUID，匿名，不可逆）
- `session_start_at`
- `session_end_at`
- `device_info`（`userAgent`、平台、浏览器）
- `screen_resolution`（如 `1920x1080`）

说明：
- `user_id` 与 `session_id` 分离：`user_id` 标识被试，`session_id` 标识单次实验会话。
- 若单设备可多次参与，建议保留 `user_id + session_id` 二级结构。

## 9.3 上报策略

- 前端内存队列累计（如 10 条或 5 秒触发）
- 页面卸载时使用 `sendBeacon` 补发
- 失败退避重试（指数退避，最多 3 次）
- 最终提交问卷时做一次全量补齐提交

## 9.4 数据质量保障

- 幂等：`event_id` 去重
- 时钟漂移容忍：服务端写入 `server_received_at`
- 字段校验：后端 schema 校验（zod / class-validator）
- 非法值兜底：写入 `invalid_reason`

---

## 10. 交互细节与可用性要求

## 10.1 面板交互

- 未选项时“确认选择”禁用
- 已选项高亮状态清晰
- 关闭逻辑受控（正式题不允许跳题）

## 10.2 3D 可操作性

- 鼠标灵敏度可配置（默认中档）
- 垂直视角限幅，避免头晕
- 与物体交互需有距离阈值（如 <= 2.5m）

## 10.3 无障碍与可读性

- 字号最小不低于 14px
- 关键按钮对比度符合 WCAG AA（尽量）
- 错误提示文案明确且可重试

---

## 11. 异常处理与容错

1. **场景加载失败**
   - 提示：“场景加载失败，请刷新页面重试”
   - 提供“重新加载”按钮

2. **交互无响应**
   - 检测连续异常点击后提示外设检查

3. **提交超时**
   - 10 秒超时 + 自动重试最多 3 次
   - 最终失败保留数据并支持手动重试

4. **中断恢复（可选）**
   - 本地缓存 session 与进度
   - 刷新后可恢复到最近步骤

---

## 12. 安全与合规

- 仅收集匿名数据，不采集姓名/手机号等 PII
- `session_id` 使用随机 UUID，不使用可逆标识
- HTTPS 传输
- 后端接口限流与基础鉴权（如签名 token）
- 数据访问最小权限与日志审计

---

## 13. 验收标准（Definition of Done）

## 13.1 功能验收

- 4 个步骤可完整闭环走通
- 练习题有反馈，正式题无反馈
- 10 题完成后自动进入问卷
- 必填问卷校验生效，提交可成功

## 13.2 数据验收

- 每题答案与时长均可查
- 总时长可计算
- 问卷字段完整入库
- 埋点关键事件无明显丢失

## 13.3 兼容与性能验收

- Chrome / Edge / Safari 正常运行
- 首次可交互时间满足目标（如 < 5s，视资源大小）
- 正式场景帧率稳定（建议 > 30 FPS）

---

## 14. 里程碑建议

1. **M1（基础框架）**：页面流程 + 状态机 + 静态 UI
2. **M2（3D MVP）**：练习场景 + 单题交互打通
3. **M3（正式实验）**：10 题完整逻辑 + 计数器 + 随机选项
4. **M4（数据闭环）**：埋点、问卷、后端入库、提交重试
5. **M5（优化上线）**：性能调优、兼容测试、灰度发布

---

## 15. 附录：文案基线（可直接使用）

- 欢迎标题：**物品功能退行认知匹配实验**
- 时长提示：**本次实验预计耗时 15 分钟，感谢您的参与！**
- 成功提示：**提交成功！再次感谢您的参与！**
- 失败提示：**提交失败，请检查网络后重试。**

---

如果需要，我可以继续帮你出下一版：
1）**接口字段级 JSON 示例**（可直接给前后端联调）；
2）**MySQL/PostgreSQL 建表 SQL**；
3）**前端埋点事件字典表（Excel 结构）**。

07/03命名修改清单
修改前 ｜ 修改后
2030_time_spray ｜ itr_01_2030_spray_bedroom
2030_soundbox	｜ itr_02_2030_soundbox_bedroom

2030_projector_02	｜ itr_03_2030_holographicProjector_bedroom

2030_light	｜ itr_04_2030_smartLight_bedroom

2030_laptop	｜ itr_05_2030_laptop_bedroom

2030_handphone	｜ itr_06_2030_smartPhone_bedroom

2030_digital_wallet	｜ itr_07_2030_digitalWallet_bedroom

2030_coffee_machine	｜ itr_08_2030_coffeeMachine_bedroom

2030_air_conditioner ｜ itr_09_2030_airConditioner_bedroom

2030_lighter	｜ itr_10_2030_electricLighter_bedroom

1930_time_spray ｜ itr_01_1930_spray_bedroom


1930_trumpet ｜ itr_02_1930_phonograph_bedroom

1930_radio ｜ itr_03_1930_radio_bedroom


1930_light	｜ itr_04_1930_0_keroseneLamp_bedroom

1930_typewriter	｜ itr_05_1930_0_typewriter_bedroom

1930_envelop	｜ itr_06_1930_envelope_bedroom

1930_bag	｜ itr_07_1930_purse_bedroom

1930_handmade_coffee	｜ itr_08_1930_handmadeCoffeeTools_bedroom

1930_heating	｜ itr_09_1930_heating_bedroom

1930_matchstick	｜ itr_10_1930_matchstick_bedroom

第二轮修改
修改前 ｜ 修改后
itr_03_2030_holographicProjector_bedroom	｜ itr_03_2030_holographicProjectorA_bedroom
2030_projector_01	｜ itr_03_2030_holographicProjectorB_bedroom
2030_table	｜ nonitr_01_2030_table_bedroom
2030_bed	｜ nonitr_02_2030_bed_bedroom
2030_tea_table	｜ nonitr_03_2030_teaTable_bedroom
2030_chair	｜ nonitr_04_2030_chair_bedroom
2030_sofa	｜nonitr_05_2030_sofa_bedroom
2030_door ｜ nonitr_06_2030_frontDoor_bedroom
2030_computer	｜ nonitr_07_2030_roboticTree_bedroom
1930_table	｜ nonitr_01_1930_table_bedroom
1930_door	｜ nonitr_06_1930_frontDoor_bedrom

