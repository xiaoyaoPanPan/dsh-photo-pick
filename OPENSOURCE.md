# Install notes (git / prepare)

English | [中文](OPENSOURCE.zh.md)

This repo is a multi-package dsh plugin monorepo. Consumers install only `dsh-photo-pick-app`.

```sh
dsh plugin --profile web add "github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app"
```

Git installs fetch **sources**, not `lib/`. Each package’s `prepare` script runs `tsdown.prepare.config.ts` to transpile from `src/` without a harness monorepo checkout (see official [publish](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish) docs).

pnpm ≥10 refuses those scripts until allowlisted. Put the exact keys from the first failed `add` into `~/.dsh/profiles/web/pnpm-workspace.yaml`, for example:

```yaml
allowBuilds:
  dsh-photo-pick-app: true
  dsh-photo-pick: true
  dsh-photo-pick-local: true
  dsh-photo-pick-ui: true
  dsh-tool-photo-pick: true
```

Then re-run `add` and:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-photo-pick-setup-preset
```

Pin a commit when sharing: `github:xiaoyaoPanPan/dsh-photo-pick#path:dsh-photo-pick-app#<sha>`.

## Maintainer notes

- Sibling packages use `file:../…` (required for profile installs).
- In-fork harness `tsc -b` paths do not apply here; `prepare` is the consumer build.
- `dsh-photo-pick-ui` uses `tsdown.client-standalone.ts` for prepare; keep it aligned with the shell client module table when that changes.
- Soft dependency on `ctx.mediaLibrary` only — do not hard-require a media plugin.
