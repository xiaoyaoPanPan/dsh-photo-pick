<p align="center">
  <h1 align="center">dsh-photo-pick</h1>
  <p align="center"><b>从连拍里选出更好的那几张。</b><br/>DeepSeek Harness（dsh）插件：用视觉给近似照片打分并推荐。</p>
  <p align="center">
    <a href="./README.md">中文</a> ·
    <a href="./README.en.md">English</a> ·
    <a href="./INSTALL.md">AI 安装</a> ·
    <a href="./SETUP-VISION.md">AI 配视觉模型</a> ·
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

## 10 秒安装（推荐）

把下面这个提示词复制给 Cursor / ChatGPT / Claude / DeepseekHarness 等你正在用的编程 AI：

```text
请按这篇指南，把 dsh-photo-pick 安装到我本机的 DeepSeek Harness web profile，并完成验收：
https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/INSTALL.md
装完后告诉我每一步是否成功。
```

就这样。AI 会处理 `plugin add`、`allowBuilds` 和 Agent Preset。

## 或自己动手

需要官方 `dsh`，且 `dsh web` 能跑。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

若 pnpm 拦截构建脚本：把报错里的 `allowBuilds` 键写进 `~/.dsh/profiles/web/pnpm-workspace.yaml`，再跑同一条命令。然后：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Windows PowerShell：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

硬刷新或重启 `dsh web`。

## 配置视觉模型（推荐魔搭免费额度）

照片择优需要一个**能看图**的模型。DeepSeek 官方聊天路由是纯文本，不能用来打分。

我们日常推荐用 [魔搭社区 ModelScope](https://www.modelscope.cn/) 的免费推理 API（OpenAI 兼容，注册后一般有每日免费次数，以官网为准），起步可用 `Qwen/Qwen2.5-VL-7B-Instruct`（以魔搭页面仍提供 API 推理为准）。

**最快：把下面提示词复制给 AI**（加自定义提供方、声明看图能力、接到照片择优）：

```text
请按这篇指南，帮我在 DeepSeek Harness 里配置「照片择优」用的视觉模型（优先魔搭社区免费 API）：
https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/SETUP-VISION.md
需要 Token 时向我本机索取，不要把密钥写进公开文件或聊天记录。
配完后告诉我设置 → 照片择优里应选哪个模型，以及每一步是否成功。
```

自己动手的最短路径：

1. 魔搭注册并创建 [SDK Token](https://www.modelscope.cn/my/myaccesstoken)。  
2. **设置 → 模型 → 添加自定义提供方**：Base URL 填 `https://api-inference.modelscope.cn/v1/`，协议选 OpenAI 兼容，填 Token 与 VL 模型 id（示例：`Qwen/Qwen2.5-VL-7B-Instruct`）。  
3. 在 `~/.dsh/settings.yaml` 给该模型加上 `input: [text, image]`（自定义模型默认当纯文本，不加则打分会失败）。细节见 [SETUP-VISION.md](SETUP-VISION.md)。  
4. **设置 → 照片择优**：开启视觉打分，选刚配的模型，保存。

## 怎么用

### 切换模式使用

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
- git/`prepare`：[OPENSOURCE.md](OPENSOURCE.md) · AI 安装：[INSTALL.md](INSTALL.md) · AI 配视觉：[SETUP-VISION.md](SETUP-VISION.md)。
- 本地：`dsh plugin --profile web add "file:./dsh-photo-pick-app"`，再跑 `dsh-photo-pick-setup-preset`。

</details>
