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

### 1) 添加插件

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

若 PATH 里没有 `dsh`：

```sh
npx -y --package @deepseek-ai/dsh dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

### 2) 放行 prepare 构建（pnpm ≥10 很常见）

从 Git 安装会跑各包 `prepare`。若报错提到 `allowBuilds` / ignored build scripts：

1. 打开 `~/.dsh/profiles/web/pnpm-workspace.yaml`（没有就新建）。
2. 合并写入（不要删掉已有无关键）：

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

3. 若 pnpm 打印了别的键名，以打印为准。
4. 再跑一遍同样的 `plugin add`。

### 3) 安装 Agent Preset

bash / macOS / Linux：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
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
- 软可选：有提供 `ctx.mediaLibrary` 的素材库时可用 `query`；只传路径也能择优。
- 每一步向用户汇报结果（成功 / 失败 + 原始报错）。
