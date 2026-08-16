# Vision model setup (for AI)

[中文](SETUP-VISION.md) | English

Scoring needs a **look-at-images** model (`supportsVision` / `input` includes `image`).  
Check locally first; if one exists, **ask the user** before wiring Photo pick. If none, teach how to add a custom vision endpoint.

## Existing vision model → ask, then wire

Requires the plugin installed and `dsh web` running.

1. `GET` `http://127.0.0.1:<web-port>/api/photo-pick/settings` (port from startup logs).
2. Find `supportsVision: true` in `models` and report the list.
3. **Ask** whether to wire it into Photo pick. Only if the user agrees, `PUT`/`POST` the same path:

```json
{
  "visionEnabled": true,
  "visionLlmProvider": "<provider>",
  "visionModel": "<id>"
}
```

Same as enabling scoring and selecting that model under **Settings → Photo pick**.

4. `GET` again and confirm.

## No vision model → help add a custom vision endpoint

Stock DeepSeek chat routes are usually text-only. The user must add a **vision-capable** custom provider under **Settings → Models** (any OpenAI-compatible or other dsh-supported protocol; the user picks the vendor and keys).

Generic steps:

1. **Settings → Models → Add custom provider**: Base URL, protocol, API key, model id (per that vendor’s docs).
2. Custom models default to text-only. In `$DSH_HOME/settings.yaml` (Windows: `%USERPROFILE%\.dsh\settings.yaml`), declare image input, e.g.:

```yaml
llm-pi-ai:
  providers:
    <your-provider-id>:
      api: openai-completions
      baseURL: <your Base URL>
      models:
        - id: <model id>
          input: [text, image]
```

Or set `defaultInput: [text, image]` on that provider. Save and start a new session.  
Docs: [Providers · image input](https://deepseek-harness.github.io/deepseek-harness/guide/providers/).

3. `GET /api/photo-pick/settings` again; when `supportsVision: true` appears, **ask** before `PUT`.

UI alternative: **Settings → Photo pick** → enable → select model → save.

### Optional example (not endorsed, not required)

If the user asks for a free OpenAI-compatible VL trial, you may mention third-party inference such as [ModelScope](https://www.modelscope.cn/) (token / model id / Base URL per their site). **Do not treat it as the default or only option**, and never register or paste secrets into public places.

## Verify

Run a small photo-pick job. If “text-only / rejects images”, fix the `input: [text, image]` declaration.

## Agent notes

- When a VL model exists: **ask before writing settings**.
- When none: explain custom provider + image modality; let the user choose the vendor.
- Keep API keys local only.
