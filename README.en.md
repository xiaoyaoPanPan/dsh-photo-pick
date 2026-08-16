<p align="center">
  <h1 align="center">dsh-photo-pick</h1>
  <p align="center"><b>Pick the best shot from a burst.</b><br/>A DeepSeek Harness (dsh) plugin that scores similar photos with vision and recommends winners.</p>
  <p align="center">
    <a href="./README.md">中文</a> ·
    <a href="./README.en.md">English</a> ·
    <a href="./INSTALL.en.md">AI install</a> ·
    <a href="./SETUP-VISION.en.md">AI vision setup</a> ·
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

## Install in 10 seconds (recommended)

Copy this prompt to Cursor / ChatGPT / Claude / DeepSeek Harness / your coding agent:

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

## Configure a vision model (ModelScope recommended)

Scoring needs a **vision / VL** model. Stock DeepSeek chat routes are usually **text-only** and cannot score photos.

We recommend [ModelScope](https://www.modelscope.cn/) free OpenAI-compatible APIs (daily quota after signup; check their site). A light starter: `Qwen/Qwen2.5-VL-7B-Instruct` (must show API inference on their site).

**Fastest: paste this to your coding agent:**

```text
Follow this guide to configure a free ModelScope vision model in DeepSeek Harness for dsh-photo-pick:
https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/SETUP-VISION.en.md
Ask me for the token when needed; never write secrets into public files.
When done, tell me each step’s result and which model to pick under Settings → Photo pick.
```

**Or click through yourself:**

1. Create a [ModelScope SDK token](https://www.modelscope.cn/my/myaccesstoken).  
2. **Settings → Models → Add custom provider**: Base URL `https://api-inference.modelscope.cn/v1/`, OpenAI-compatible protocol, your token, and a VL model id (e.g. `Qwen/Qwen2.5-VL-7B-Instruct`).  
3. In `~/.dsh/settings.yaml`, set `input: [text, image]` on that model (custom models default to text-only). Details: [SETUP-VISION.en.md](SETUP-VISION.en.md).  
4. **Settings → Photo pick**: enable scoring, select that vision model, save.

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

- Packages: `dsh-photo-pick` / `-local` / `-ui` / `dsh-tool-photo-pick` / `dsh-photo-pick-app` (install only the app).
- Git/`prepare` notes: [OPENSOURCE.md](OPENSOURCE.md) · AI install: [INSTALL.md](INSTALL.md) (中文) / [INSTALL.en.md](INSTALL.en.md).
- Local checkout: `dsh plugin --profile web add "file:./dsh-photo-pick-app"` then run `dsh-photo-pick-setup-preset`.

</details>
