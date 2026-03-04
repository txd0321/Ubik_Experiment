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
2. 操作教学
3. 练习题（1 题）
4. 正式实验（10 题）
5. 实验后问卷与数据提交

### 2.2 研究目标

验证被试在“现代物品退行到 1960 年代”语境下，对“功能对应关系”的认知匹配策略，并采集行为数据用于后续统计分析。

### 2.3 非目标（Out of Scope）

- 移动端完整适配（可后续扩展）
- 社交分享、排行榜等游戏化功能
- 多语言版本（当前仅中文）

---

## 3. 页面与信息架构

## 3.1 页面结构（5 步）

1. **Step 0：欢迎页**（静态）
2. **Step 1：操作教学页**（静态）
3. **Step 2：练习场景**（3D）
4. **Step 3：正式实验场景**（3D）
5. **Step 4：结束页 + 问卷**（静态表单）

## 3.2 路由建议

- `/` → 欢迎页
- `/tutorial` → 操作教学页
- `/practice` → 练习场景
- `/experiment` → 正式实验场景
- `/survey` → 结束问卷页

> 若使用单页应用（SPA），可通过状态机控制步骤，不强依赖 URL 路由。

## 3.3 状态机（核心）

- `INIT`
- `CONSENTED`
- `TUTORIAL_DONE`
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
- **视角**：鼠标拖拽（第一人称）
- **交互**：鼠标左键点击发光物品
- **UI 操作**：点击、单选、下拉、输入、按钮确认

## 4.2 交互对象状态

- `idle`：可交互，白色轮廓光
- `hover`：可选，增强轮廓光或轻微放大
- `answered`：已完成，绿色轮廓光，不可再次答题

## 4.3 UI 与视觉要求

- 面板：半透明白底（opacity≈0.9）、圆角、居中
- 文字：高对比度深色字体，保证可读性
- 计数器：左上角固定 `X/10 已完成`
- 加载：环形进度 + “加载中，请稍候”

## 4.4 时间口径统一

- `panel_open_at`：题目面板打开时刻
- `answer_confirm_at`：点击“确认选择”时刻
- `question_duration_ms = answer_confirm_at - panel_open_at`
- `total_duration_ms = survey_submit_at - experiment_start_at`

---

## 5. 分页面功能与交互细则

## 5.1 Step 0 欢迎页

### 页面元素

- 研究标题
- 实验时长提示
- 世界观背景说明
- “我已阅读并同意参与实验”勾选框
- “开始实验”按钮（默认禁用）

### 交互规则

- 未勾选同意：按钮禁用
- 勾选同意后：按钮可点击
- 点击开始：进入教学页，显示加载动画

### 埋点事件

- `welcome_view`
- `consent_checked`
- `start_experiment_click`

---

## 5.2 Step 1 操作教学页

### 页面元素

- 左侧操作说明（WASD、鼠标、点击）
- 右侧示意图（发光物品 + 面板）
- “进入场景”按钮

### 交互规则

- 点击“进入场景”后进入练习场景

### 埋点事件

- `tutorial_view`
- `enter_practice_click`

---

## 5.3 Step 2 练习题（3D）

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

## 5.4 Step 3 正式实验（3D）

### 场景配置

- 2026 现代客厅
- 10 个可交互物品（随机分布）
- 非交互背景物品用于环境真实感

### 交互规则

- 用户自由顺序答题（不强制路径）
- 每题 4 选 1，选项顺序随机
- 点击确认即记录，不反馈对错
- 该物品状态切为绿色、不可重复答
- 左上角计数器实时更新
- 完成 10 题后自动切换到结束问卷

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

## 5.5 Step 4 结束页 + 问卷

### 问卷结构

1. 最难题目（下拉，必填）
2. 判断依据（单选，必填）
3. 是否读过《尤比克》（单选，必填）
4. 补充反馈（多行文本，选填，<=500 字）

### 交互规则

- 必填项未完成时，“提交问卷”禁用
- 提交后统一上传全量实验数据
- 成功：显示成功提示，可返回首页
- 失败：显示错误提示，保留填写内容并可重试

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

- `src/pages`：5 个步骤页面
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
- `step`（welcome/tutorial/practice/formal/survey）
- `page_url`
- `client_ts`（毫秒）
- `device_info`（ua、屏幕分辨率）

## 9.2 关键业务事件

- 页面级：`*_view`
- 行为级：点击物品、选择选项、确认答案
- 流程级：步骤进入/离开、完成进度
- 提交级：提交发起、成功、失败、重试

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

- 5 个步骤可完整闭环走通
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