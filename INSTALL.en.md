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

### 1) Allow git transitive deps (required on pnpm 11)

This plugin is a multi-package monorepo; siblings cross-reference with `github:…#path:`. pnpm blocks exotic (git) subdependencies by default — open that gate first.

Edit the profile `pnpm-workspace.yaml` (default `~/.dsh/profiles/web/pnpm-workspace.yaml`; if `DSH_HOME` is set, use `$DSH_HOME/profiles/web/pnpm-workspace.yaml`) and merge:

```yaml
blockExoticSubdeps: false
```

Do not delete unrelated existing keys.

### 2) Add the plugin

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

If `dsh` is not on PATH:

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

The repo ships prebuilt `lib/` and has **no** install-time `prepare` build. If pnpm still asks for `allowBuilds` (e.g. native `sharp`), paste the **exact key** it prints under `allowBuilds:` in the same `pnpm-workspace.yaml`, then re-run `add`.

### 3) Install the Agent Preset

bash / macOS / Linux:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell (default home):

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

Custom `DSH_HOME`:

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" exec dsh-photo-pick-setup-preset
```

### 4) Verify

1. Hard-refresh or restart `dsh web` (Ctrl/Cmd+Shift+R).
2. Open a workspace that contains photos.
3. Select the **Photo pick** Agent Preset.
4. Confirm Photo pick appears in settings and the session chrome can open the picker.

## Uninstall (if the user asks)

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
- Write `blockExoticSubdeps: false` **before** `plugin add`; the reverse order yields `ERR_PNPM_EXOTIC_SUBDEP`.
- If you still see `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND` / `file:../`, the install hit an old commit — confirm `main` is current.
- Soft-optional: a media library providing `ctx.mediaLibrary` enables `query` candidate search; paths-only ranking works without it.
- Tell the user the result of each step (ok / failed + the exact error).
