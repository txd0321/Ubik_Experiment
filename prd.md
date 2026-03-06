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

### 场景配置

- 极简小房间
- 1 个可交互物：LED 台灯
- 初始视角朝向台灯

### 交互流程

1. 用户靠近并点击台灯
2. 弹出题目面板（4 个图文选项）
3. 选择后启用“确认选择”
4. 点击确认后展示对错反馈
5. 3 秒后显示“进入正式实验”按钮

### 题目与反馈

- 题干：LED 台灯退行到 1960 年代最可能变成什么
- 正确选项：煤油灯
- 练习题需显示对错解释

### 埋点事件

- `practice_scene_loaded`
- `practice_object_clicked`
- `practice_option_selected`
- `practice_answer_submitted`
- `practice_feedback_shown`
- `enter_formal_experiment_click`

---

## 5.4 Step 2 正式实验（3D）

### 场景配置

●2026 现代客厅
●10 个可交互物品（随机分布）
（点击前者会弹出题目，答完题目之后会变成后者）
喷雾 - 雾罐
智能音箱 - 大喇叭
投影仪 - 收音机
环境灯-煤油灯
笔记本电脑 - 机械打字机
智能手机 - 牛皮纸信封
数字钱包 - 钱袋与银币
智能咖啡机 - 研磨机、铜炉
中央空调 - 暖气片
打火机 - 火柴盒
●其他模型为非交互背景物品用于环境真实感



### 交互规则

- 用户自由顺序答题（不强制路径）
- 每题 4 选 1，选项顺序随机
题目内容：
1. 纳米修复喷雾 (Spray)
A： 现代圆柱形运动水壶（visual）
B： 老式马口铁气雾罐 （spray）（narrative）
C： 游乐场旋转木马（baseline 无关项）
D： 带有发光液体的魔法药水瓶（semantic）
2. 智能音箱 (Soundbox)
A： 现代头戴式无线耳机（semantic）
B： 木质复古相框（baseline 无关项）
C： 表面光滑的深灰色圆石（visual）
D： 大喇叭铜质留声机（narrative）
3. 全息投影仪 (Holographic Projector)
A： 古董幻灯机（narrative）
B： 铁制家用剪刀（bseline 无关项）
C： 现代极简透明玻璃立方体/花瓶（visual）
D： 宽屏超薄液晶显示器（semantic）
4. 智能环境灯 (Smart Light)
A： 强光手电筒（semantic）
B： 手提式煤油马灯（narrative）
C： 发光的磨砂白色乒乓球（visual）
D： 玻璃水杯（baseline 无关项）
5. 笔记本电脑 (Laptop)
A： 传统的木框算盘（semantic）
B： 雷明顿机械打字机（narrative）
C： 银色不锈钢咖啡托盘（baseline 无关项）
D： 折叠式便携梳妆镜（visual）
6. 智能手机 (Smartphone)
A： 牛皮纸信封（narrative）
B： 火柴盒（semantic）
C： 陶瓷烟灰缸（baseline 无关项）
D： 黑色磨砂石板（visual）
7. 数字钱包 (Digital Wallet)
A： 黑色扁平充电宝（visual）
B： 磨损的皮革钱袋与银币（narrative）
C： 手持雨伞的手柄（baseline无关项）
D： 纸质银行存折（semantic）
8. 智能咖啡机 (Coffee Machine)
A： 金属垃圾桶（visual）
B： 旧报纸（baseline 无关项）
C： 手摇研磨机、炭火铜炉（narrative）
D： 咖啡包装袋（semantic）
9. 智能中央空调 (Air Conditioner)
A： 墙上的白色横梁（visual）
B： 绿色盆栽（baseline 无关项）
C： 三叶电风扇（semantic）
D： 铸铁暖气片（narrative）
10. 电浆打火机 (Electric Lighter)
A： 塑料美发梳（baseline 无关项）
B： 聚光放大镜（semantic）
C： 木制火柴盒（narrative）
D： 圆柱金属外壳口红（visual）

- 点击确认即记录，不反馈对错
- 该2030年代物品会逐渐快速缩小到消失，然后相对应的1930年代物体会从0放大，像“嘭的一声”变出来的一样，状态切为灰色、不可重复答
- 左上角计数器实时更新
- 完成 10 题后页面中其他的除了可互动的物体之外所有的物体以及环境都逐渐切换成1930年的。

### 关键约束

- 选项图清晰可辨
- 面板弹出时仍可观察场景
- 全程无正误提示

### 埋点事件（每题）

- `formal_object_clicked`
- `formal_question_opened`
- `formal_option_hover`（可选）
- `formal_option_selected`
- `formal_answer_submitted`
- `formal_progress_updated`
- `formal_all_completed`

---

## 5.5 Step 3 结束页 + 问卷

### 问卷结构

针对你刚才交互过的 10 组物品，请根据实际感受打分。
1.任务难度：
● “回顾刚才的交互过程（见下方缩略图提示），请评估各物品‘退行判断’的难度：”评分量表：1（非常简单） - 7（非常困难）
●视觉辅助：此处应并排展示 10 组物品的 2026 态与 1939 态对比图，防止记忆磨损。
2.核心难点追问 (多选题)：
● “对于你认为难度 ≥5 分的物品，主要的困难来源于？”选项 A：视觉干扰项（如形状、颜色）非常有迷惑性。
●选项 B：难以联想到 100 年前对应功能的物理实体（逻辑跨度大）。
●选项 C：不确定该物品在《尤比克》世界观下的演变规则。
●选项 D：选项中没有我认为完全合理的答案。
3.决策依据偏好 (多选题)：
● “你在判断物品‘应该退化成什么’时，最主要的依据是？”选项 A：（视觉匹配）选择与原物形状、材质、空间比例最接近的物体。
●选项 B：（功能外推 (NLE)）：寻找核心用途一致、但技术层级属于旧时代的物体。
●选项 C：（原著记忆）：基于对《尤比克》小说中具体情节或设定的了解。
●选项 D：（直觉驱动）：没有明确逻辑，根据第一反应随机选择。
4.环境细节感知：
● “在实验过程中，你是否察觉到房间内除了目标物品外的其他细节变化（如灯光变昏暗、环境音出现底噪、墙皮脱落等）？”是
●否
●若选择“是”，请简述这些变化是否增强了你对“退行逻辑”的理解或影响了你的决策：________________
5.叙事存在感自评：
● “你觉得自己多大程度上‘进入’（即感受到真实感与紧迫感）了这个正在崩塌的《尤比克》虚拟世界？”评分量表：1（完全没有共鸣） - 7（极度沉浸）
6.请问您对本次试验有什么建议


### 交互规则

●全部题目为必须填写的，必填项未完成时，“提交问卷”禁用
●提交成功后出现已提交反馈
●提交后统一上传全量实验数据
●成功：显示成功提示，可返回首页
●失败：显示错误提示，保留填写内容并可重试


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