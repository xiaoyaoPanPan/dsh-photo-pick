# Install notes (git / prebuilt lib)

[中文](OPENSOURCE.md) | English

**Users:** start from the [README](README.md) (“10 秒安装”) or [INSTALL.md](INSTALL.md) (Chinese) / [INSTALL.en.md](INSTALL.en.md).

This repo is a multi-package dsh plugin monorepo. Consumers install only `dsh-photo-pick-app`.

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## Install strategy (option A)

The repo **commits prebuilt `lib/`**. Git installs do not run `tsdown` on the consumer machine.

Each package’s `prepare` only checks that the entry exists, for example:

```js
node -e "require('node:fs').accessSync('lib/index.js')"
```

That means:

- No reliance on `tsdown` or other dev tools being installed for consumers
- `prepare` stays present so pnpm/npm resolve sibling `file:../…` deps inside the extracted monorepo
- A missing `lib/` fails immediately (catches forgotten artifact commits)

pnpm ≥10 may still block `prepare`. Paste the **exact key** from the first failed `add` into the profile `pnpm-workspace.yaml` (see [INSTALL.en.md](INSTALL.en.md)), re-run `add`, then:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Pin a commit when sharing: `github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`.

## Maintainer notes

- After changing `src/`, rebuild and **commit the updated `lib/`** (root `build-all.ps1` works on Windows).
- Keep sibling deps as `file:../…`; do not switch them to mutual `github:…#path:…` (nested git deps reintroduce the old failure mode).
- Keep `prepare` as an existence check; do not restore `tsdown --config tsdown.prepare.config.ts` for installs.
- `tsdown.prepare.config.ts` / `tsdown.client-standalone.ts` may remain for local builds; they are not the git-install path.
- Soft dependency on `ctx.mediaLibrary` only — do not hard-require a media plugin.
