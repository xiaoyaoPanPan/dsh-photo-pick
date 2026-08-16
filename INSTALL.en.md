# Install guide (for AI agents)

[中文](INSTALL.md) | English

Follow these steps on the user's machine. Prefer PowerShell on Windows and bash on macOS/Linux.

## Goal

Install the DeepSeek Harness plugin **dsh-photo-pick** into the **web** profile, then install its Agent Preset, then verify.

Repo: https://github.com/xiaoyaoPanPan/dsh-photo-pick  
Install package: `github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app`

## Prerequisites

1. Node.js `^22.19 || >=24` and `pnpm` available.
2. Official `dsh` CLI available (`dsh --help` works), or use `npx -y --package @deepseek-ai/dsh dsh …`.
3. Web profile exists: if `~/.dsh/profiles/web` (Windows: `%USERPROFILE%\.dsh\profiles\web`) is missing, run `dsh web` once to initialize, then stop if needed.

## Install steps

### 1) Add the plugin

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

If `dsh` is not on PATH:

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

### 2) Allow prepare builds (common on pnpm ≥10)

Git installs run each package's `prepare` script. If the command fails mentioning `allowBuilds` / ignored build scripts:

1. Open `~/.dsh/profiles/web/pnpm-workspace.yaml` (create if missing).
2. Merge (do not wipe unrelated keys):

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

3. Prefer the **exact** package keys printed by pnpm if they differ.
4. Re-run the same `plugin add` command.

### 3) Install the Agent Preset

bash / macOS / Linux:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell:

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

### 4) Verify

1. Restart or hard-refresh `dsh web` (Ctrl/Cmd+Shift+R).
2. Open a workspace that contains photos.
3. Select Agent Preset **照片择优**.
4. Confirm Settings shows Photo pick / 照片择优, and the session header can open the photo-pick workspace.

## Uninstall (if asked)

```sh
dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

PowerShell:

```powershell
dsh plugin --profile web remove dsh-photo-pick-app
Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\.agent-presets\photo-pick" -ErrorAction SilentlyContinue
```

## Notes for the agent

- Do **not** require the Gitee fork `deepseek-harness-xy`; this plugin targets official dsh.
- Soft-optional: a media library providing `ctx.mediaLibrary` enables `query` candidate search; paths-only ranking works without it.
- Tell the user the result of each step (ok / failed + the exact error).
