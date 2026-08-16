# 安装说明（git / prepare）

[English](OPENSOURCE.md) | 中文

本仓是多包 dsh 插件 monorepo。对外只装 `dsh-photo-pick-app`。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

从 git 安装拿到的是**源码**，不是 `lib/`。各包 `prepare` 会跑 `tsdown.prepare.config.ts`，在没有 harness monorepo 的情况下从 `src/` 转译（见官方[打包与安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)）。

pnpm ≥10 会拦截这些脚本，直到放行。把第一次失败 `add` 打印的键写进 `~/.dsh/profiles/web/pnpm-workspace.yaml`，例如：

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

再跑 `add`，然后：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

对外分享请钉 commit：`github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`。

## 维护者备注

- 兄弟包用 `file:../…`（装进 profile 所必需）。
- 本仓消费者不依赖 harness 的 `tsc -b`；`prepare` 才是安装构建。
- `dsh-photo-pick-ui` 的 prepare 走 `tsdown.client-standalone.ts`；壳层模块表变更时请同步。
- 对 `ctx.mediaLibrary` 仅软依赖，不要硬依赖 media 插件。
