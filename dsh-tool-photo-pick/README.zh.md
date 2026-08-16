# dsh-tool-photo-pick

[English](README.md) | 中文

面向模型的 `photo_pick_best`，挂在 [`ctx.photoPick`](../dsh-photo-pick/README.md) 上。用会话工作区 cwd 作为根。不导入具体 Provider。

## 工具

| 工具 | 参数 | 行为 |
|---|---|---|
| `photo_pick_best` | `paths?`, `query?`, `topK?`, `maxCandidates?`, `criteria?` | 给候选打分；返回 picks + 完整排序 |

默认 coding preset **不会**挂此工具。请用 `photo-pick` Agent Preset。

## Known Limitations

- 需要在 local provider 配置视觉 provider/model。
- `query` 依赖 media 插件；否则请传 `paths`。
