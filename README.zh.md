# dsh-photo-pick

[English](README.md) | 中文

**从连拍里选出更好的那几张。** DeepSeek Harness（dsh）插件：用视觉给近似照片打分并推荐。

## 10 秒安装（推荐）

把下面整段复制给 Cursor / ChatGPT / Claude / 你正在用的编程 AI：

```text
请按这篇指南，把 dsh-photo-pick 安装到我本机的 DeepSeek Harness web profile，并完成验收：
https://github.com/xiaoyaoPanPan/dsh-photo-pick/blob/main/INSTALL.zh.md
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

## 怎么用

1. 打开含照片的工作区。
2. 选择 Agent Preset **照片择优**。
3. 打开会话顶栏 **照片择优** 工作区 → 选图 / 填要求 → 填入对话。
4. 让 Agent 跑 `photo_pick_best`，再在工具卡片点 **对比查看**。

可选：若另装了带 `ctx.mediaLibrary` 的素材库，可用 `query` 取候选；只选路径也能择优。

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
- git/`prepare`：[OPENSOURCE.zh.md](OPENSOURCE.zh.md) · AI 安装步骤：[INSTALL.zh.md](INSTALL.zh.md)。
- 本地：`dsh plugin --profile web add "file:./dsh-photo-pick-app"`，再跑 `dsh-photo-pick-setup-preset`。

</details>
