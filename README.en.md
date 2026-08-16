<p align="center">
  <h1 align="center">dsh-photo-pick</h1>
  <p align="center"><b>Pick the best shot from a burst.</b><br/>A DeepSeek Harness (dsh) plugin that scores similar photos with vision and recommends winners.</p>
  <p align="center">
    <a href="./README.md">中文</a> ·
    <a href="./README.en.md">English</a> ·
    <a href="https://github.com/xiaoyaoPanPan/dsh-photo-pick/issues">Issues</a>
  </p>
  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen?style=flat-square" alt="Node.js" /></a>
    <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-111827?style=flat-square" alt="dsh-plugin" /></a>
    <a href="https://github.com/xiaoyaoPanPan/dsh-photo-pick/stargazers"><img src="https://img.shields.io/github/stars/xiaoyaoPanPan/dsh-photo-pick?style=flat-square" alt="Stars" /></a>
    <a href="https://github.com/xiaoyaoPanPan/dsh-photo-pick/issues"><img src="https://img.shields.io/github/issues/xiaoyaoPanPan/dsh-photo-pick?style=flat-square" alt="Issues" /></a>
  </p>
</p>

## Install in 10 seconds (recommended: give an AI this prompt)

Copy this prompt to Cursor / ChatGPT / Claude / DeepSeek Harness / your coding agent:

```text
Follow https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/INSTALL.en.md
strictly to install dsh-photo-pick into my DeepSeek Harness web profile.

Hard order (skipping a step fails):
1) Identify the home the running dsh web actually uses (DSH_HOME, else ~/.dsh / %USERPROFILE%\.dsh). Edit that profiles/web/pnpm-workspace.yaml and set blockExoticSubdeps: false (do not delete existing keys).
2) Run: dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
3) If allowBuilds / ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED: paste the exact key pnpm printed into the same pnpm-workspace.yaml, then re-run the same add. Do not edit the plugin source.
4) Run: pnpm --dir "<that home>/profiles/web" exec dsh-photo-pick-setup-preset
5) Hard-refresh or restart dsh web. Report each step with success/failure and the raw error.

After install: with dsh web running, GET /api/photo-pick/settings, check for any model with supportsVision=true, and report what you found.
- If yes: ask me whether to wire it into Photo pick; only if I agree, PUT the same endpoint with visionEnabled=true and that visionLlmProvider / visionModel.
- If no: walk me through https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/SETUP-VISION.en.md to add a vision-capable custom model (do not push a specific vendor), then ask again whether to wire it up.
```

Step-by-step details: [INSTALL.en.md](INSTALL.en.md).

## Or install yourself

Needs official `dsh`, `pnpm`, and a working `dsh web`.

**Order matters.** Edit config first, then `add`.

### 1) Allow git transitive deps (required on pnpm 11)

Edit the web profile `pnpm-workspace.yaml`:

- Default: `~/.dsh/profiles/web/pnpm-workspace.yaml` (Windows: `%USERPROFILE%\.dsh\profiles\web\pnpm-workspace.yaml`)
- If `DSH_HOME` is set: `$DSH_HOME/profiles/web/pnpm-workspace.yaml`

Merge (keep existing keys):

```yaml
blockExoticSubdeps: false
```

Skipping this usually yields `ERR_PNPM_EXOTIC_SUBDEP`.

### 2) Add the plugin

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

If `dsh` is not on PATH:

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

If pnpm asks for `allowBuilds`, paste the **exact printed key** under `allowBuilds:` in the same file, then re-run the same `add`.

### 3) Install the Agent Preset

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Windows PowerShell (default home):

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

Custom `DSH_HOME`:

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" exec dsh-photo-pick-setup-preset
```

### 4) Refresh

Hard-refresh or restart `dsh web` (Ctrl/Cmd+Shift+R). Scoring models: **Settings → Photo pick**; see [SETUP-VISION.en.md](SETUP-VISION.en.md).

## Use

### Switch mode and pick

1. **Mount a workspace with photos** (top-left folder) and **start a new chat**.
2. Open the mode dropdown above the composer (default **标准模式**) and switch to **照片择优**.

   ![Switch to Photo pick mode](docs/screenshots/mode-switch.png)

3. In the composer toolbar, click **照片择优** → the photo picker opens.

   ![Photo pick button under the composer](docs/screenshots/composer-button.png)

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

- Packages: `dsh-photo-pick` / `-local` / `-ui` / `dsh-tool-photo-pick` / `dsh-photo-pick-app` (consumers install app only).
- git / prebuilt `lib/`: [OPENSOURCE.en.md](OPENSOURCE.en.md) · AI install: [INSTALL.en.md](INSTALL.en.md) · AI vision: [SETUP-VISION.en.md](SETUP-VISION.en.md).
- Local: `dsh plugin --profile web add "file:./dsh-photo-pick-app"`, then `dsh-photo-pick-setup-preset`.

</details>
