# 视觉模型配置（给 AI）

中文 | [English](SETUP-VISION.en.md)

优先**自动勾选并选中**已有看图模型；只有本机没有视觉模型时，再教用户加一个。

## 优先路径：已有视觉模型 → 自动接通

前提：插件已装好，`dsh web` 在跑。

1. `GET` 本机 `http://127.0.0.1:<web端口>/api/photo-pick/settings`  
   （端口以用户实际 `dsh web` 为准，常见在启动日志里。）
2. 在返回的 `models` 里找 `supportsVision: true` 的项。
3. 若找到，`PUT`（或 `POST`）同一路径，JSON 例如：

```json
{
  "visionEnabled": true,
  "visionLlmProvider": "<provider>",
  "visionModel": "<id>"
}
```

这等同于在 **设置 → 照片择优** 勾上「启用视觉打分」并选中该模型。

4. 再 `GET` 一次确认：`visionEnabled` 为 true，且 provider/model 已写入。向用户汇报选中了哪个。

## 没有视觉模型时：教用户加一个（推荐魔搭免费）

DeepSeek 官方聊天路由通常是**纯文本**，不能打分。可推荐 [魔搭 ModelScope](https://www.modelscope.cn/) 免费 OpenAI 兼容 API（额度以官网为准）。

请用户准备：

1. [SDK Token](https://www.modelscope.cn/my/myaccesstoken)（`ms-…`）——**只在本机设置里粘贴，不要写进公开聊天。**
2. 选一个带 **API 推理** 的 VL 模型，起步示例：`Qwen/Qwen2.5-VL-7B-Instruct`（以页面可用为准）。
3. Base URL：`https://api-inference.modelscope.cn/v1/`

### A. 添加自定义提供方

**设置 → 模型 → 添加自定义提供方**：

| 字段 | 建议 |
|------|------|
| Provider ID | `modelscope` |
| API 协议 | OpenAI Completions（或界面等价项） |
| Base URL | `https://api-inference.modelscope.cn/v1/` |
| API 密钥 | 用户的 `ms-…` |
| 模型 | 如 `Qwen/Qwen2.5-VL-7B-Instruct` |

### B. 声明能看图（必做）

自定义模型默认当纯文本。编辑 `$DSH_HOME/settings.yaml`（Windows：`%USERPROFILE%\.dsh\settings.yaml`）：

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

或对该提供方设 `defaultInput: [text, image]`。保存后新开会话。  
官方说明：[配置模型 · 图片输入](https://deepseek-harness.github.io/deepseek-harness/guide/providers/)。

### C. 再跑「优先路径」

加完后重新 `GET /api/photo-pick/settings`，应能看到 `supportsVision: true`，再 `PUT` 勾选并选中。

若用户更习惯点界面：**设置 → 照片择优** → 勾「启用视觉打分」→ 选标「视觉」的模型 → 保存。

## 验收

用一张小图走「照片择优」；若报不接受图片 / text-only，检查步骤 B 的 `input: [text, image]`。

## 给 Agent 的备注

- 能自动接通就不要让用户手点；没有视觉模型再逐步指导加提供方。
- 不要索取或落盘用户 Token 到仓库/公开处。
- 示例模型 id 以魔搭当前页面为准；不可用就换其它仍带 API 推理的 VL。
