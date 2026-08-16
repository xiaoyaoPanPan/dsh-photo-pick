# dsh-photo-pick

[English](README.md) | 中文

`ctx.photoPick` 的 Service Definition：在已挂载工作区下对近似照片打分并推荐最优几张。具体后端如 [`dsh-photo-pick-local`](../dsh-photo-pick-local) 实现抽象 {@link PhotoPick} 类。

## API

- `pickBest(root, options)` — 对候选集打分（显式 `paths` 和/或素材库 `query`），返回 top-K

盘符根或裸用户主目录以 `INVALID_ROOT` 拒绝。规范根外的路径以 `PATH_ESCAPE` 拒绝。

## Model Experience

经由 [`dsh-tool-photo-pick`](../dsh-tool-photo-pick/README.md) 间接暴露。

## Known Limitations

- 用 `query` 取候选时软依赖 `ctx.mediaLibrary`；只给 `paths` 时可不装 media。
- 当前是逐张质量打分排序，不是两两对决锦标赛。
