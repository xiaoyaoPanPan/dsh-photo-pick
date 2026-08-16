<p align="center">
  <h1 align="center">dsh-photo-pick</h1>
  <p align="center"><b>从连拍里选出更好的那几张。</b><br/>DeepSeek Harness（dsh）插件：用视觉给近似照片打分并推荐。</p>
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

## 10 秒安装（推荐：交给 AI）

复制下面提示词，发给 Cursor / ChatGPT / Claude / DeepSeek Harness 等你正在用的 AI：

```text
请严格按 https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/INSTALL.md
把 dsh-photo-pick 装进本机 DeepSeek Harness 的 web profile。

硬性顺序（缺一步会失败）：
1) 先确认当前 dsh web 实际使用的 home（环境变量 DSH_HOME，或默认 ~/.dsh / %USERPROFILE%\.dsh），再改对应 profiles/web/pnpm-workspace.yaml：写入 blockExoticSubdeps: false（不要删已有键）。
2) 再执行：dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
3) 若报 allowBuilds / ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED：把 pnpm 打印的整行键写入同一 pnpm-workspace.yaml，再重跑同一条 add。不要改插件源码。
4) 再执行：pnpm --dir "<上面那个 home>/profiles/web" exec dsh-photo-pick-setup-preset
5) 硬刷新或重启 dsh web，汇报每步成功/失败与原始报错。

装完后：确认 dsh web 已开，GET /api/photo-pick/settings，检查是否已有 supportsVision=true 的模型，并告诉我结果。
- 若有：先问我要不要接到「照片择优」；我同意后再 PUT 同接口：visionEnabled=true，并写入对应 visionLlmProvider / visionModel。
- 若无：按 https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/SETUP-VISION.md 教我怎么加一个能看图的自定义模型（不要替我选定某一家平台），加完再问我是否接通。
```

更细的逐步说明见 [INSTALL.md](INSTALL.md)。

## 或自己动手安装

需要：官方 `dsh`、`pnpm`、已能打开的 `dsh web`。

**顺序不能反。** 先改配置，再 `add`。

### 1）放开 git 传递依赖（pnpm 11 必需）

打开 web profile 的 `pnpm-workspace.yaml`：

- 默认：`~/.dsh/profiles/web/pnpm-workspace.yaml`（Windows：`%USERPROFILE%\.dsh\profiles\web\pnpm-workspace.yaml`）
- 若启动时设置了 `DSH_HOME`：用 `$DSH_HOME/profiles/web/pnpm-workspace.yaml`

合并写入（保留原有内容）：

```yaml
blockExoticSubdeps: false
```

不写这一步，常见报错：`ERR_PNPM_EXOTIC_SUBDEP`。

### 2）添加插件

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

PATH 里没有 `dsh` 时：

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

若报 `allowBuilds`：把 pnpm 打印的**整行键**写进同一 `pnpm-workspace.yaml` 的 `allowBuilds:`，再重跑同一条 `add`。

### 3）安装 Agent Preset

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Windows PowerShell（默认 home）：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

自定义 `DSH_HOME`：

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" exec dsh-photo-pick-setup-preset
```

### 4）刷新

硬刷新或重启 `dsh web`（Ctrl/Cmd+Shift+R）。打分模型在 **设置 → 照片择优**；细节见 [SETUP-VISION.md](SETUP-VISION.md)。

## 怎么用

### 新对话中选择照片择优模式

1. **挂载有照片的工作区**（左上角目录），并**新建对话**。
2. 点对话框上方的模式下拉（默认「标准模式」），换成 **照片择优**。

   ![切换到照片择优模式](docs/screenshots/mode-switch.png)

3. 在对话框下方工具栏点 **照片择优** → 弹出选图窗口。

   ![输入框下方的照片择优按钮](docs/screenshots/composer-button.png)

4. 勾选要比较的照片 → **下一步**（可选填「本组要求」）→ **确定并填入对话** → 发送。
5. Agent 跑完后，在工具卡片点 **对比查看**。

说明：输入框下的「照片择优」按钮，只在模式为 **照片择优** 时出现。「本组要求」只影响这一次；长期审美改设置里的「打分标准」。

## 卸载

```sh
dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

## 作者

[xiaoyaoPanPan](https://github.com/xiaoyaoPanPan) · [Issues](https://github.com/xiaoyaoPanPan/dsh-photo-pick/issues) · [MIT](LICENSE)

<details>
<summary>给开发者</summary>

- 包：`dsh-photo-pick` / `-local` / `-ui` / `dsh-tool-photo-pick` / `dsh-photo-pick-app`（对外只装 app）。
- git / 预构建 `lib/`：[OPENSOURCE.md](OPENSOURCE.md) · AI 安装：[INSTALL.md](INSTALL.md) · AI 配视觉：[SETUP-VISION.md](SETUP-VISION.md)。
- 本地：`dsh plugin --profile web add "file:./dsh-photo-pick-app"`，再跑 `dsh-photo-pick-setup-preset`。

</details>
