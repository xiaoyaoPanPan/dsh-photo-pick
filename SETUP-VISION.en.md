# Vision model setup (for AI / users)

[中文](SETUP-VISION.md) | English

Configure a **vision-capable** model in DeepSeek Harness (dsh) for `dsh-photo-pick` scoring.  
We recommend [ModelScope](https://www.modelscope.cn/) free OpenAI-compatible inference (daily quota after signup; check their site).

## Goal

1. Add a ModelScope custom provider + VL model under **Settings → Models**  
2. Declare image modality in `$DSH_HOME/settings.yaml` (`input: [text, image]`)  
3. Enable scoring and select that model under **Settings → Photo pick**

## Prepare

1. Create an SDK Token at [ModelScope access tokens](https://www.modelscope.cn/my/myaccesstoken) (`ms-…`).  
2. Pick a **VL / multimodal** chat model that offers **API inference**. Starter example: `Qwen/Qwen2.5-VL-7B-Instruct` (verify on the site).  
3. Note base URL, model id, and token.

Recommended OpenAI-compatible endpoint:

```text
https://api-inference.modelscope.cn/v1/
```

## Step A — Custom provider in the Web UI

1. Open `dsh web` → **Settings → Models**.  
2. **Add a custom provider**.  
3. Suggested fields:

| Field | Suggested value |
|------|-----------------|
| Provider ID | `modelscope` (lowercase, permanent) |
| Display name | `ModelScope` |
| API protocol | openai-completions (or equivalent) |
| Base URL | `https://api-inference.modelscope.cn/v1/` |
| API key | your `ms-…` token |
| Models | at least one VL id, e.g. `Qwen/Qwen2.5-VL-7B-Instruct` |

4. Save. If model discovery fails, enter the model id manually.

## Step B — Declare image input (required)

Manually added custom models are treated as **text-only** until you assert modalities. Without this, image requests are rejected before send.

Edit `$DSH_HOME/settings.yaml` (Windows: `%USERPROFILE%\.dsh\settings.yaml`):

```yaml
llm-pi-ai:
  providers:
    modelscope:
      api: openai-completions
      baseURL: https://api-inference.modelscope.cn/v1/
      # Keep credentials as your local saved reference — do not paste tokens into public chats
      models:
        - id: Qwen/Qwen2.5-VL-7B-Instruct
          input: [text, image]
```

Or set `defaultInput: [text, image]` on that provider if every model there is vision.

Start a **new session** after saving. Official docs: [Configure models · Image input](https://deepseek-harness.github.io/deepseek-harness/en/guide/providers/).

## Step C — Wire photo-pick

1. **Settings → Photo pick**  
2. Enable vision scoring  
3. Select the ModelScope VL model  
4. Save  

## Verify

Run one photo-pick job on a small image. If you see text-only / no-image errors, revisit Step B.

## Notes for agents

- Never ask users to paste `ms-…` tokens into public issues/chats.  
- Stock DeepSeek chat-completions routes are text-only; use a real VL endpoint for scoring.  
- Free quotas and model availability change; swap to another VL model with API inference if needed.  
- Report each step’s success/failure with the raw error.
