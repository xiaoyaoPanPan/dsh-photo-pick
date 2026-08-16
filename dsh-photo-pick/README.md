# dsh-photo-pick

English | [中文](README.zh.md)

Service Definition for `ctx.photoPick`: rank similar photos under a mounted workspace and recommend the best ones. Concrete backends such as [`dsh-photo-pick-local`](../dsh-photo-pick-local) implement {@link PhotoPick}.

## API

- `pickBest(root, options)` — score candidates (explicit `paths` and/or media-library `query`) and return top-K picks

Roots that are a drive root or the bare user home are rejected as `INVALID_ROOT`. Paths outside the root are `PATH_ESCAPE`.

## Model Experience

Exposed indirectly through [`dsh-tool-photo-pick`](../dsh-tool-photo-pick/README.md).

## Known Limitations

- Soft dependency on `ctx.mediaLibrary` when resolving candidates via `query`; explicit `paths` work without the media plugin.
- Comparative ranking is per-image quality scoring, not pairwise tournament.
