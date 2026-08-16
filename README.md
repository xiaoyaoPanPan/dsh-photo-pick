# dsh-photo-pick

中文 | [English](README.en.md)

**从连拍里选出更好的那几张。** DeepSeek Harness（dsh）插件：用视觉给近似照片打分并推荐。

## 10 秒安装（推荐）

把下面整段复制给 Cursor / ChatGPT / Claude / 你正在用的编程 AI：

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

## 怎么用

### 第一次（只需一次）

1. 打开 `dsh web`，新建或打开一个**含照片的工作区**（会话要挂到该目录）。
2. 左上角 / 会话里把 Agent 换成 **照片择优**（装过 Preset 才会出现）。
3. 打开 **设置 → 照片择优**：勾选「启用视觉打分」，选一个能看图的模型（标「视觉」的），保存。

没配好看图模型时，后面打分会失败。

### 日常择优

1. 确认当前会话仍是 **照片择优** Preset。
2. 点会话顶栏的 **照片择优**，打开择优工作区。
3. 在右侧勾选要比较的照片（可切「目录 / 全部」、排序）。
4. 点 **下一步** →（可选）填「本组要求」，或点快捷芯片如「眼睛睁开」→ **确定并填入对话**。
5. 回到聊天输入框，直接 **发送**（文案里已带路径；有要求也会带上）。
6. Agent 跑完 `photo_pick_best` 后，在工具卡片点 **对比查看**，按分数浏览 / 左右对比。

说明：

- 「本组要求」只影响这一次；长期审美改左侧「打分标准」并保存。
- 顶栏入口只在 **照片择优** Preset 下出现；设置页装上插件后一直都在。
- 可选：另装并索引了素材库时，可用标签筛选；不装也能只靠勾选路径择优。

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
- git/`prepare`：[OPENSOURCE.md](OPENSOURCE.md) · AI 安装步骤：[INSTALL.md](INSTALL.md) · [English install](INSTALL.en.md)。
- 本地：`dsh plugin --profile web add "file:./dsh-photo-pick-app"`，再跑 `dsh-photo-pick-setup-preset`。

</details>
