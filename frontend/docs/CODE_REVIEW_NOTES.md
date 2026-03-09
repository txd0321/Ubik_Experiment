# 代码审查备注

## 1. 依赖项

- **handleFormalItemClick**：已改为依赖 `[openFormalPanel]`，不再直接依赖 `formalAnsweredIds`（逻辑由 `openFormalPanel` 负责）。
- **handlePracticeItemClick**：当前依赖 `[]`，内部使用的 `openPracticePanel` 会随 `sessionId`/`step` 变化。若希望点击时一定用到最新的 `openPracticePanel`，可改为依赖 `[openPracticePanel]`。

## 2. 正式题与 slot 共用

- `formalSceneItems` 中 **smart-environment-lamp** 与 **plasma-lighter** 都使用 `slotOverride: 14`（同一槽位）。
- ThreeScene 会为每个 item 调用 `createItemVisual`，因此会在同一位置创建两个重叠的 3D 物体，且各自带不同的 `userData.itemId`。
- 点击时射线会命中其中某一个，用户可能先答“智能环境灯”或“电浆打火机”中的任一个，取决于命中顺序。若设计上就是“同一物体对应两道题”，建议在文档或注释中说明；若应为两个不同物体，需要为其中一题分配别的 slot。

## 3. 提交失败时的错误信息

- `submitSurvey` 的 `catch` 中只调用了 `track('survey_submit_failed')` 和 `setToast(...)`，没有记录或上报错误对象。
- 排查线上提交失败时，可考虑在开发环境下 `console.error(err)` 或把错误信息放入 payload 上报，便于定位网络/服务端问题。

## 4. 其他

- **practiceSceneItems** 的 `useMemo` 依赖为 `[]`，其中 `answered` 恒为 `false`。当前流程下练习结束后会进入正式实验，不依赖该字段更新，若后续要在练习场景中展示“已作答”状态，需要改为依赖练习作答状态并更新 `answered`。
- **buildExportPayload** 的依赖数组未包含 ref（如 `trajectoryRef`、`formalInteractionRecordsRef`）：这是合理的，因为 ref 的 `.current` 在调用时读取即可，不需要作为依赖。
