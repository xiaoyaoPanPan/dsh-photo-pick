# 视觉模型配置（给 AI）

中文 | [English](SETUP-VISION.en.md)

打分需要一个**能看图**的模型（`supportsVision` / `input` 含 `image`）。  
先查本机是否已有；有则**先问用户**是否接到照片择优，同意后再写入。没有再教怎么加自定义看图模型。

## 已有视觉模型 → 询问后接通

前提：插件已装，`dsh web` 在跑。

1. `GET` `http://127.0.0.1:<web端口>/api/photo-pick/settings`（端口见启动日志）。
2. 在 `models` 里找 `supportsVision: true`，把名单报给用户。
3. **先问**要不要接到「照片择优」。用户同意后，再 `PUT`/`POST` 同一路径：

```json
{
  "visionEnabled": true,
  "visionLlmProvider": "<provider>",
  "visionModel": "<id>"
}
```

等同于 **设置 → 照片择优** 勾「启用视觉打分」并选中该模型。

4. 再 `GET` 确认后汇报。

## 没有视觉模型 → 教用户加自定义看图端点

DeepSeek 官方聊天路由通常是纯文本，不能打分。需要用户在 **设置 → 模型** 里加一个**支持图片输入**的自定义提供方（任意 OpenAI 兼容 / 其它 dsh 支持的协议均可；由用户自己选平台与密钥）。

通用步骤：

1. **设置 → 模型 → 添加自定义提供方**：填 Base URL、协议、API 密钥、模型 id（以该平台文档为准）。
2. 自定义模型默认当纯文本。在 `$DSH_HOME/settings.yaml`（Windows：`%USERPROFILE%\.dsh\settings.yaml`）给该模型声明图片输入，例如：

```yaml
llm-pi-ai:
  providers:
    <你的提供方 id>:
      api: openai-completions
      baseURL: <你的 Base URL>
      models:
        - id: <模型 id>
          input: [text, image]
```

或对该提供方设 `defaultInput: [text, image]`。保存后新开会话。  
官方说明：[配置模型 · 图片输入](https://deepseek-harness.github.io/deepseek-harness/guide/providers/)。

3. 再 `GET /api/photo-pick/settings`，确认出现 `supportsVision: true`，**再问**用户是否接通，同意后再 `PUT`。

也可让用户在界面操作：**设置 → 照片择优** → 勾选 → 选模型 → 保存。

### 可选示例（非推荐、非绑定）

若用户问「有没有免费试用的 OpenAI 兼容看图 API」，可顺带提一句 [ModelScope](https://www.modelscope.cn/) 等第三方推理（Token、模型 id、Base URL 以对方官网为准），**不要当成唯一或默认方案**，也不要替用户注册或索取密钥写入公开处。

## 验收

小图跑一遍「照片择优」。若报不接受图片 / text-only，检查 `input: [text, image]`。

## 给 Agent 的备注

- 有视觉模型时：**询问后再写配置**，不要擅自勾选。
- 没有时：讲清「自定义提供方 + 声明 image」，让用户自选平台。
- 密钥只留本机设置；不要写进仓库或公开聊天。
