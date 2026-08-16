# dsh-photo-pick

English | [中文](README.zh.md)

DeepSeek Harness plugin: rank similar photos and recommend the best ones. Install only [`dsh-photo-pick-app`](dsh-photo-pick-app/README.md).

| Package | Role |
|---|---|
| [`dsh-photo-pick`](dsh-photo-pick/README.md) | `ctx.photoPick` Service Definition |
| [`dsh-photo-pick-local`](dsh-photo-pick-local/README.md) | Local Provider (vision scoring; optional mediaLibrary query) |
| [`dsh-photo-pick-ui`](dsh-photo-pick-ui/README.md) | Web settings: enable scoring + pick vision model |
| [`dsh-tool-photo-pick`](dsh-tool-photo-pick/README.md) | Model tool `photo_pick_best` |
| [`dsh-photo-pick-app`](dsh-photo-pick-app/README.md) | Installable bundle + Agent Preset |

Works with the **official** dsh / Web profile. Soft-optional: if you also install a media-library plugin that provides `ctx.mediaLibrary`, `query` can gather candidates that way.

License: [MIT](LICENSE). Install notes for git/`prepare`: [OPENSOURCE.md](OPENSOURCE.md).

## Install (Web profile)

Requires a working `dsh` CLI and a `web` profile ([official docs](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)).

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

Git installs build from source via each package's `prepare` script. pnpm ≥10 blocks that until you allow it: the first `add` fails and prints keys — copy them into `~/.dsh/profiles/web/pnpm-workspace.yaml`, for example:

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

Re-run `add`, then install the Agent Preset:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell preset path:

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

Prefer pinning a commit when sharing: `github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`.

### Local checkout (contributors)

```sh
pnpm dsh plugin --profile web add "file:./dsh-photo-pick-app"
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Use `file:` (bare relative paths often become pnpm `link:` and sibling packages never land in the profile).

## After install

Restart `dsh web`, open a workspace with photo bursts, select the **照片择优** Agent Preset.

Open the session-header **照片择优** workspace: left folds for actions / **this-batch criteria** / scoring model / scoring standard; right folder-or-flat thumbnails with lightbox; Confirm-to-chat fills paths plus `criteria`, then ask the agent to run `photo_pick_best`. After ranking, open **Compare** on the tool card.

## Uninstall

```sh
prof="${DSH_HOME:-$HOME/.dsh}/profiles/web/package.json"
grep -q '"dsh-photo-pick-app"' "$prof" 2>/dev/null && pnpm dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

PowerShell:

```powershell
$pkg = "$env:USERPROFILE\.dsh\profiles\web\package.json"; if ((Test-Path $pkg) -and ((Get-Content $pkg -Raw) -match '"dsh-photo-pick-app"')) { pnpm dsh plugin --profile web remove dsh-photo-pick-app }; Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\.agent-presets\photo-pick" -ErrorAction SilentlyContinue
```
