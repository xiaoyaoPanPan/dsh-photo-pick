# Install notes (git / prebuilt lib)

[中文](OPENSOURCE.md) | English

**Users:** start from the [README](README.md) (“10 秒安装”) or [INSTALL.md](INSTALL.md) (Chinese) / [INSTALL.en.md](INSTALL.en.md).

This repo is a multi-package dsh plugin monorepo. Consumers install only `dsh-photo-pick-app`.

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## Install strategy

1. **Prebuilt `lib/`**: commit runnable artifacts; `prepare` only checks that `lib/index.js` exists (no `tsdown` on the consumer machine).
2. **Sibling deps use `github:…#path:`**: do not use `file:../…`. When pnpm installs a GitHub subpath package, it resolves `file:../` against the consumer profile directory ([pnpm#9141](https://github.com/pnpm/pnpm/issues/9141)).

pnpm ≥10 may still block `prepare`. Paste the **exact key** from the first failed `add` into the profile `pnpm-workspace.yaml` (see [INSTALL.en.md](INSTALL.en.md)), re-run `add`, then:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Pin a commit when sharing: `github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`.

## Maintainer notes

- After changing `src/`, rebuild and **commit the updated `lib/`** (root `build-all.ps1` works on Windows).
- Keep sibling deps as `github:xiaoyaoPanPan/dsh-photo-pick#path:<package-dir>`; do not revert to `file:../…`.
- Keep `prepare` as an existence check; do not restore `tsdown --config tsdown.prepare.config.ts` for installs.
- Local development: after cloning this repo, `dsh plugin add "file:./dsh-photo-pick-app"` (path relative to the checkout root) still works.
- Soft dependency on `ctx.mediaLibrary` only — do not hard-require a media plugin.
