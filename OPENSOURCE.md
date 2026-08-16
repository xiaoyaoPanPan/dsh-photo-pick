# 安装说明（git / 预构建 lib）

中文 | [English](OPENSOURCE.en.md)

**普通用户：** 看 [README](README.md) 的「10 秒安装」，或直接打开 [INSTALL.md](INSTALL.md)。

本仓是多包 dsh 插件 monorepo。对外只装 `dsh-photo-pick-app`。

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## 安装策略（方案 A）

仓库**提交预构建的 `lib/`**。git 安装不现场跑 `tsdown`。

各包 `prepare` 只检查入口存在，例如：

```js
node -e "require('node:fs').accessSync('lib/index.js')"
```

这样：

- 不依赖 `tsdown` 等开发工具是否被装进消费者环境
- 仍保留 `prepare`，以便 pnpm/npm 在解压后的 monorepo 里正确解析兄弟包的 `file:../…`
- 缺 `lib/` 时立刻失败，方便发现漏交产物

pnpm ≥10 仍可能拦截 `prepare`。把第一次失败 `add` 打印的**整行键**写进 profile 的 `pnpm-workspace.yaml`（见 [INSTALL.md](INSTALL.md)），再跑 `add`，然后：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

对外分享请钉 commit：`github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`。

## 维护者备注

- 改 `src/` 后必须重建并**提交更新后的 `lib/`**（可用根目录 `build-all.ps1`）。
- 兄弟包继续用 `file:../…`；不要改成互指 `github:…#path:…`（嵌套 git 依赖会再次踩坑）。
- `prepare` 保持「存在性检查」，不要改回 `tsdown --config tsdown.prepare.config.ts`。
- `tsdown.prepare.config.ts` / `tsdown.client-standalone.ts` 可留作本地构建参考，但不是 git 安装路径。
- 对 `ctx.mediaLibrary` 仅软依赖，不要硬依赖 media 插件。
