# dsh-photo-pick-local

[English](README.md) | 中文

`ctx.photoPick` 的本地 Provider：把路径限制在会话工作区内，用 Host LLM 视觉路由给每张图打质量分；若已安装 media 插件，可用 `ctx.mediaLibrary.search` 按 `query` 取候选。

从 media-local 复制/改编：工作区路径策略、`prepareVisionImage` 下采样、视觉限流/429 重试、LLM stream + attachment 上传。

## 行为

1. 从 `paths[]` 和/或 media `query` 解析候选（仅图片；有上限）。
2. 用质量 rubric JSON（`score` / `reasons` / `flaws`）逐张打分。
3. 返回成功分数的 top-K，以及完整排序列表。

## 配置

Cordis / settings 命名空间 `photo-pick-local`：`visionEnabled`、`visionLlmProvider`、`visionModel`、`visionScorePrompt`、`maxVisionBytes`、`visionMaxEdgePx`，以及限流字段。

Web UI（`dsh-photo-pick-ui`）通过 `GET/PUT /api/photo-pick/settings` 提供开关、模型与打分提示词（与「设置 → 模型」同一 Host 目录）。
