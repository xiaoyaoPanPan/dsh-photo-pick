# Vision model setup (for AI)

[中文](SETUP-VISION.md) | English

Prefer **auto-enable + auto-select** an existing vision model. Only if none exist, walk the user through adding one.

## Preferred path: existing VL model → wire it up

Requires the plugin installed and `dsh web` running.

1. `GET` `http://127.0.0.1:<web-port>/api/photo-pick/settings`  
   (port from the user’s `dsh web` logs).
2. In `models`, find an entry with `supportsVision: true`.
3. If found, `PUT` (or `POST`) the same path:

```json
{
  "visionEnabled": true,
  "visionLlmProvider": "<provider>",
  "visionModel": "<id>"
}
```

This is the same as enabling **Enable vision scoring** and selecting that model under **Settings → Photo pick**.

4. `GET` again to confirm, then tell the user which model was selected.

## No vision model: help add one (ModelScope free tier OK)

Stock DeepSeek chat routes are usually **text-only**. Recommend [ModelScope](https://www.modelscope.cn/) free OpenAI-compatible APIs (quota per their site).

Ask the user to prepare:

1. An [SDK token](https://www.modelscope.cn/my/myaccesstoken) (`ms-…`) — paste only in local Settings; never into public chat.
2. A VL model with **API inference**, starter example: `Qwen/Qwen2.5-VL-7B-Instruct` (verify on site).
3. Base URL: `https://api-inference.modelscope.cn/v1/`

### A. Add custom provider

**Settings → Models → Add custom provider**:

| Field | Suggested |
|-------|-----------|
| Provider ID | `modelscope` |
| API protocol | OpenAI Completions (or UI equivalent) |
| Base URL | `https://api-inference.modelscope.cn/v1/` |
| API key | user’s `ms-…` |
| Model | e.g. `Qwen/Qwen2.5-VL-7B-Instruct` |

### B. Declare image input (required)

Custom models default to text-only. Edit `$DSH_HOME/settings.yaml` (Windows: `%USERPROFILE%\.dsh\settings.yaml`):

```yaml
llm-pi-ai:
  providers:
    modelscope:
      api: openai-completions
      baseURL: https://api-inference.modelscope.cn/v1/
      models:
        - id: Qwen/Qwen2.5-VL-7B-Instruct
          input: [text, image]
```

Or set `defaultInput: [text, image]` on that provider. Save and start a new session.  
Docs: [Providers · image input](https://deepseek-harness.github.io/deepseek-harness/guide/providers/).

### C. Repeat the preferred path

`GET /api/photo-pick/settings` again, then `PUT` to enable and select.  
UI alternative: **Settings → Photo pick** → enable scoring → pick a vision-marked model → save.

## Verify

Run a small photo-pick job. If “text-only / rejects images”, fix step B.

## Agent notes

- Auto-wire when possible; only guide adding a provider when no VL model exists.
- Never write tokens into the repo or public chat.
- Example model ids may rotate; pick any VL that still offers API inference.
