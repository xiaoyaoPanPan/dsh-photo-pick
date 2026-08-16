# 视觉模型配置（给 AI / 用户）

中文 | [English](SETUP-VISION.en.md)

本指南教你在 DeepSeek Harness（dsh）里配一个**能看图**的模型，供 `dsh-photo-pick` 打分使用。  
推荐用 [魔搭社区 ModelScope](https://www.modelscope.cn/) 的免费 OpenAI 兼容推理（注册一般有每日调用额度，以官网为准）。

## 目标

1. 在 dsh **设置 → 模型** 里加一个魔搭自定义提供方 + 视觉模型  
2. 在 `$DSH_HOME/settings.yaml` 里声明该模型支持图片（`input: [text, image]`）  
3. 在 **设置 → 照片择优** 里启用打分并选中该模型  

## 你需要先准备

1. 打开 [魔搭 SDK Token](https://www.modelscope.cn/my/myaccesstoken)，创建 Token（形如 `ms-…`）。  
2. 在魔搭模型库选一个带 **API 推理**、且为 **视觉/多模态（VL）** 的聊天模型。  
   起步示例（以页面当时可用为准）：`Qwen/Qwen2.5-VL-7B-Instruct`  
3. 记下：`base_url`、`model id`、你的 Token。

OpenAI 兼容端点（推荐）：

```text
https://api-inference.modelscope.cn/v1/
```

## 步骤 A — 在 Web UI 添加自定义提供方

1. 打开 `dsh web` → **设置 → 模型**。  
2. 点 **添加自定义提供方**。  
3. 填写大致如下（名称可自定）：

| 字段 | 建议值 |
|------|--------|
| Provider ID | `modelscope`（小写，永久 ID） |
| 显示名称 | `魔搭 ModelScope` |
| API 协议 | OpenAI Completions（或界面里等价的 openai-completions） |
| 基础 URL / Base URL | `https://api-inference.modelscope.cn/v1/` |
| API 密钥 | 你的 `ms-…` Token |
| 模型 | 至少加一个 VL 模型 id，例如 `Qwen/Qwen2.5-VL-7B-Instruct` |

4. 保存。若「获取可用模型」失败，可手动填写模型 id。

## 步骤 B — 声明「这个模型能看图」（必做）

自定义提供方里手动加的模型，**默认按纯文本**处理；不声明图片模态时，带图请求会在发送前被拒绝。

编辑 `$DSH_HOME/settings.yaml`（Windows 一般是 `%USERPROFILE%\.dsh\settings.yaml`），在对应提供方下给视觉模型加上 `input`，例如：

```yaml
llm-pi-ai:
  providers:
    modelscope:
      api: openai-completions
      baseURL: https://api-inference.modelscope.cn/v1/
      # apiKey / 凭据引用以你本机保存结果为准，不要把 Token 明文贴进公开聊天
      models:
        - id: Qwen/Qwen2.5-VL-7B-Instruct
          input: [text, image]
```

若该提供方下模型都是视觉模型，也可在提供方上写：

```yaml
defaultInput: [text, image]
```

保存后**新开一个会话**再测（旧会话可能仍绑着旧模型）。

官方说明：[配置模型 · 图片输入](https://deepseek-harness.github.io/deepseek-harness/guide/providers/)。

## 步骤 C — 接到照片择优

1. **设置 → 照片择优**  
2. 打开 **启用视觉打分**  
3. **打分视觉模型** 选刚才的魔搭 VL 模型（应标「视觉」）  
4. 保存  

## 验收

用一张小图走一遍「照片择优」流程；工具应能跑完打分。若报「不接受图片 / text-only」，回到步骤 B 检查 `input: [text, image]`。

## 给 Agent 的备注

- **不要**让用户把 `ms-…` Token 发到公开 Issue / 群聊；让用户本机粘贴到设置页即可。  
- DeepSeek 官方 chat 路由通常是纯文本，**不能**靠改配置变成视觉模型；打分请用魔搭 VL 或其它真正的视觉端点。  
- 魔搭免费额度、模型是否上线以官网为准；示例模型 id 不可用时，换一个仍带 API 推理的 VL 模型即可。  
- 每一步向用户汇报成功/失败与原始报错。
