# 安装说明（git / 预构建 lib）

中文 | [English](OPENSOURCE.en.md)

**普通用户：** 看 [README](README.md) 的「10 秒安装」，或直接打开 [INSTALL.md](INSTALL.md)。

本仓是多包 dsh 插件 monorepo。对外只装 `dsh-photo-pick-app`。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## 安装策略

1. **预构建 `lib/`**：仓库提交可运行产物；各包**不设**安装期 `prepare`（避免 pnpm 对 git 包跑嵌套 `npm install` 去解析私有 peer）。
2. **兄弟依赖用 `github:…#path:`**：不要用 `file:../…`（pnpm 会错解析到用户 profile 目录，见 [pnpm#9141](https://github.com/pnpm/pnpm/issues/9141)）。
3. **消费者 profile 需** `blockExoticSubdeps: false`：否则传递的 git 依赖会被 pnpm 11 拒绝（`ERR_PNPM_EXOTIC_SUBDEP`）。

完整步骤见 [INSTALL.md](INSTALL.md)。

## 维护者备注

- 改 `src/` 后必须重建并**提交更新后的 `lib/`**（可用根目录 `build-all.ps1`）。
- 兄弟包依赖保持 `github:xiaoyaoPanPan/dsh-photo-pick#path:<包目录>`；不要改回 `file:../…`。
- 不要恢复安装期 `prepare` / `tsdown`，除非改成不触发嵌套 `npm install` 的方案。
- 本地开发：克隆本仓后可用 `dsh plugin add "file:./dsh-photo-pick-app"`。
- 对 `ctx.mediaLibrary` 仅软依赖，不要硬依赖 media 插件。
