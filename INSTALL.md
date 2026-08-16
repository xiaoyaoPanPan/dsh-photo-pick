# 安装指南（给 AI 用）

中文 | [English](INSTALL.en.md)

在用户机器上按步骤执行。Windows 优先 PowerShell，macOS/Linux 用 bash。

## 目标

把 DeepSeek Harness 插件 **dsh-photo-pick** 装进 **web** profile，再装 Agent Preset，并完成验收。

仓库：https://github.com/xiaoyaoPanPan/dsh-photo-pick  
安装包：`github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app`

## 前置

1. Node.js `^22.19 || >=24`，且有 `pnpm`。
2. 已有官方 `dsh`（`dsh --help` 可用），或用 `npx -y --package @deepseek-ai/dsh dsh …`。
3. 已有 web profile：若没有 `~/.dsh/profiles/web`（Windows：`%USERPROFILE%\.dsh\profiles\web`），先跑一次 `dsh web` 初始化。

## 安装步骤

### 1) 允许 git 传递依赖（pnpm 11 必需）

本插件是多包 monorepo，兄弟包用 `github:…#path:` 互指。pnpm 默认禁止「传递的 git 依赖」，需先放开。

打开 profile 的 `pnpm-workspace.yaml`（默认 `~/.dsh/profiles/web/pnpm-workspace.yaml`；若设置了 `DSH_HOME`，用 `$DSH_HOME/profiles/web/pnpm-workspace.yaml`），合并：

```yaml
blockExoticSubdeps: false
```

不要删掉文件里已有的其它键。

### 2) 添加插件

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

若 PATH 里没有 `dsh`：

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

仓库已带预构建 `lib/`，**没有**安装期 `prepare` 编译。若仍报 `allowBuilds`（例如 `sharp` 原生模块），把 pnpm 打印的**整行键**写入同一 `pnpm-workspace.yaml` 的 `allowBuilds:`，再重跑 `add`。

### 3) 安装 Agent Preset

bash / macOS / Linux：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell（默认 home）：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

若使用了自定义 `DSH_HOME`：

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" exec dsh-photo-pick-setup-preset
```

### 4) 验收

1. 重启或硬刷新 `dsh web`（Ctrl/Cmd+Shift+R）。
2. 打开含照片的工作区。
3. 选择 Agent Preset **照片择优**。
4. 确认设置里有照片择优，会话顶栏能打开择优工作区。

## 卸载（若用户要求）

```sh
dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

PowerShell：

```powershell
dsh plugin --profile web remove dsh-photo-pick-app
Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\.agent-presets\photo-pick" -ErrorAction SilentlyContinue
```

## 给 Agent 的备注

- **不要**要求用户先装 Gitee fork `deepseek-harness-xy`；本插件面向官方 dsh。
- 必须先写 `blockExoticSubdeps: false`，再 `plugin add`；顺序反了会报 `ERR_PNPM_EXOTIC_SUBDEP`。
- 若见 `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND` / `file:../`，说明装到了旧 commit，请确认拉的是最新 `main`。
- 软可选：有提供 `ctx.mediaLibrary` 的素材库时可用 `query`；只传路径也能择优。
- 每一步向用户汇报结果（成功 / 失败 + 原始报错）。
