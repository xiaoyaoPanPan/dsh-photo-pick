# dsh-photo-pick

[English](README.md) | 中文

DeepSeek Harness 插件：对近似照片打分并推荐更好的几张。对外只装 [`dsh-photo-pick-app`](dsh-photo-pick-app/README.md)。

| 包 | 职责 |
|---|---|
| [`dsh-photo-pick`](dsh-photo-pick/README.md) | `ctx.photoPick` Service Definition |
| [`dsh-photo-pick-local`](dsh-photo-pick-local/README.md) | 本地 Provider（视觉打分；可选 mediaLibrary 检索取候选） |
| [`dsh-photo-pick-ui`](dsh-photo-pick-ui/README.md) | Web 设置：开关打分 + 选择视觉模型 |
| [`dsh-tool-photo-pick`](dsh-tool-photo-pick/README.md) | 模型工具 `photo_pick_best` |
| [`dsh-photo-pick-app`](dsh-photo-pick-app/README.md) | 可安装组合包 + Agent Preset |

面向**官方原版** dsh / Web profile。软可选：若另装提供 `ctx.mediaLibrary` 的素材库插件，可用 `query` 取候选。

许可证：[MIT](LICENSE)。git / `prepare` 说明：[OPENSOURCE.zh.md](OPENSOURCE.zh.md)。

## 作者

维护者：[xiaoyaoPanPan](https://github.com/xiaoyaoPanPan)  
问题反馈：[github.com/xiaoyaoPanPan/dsh-photo-pick/issues](https://github.com/xiaoyaoPanPan/dsh-photo-pick/issues)

## 安装（Web profile）

需要已安装的 `dsh` CLI 与 `web` profile（[官方文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)）。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

从 git 安装会通过各包 `prepare` 从源码构建。pnpm ≥10 会拦截，直到你放行：第一次 `add` 失败并打印键名——写进 `~/.dsh/profiles/web/pnpm-workspace.yaml`，例如：

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

再跑一次 `add`，然后装 Agent Preset：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

PowerShell：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" exec dsh-photo-pick-setup-preset
```

对外分享建议钉 commit：`github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`。

### 本地检出（贡献者）

```sh
pnpm dsh plugin --profile web add "file:./dsh-photo-pick-app"
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

务必使用 `file:`（裸相对路径常变成 pnpm `link:`，兄弟包进不了 profile）。

## 安装后

重启 `dsh web`，打开含连拍照片的工作区，选择 **照片择优** Agent Preset。

打开会话顶栏 **照片择优** 工作区：左侧为操作 / **本组要求** / 打分模型 / 打分标准；右侧缩略图 + 预览；「确定并填入对话」后让 Agent 跑 `photo_pick_best`。完成后在工具卡片点 **对比查看**。

## 卸载

```sh
prof="${DSH_HOME:-$HOME/.dsh}/profiles/web/package.json"
grep -q '"dsh-photo-pick-app"' "$prof" 2>/dev/null && pnpm dsh plugin --profile web remove dsh-photo-pick-app
rm -rf "${DSH_HOME:-$HOME/.dsh}/.agent-presets/photo-pick"
```

PowerShell：

```powershell
$pkg = "$env:USERPROFILE\.dsh\profiles\web\package.json"; if ((Test-Path $pkg) -and ((Get-Content $pkg -Raw) -match '"dsh-photo-pick-app"')) { pnpm dsh plugin --profile web remove dsh-photo-pick-app }; Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\.agent-presets\photo-pick" -ErrorAction SilentlyContinue
```
