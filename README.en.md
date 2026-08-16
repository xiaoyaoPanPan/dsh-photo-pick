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

### First time (once)

Open **Settings → Photo pick**: enable vision scoring, pick a vision-capable model, save. Without that, scoring fails later.

### Everyday ranking

1. **Mount a workspace with photos** (top-left folder, e.g. “我的照片”) and **start a new chat**.
2. Open the mode dropdown next to it (default **标准模式**) and switch to **照片择优**.
3. In the composer toolbar, click the **照片择优** button → the pick dialog opens.
4. Select photos → **Next** (optional this-batch criteria) → **Confirm to chat** → Send.
5. When the agent finishes, click **Compare** on the tool card.

Notes: the composer **照片择优** button appears only in **照片择优** mode. This-batch criteria apply once; long-term taste lives under Scoring standard in Settings.

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
