# dsh-photo-pick-local

English | [中文](README.zh.md)

Local provider for `ctx.photoPick`: confines paths under the session workspace, scores each image with a Host LLM vision route, and optionally gathers candidates via `ctx.mediaLibrary.search` when the media plugin is present.

Copied/adapted from media-local: workspace path policy, `prepareVisionImage` downscale, vision spacing/429 retry, and LLM stream + attachment upload.

## Behavior

1. Resolve candidates from `paths[]` and/or media `query` (images only; soft-capped).
2. Score each file with a quality rubric JSON (`score` / `reasons` / `flaws`).
3. Return top-K successful scores plus the full ranked list.

## Config

Cordis / settings namespace `photo-pick-local`: `visionEnabled`, `visionLlmProvider`, `visionModel`, `visionScorePrompt`, `maxVisionBytes`, `visionMaxEdgePx`, throttle fields.

Web UI (`dsh-photo-pick-ui`) exposes enable + model + scoring prompt over `GET/PUT /api/photo-pick/settings` (same Host catalog as Settings → Models).
