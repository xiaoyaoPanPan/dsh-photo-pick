# 安装说明（git / 预构建 lib）

中文 | [English](OPENSOURCE.en.md)

**普通用户：** 看 [README](README.md) 的「10 秒安装」，或直接打开 [INSTALL.md](INSTALL.md)。

本仓是多包 dsh 插件 monorepo。对外只装 `dsh-photo-pick-app`。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## 安装策略

1. **预构建 `lib/`**：仓库提交可运行产物；`prepare` 只检查 `lib/index.js` 存在，不跑 `tsdown`。
2. **兄弟依赖用 `github:…#path:`**：不要用 `file:../…`。pnpm 从 GitHub 装子目录时会把 `file:../` 错解析到用户 profile 目录（见 [pnpm#9141](https://github.com/pnpm/pnpm/issues/9141)）。

pnpm ≥10 仍可能拦截 `prepare`。把第一次失败 `add` 打印的**整行键**写进 profile 的 `pnpm-workspace.yaml`（见 [INSTALL.md](INSTALL.md)），再跑 `add`，然后：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

对外分享请钉 commit：`github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`。

## 维护者备注

- 改 `src/` 后必须重建并**提交更新后的 `lib/`**（可用根目录 `build-all.ps1`）。
- 兄弟包依赖保持 `github:xiaoyaoPanPan/dsh-photo-pick#path:<包目录>`；不要改回 `file:../…`。
- `prepare` 保持「存在性检查」，不要改回 `tsdown --config tsdown.prepare.config.ts`。
- 本地开发：克隆本仓后可用 `dsh plugin add "file:./dsh-photo-pick-app"`（路径相对 checkout 根）。
- 对 `ctx.mediaLibrary` 仅软依赖，不要硬依赖 media 插件。
