# dsh-photo-pick

[中文](README.md) | English

**Pick the best shot from a burst.** A DeepSeek Harness (dsh) plugin that scores similar photos with vision and recommends winners.

## Install in 10 seconds (recommended)

Copy this to Cursor / ChatGPT / Claude / your coding agent:

```text
Install and configure dsh-photo-pick for my DeepSeek Harness web profile by following
https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/INSTALL.en.md
Then run the verification steps and tell me the result.
```

That’s it. The agent handles `plugin add`, `allowBuilds`, and the Agent Preset.

## Or install yourself

Needs official `dsh` and a `web` profile (`dsh web` works).

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

If pnpm blocks build scripts, add the printed `allowBuilds` keys under `~/.dsh/profiles/web/pnpm-workspace.yaml`, then re-run the same command. Next:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Windows PowerShell:

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

Hard-refresh or restart `dsh web`.

## Use

1. Open a workspace with photos.
2. Select Agent Preset **照片择优**.
3. Open the session-header **照片择优** workspace → pick photos / criteria → Confirm to chat.
4. Ask the agent to run `photo_pick_best`, then open **Compare** on the tool card.

Optional: if you also have a media-library plugin with `ctx.mediaLibrary`, you can gather candidates via `query`. Paths-only ranking works without it.

## Uninstall

```sh
dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

## Author

[xiaoyaoPanPan](https://github.com/xiaoyaoPanPan) · [Issues](https://github.com/xiaoyaoPanPan/dsh-photo-pick/issues) · [MIT](LICENSE)

<details>
<summary>For developers</summary>

- Packages: `dsh-photo-pick` / `-local` / `-ui` / `dsh-tool-photo-pick` / `dsh-photo-pick-app` (install only the app).
- Git/`prepare` notes: [OPENSOURCE.md](OPENSOURCE.md) · AI install: [INSTALL.md](INSTALL.md) (中文) / [INSTALL.en.md](INSTALL.en.md).
- Local checkout: `dsh plugin --profile web add "file:./dsh-photo-pick-app"` then run `dsh-photo-pick-setup-preset`.

</details>
