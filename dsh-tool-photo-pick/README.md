# dsh-tool-photo-pick

English | [中文](README.zh.md)

Model-facing `photo_pick_best` over [`ctx.photoPick`](../dsh-photo-pick/README.md). Reads the session workspace cwd as the root. Does not import a concrete provider.

## Tools

| Tool | Args | Behavior |
|---|---|---|
| `photo_pick_best` | `paths?`, `query?`, `topK?`, `maxCandidates?`, `criteria?` | Score candidates; return picks + ranking |

Default coding presets do **not** mount this tool. Use the `photo-pick` agent preset.

## Known Limitations

- Requires vision provider/model configured on the local provider.
- `query` needs the media plugin; otherwise pass `paths`.
