# Install notes (git / prebuilt lib)

[中文](OPENSOURCE.md) | English

**Users:** start from the [README](README.md) (“10 秒安装”) or [INSTALL.md](INSTALL.md) (Chinese) / [INSTALL.en.md](INSTALL.en.md).

This repo is a multi-package dsh plugin monorepo. Consumers install only `dsh-photo-pick-app`.

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

## Install strategy

1. **Prebuilt `lib/`**: commit runnable artifacts; packages have **no** install-time `prepare` (avoids pnpm's nested `npm install` for git packages pulling unpublished peers).
2. **Sibling deps use `github:…#path:`**: do not use `file:../…` (pnpm resolves those against the consumer profile dir — [pnpm#9141](https://github.com/pnpm/pnpm/issues/9141)).
3. **Consumer profiles need** `blockExoticSubdeps: false`: otherwise pnpm 11 rejects transitive git deps (`ERR_PNPM_EXOTIC_SUBDEP`).

Full steps: [INSTALL.en.md](INSTALL.en.md).

## Maintainer notes

- After changing `src/`, rebuild and **commit the updated `lib/`** (root `build-all.ps1` works on Windows).
- Keep sibling deps as `github:xiaoyaoPanPan/dsh-photo-pick#path:<package-dir>`; do not revert to `file:../…`.
- Do not restore install-time `prepare` / `tsdown` unless the nested `npm install` problem is solved another way.
- Local development: after cloning, `dsh plugin add "file:./dsh-photo-pick-app"` still works.
- Soft dependency on `ctx.mediaLibrary` only — do not hard-require a media plugin.
