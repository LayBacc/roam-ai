# Roam AI

The AI extension for Roam.

## Get started

- Add your own Open AI API key in the Roam Depot settings. You can [sign up for an API key here](https://openai.com/api/).
- To open the menu, type `qq` in any block.

## Capabilities

### 💬 Chat

Have a conversation based on the context in the current page

First start a chat room with the "Open AI Chat Roam" command.

Inside that page, use "Chat" to continue the convo.

AI rseponses are tagged with `[assistant]:`

https://www.loom.com/share/767dd9853bb2466aa9490c444d361c67

### 🧱 Load Context

#### what gets included in the prompt:

within the parent tree, the content of all [[]] and (()) above the current block will be loaded

#### suggested use A: container parent block

![](https://figmage.com/images/c8w8ptS_K8mmTH7Wvb1Ey.png)

#### suggested use B: container page

![](https://figmage.com/images/eOTqXKeZmbj-R-vLhs2Iz.png)

### 🌅 Generate Image

Generate an image using DALL-E 2.

This reads only the current block.

## Troubleshooting

- If you are unable to open the menu again, press "Esc" to reset.
- For all questions / suggestions, DM me [@Lay_Bacc](https://twitter.com/Lay_Bacc/)

## Custom models

The format for configuring custom models then looks like this:

```
[{ "name": "model A", "endpoint": "closedai.com/v1/completions", "displayName": "model A", "model": "model-001" }]
```

Note: the `endpoint` parameter is used internally by the plugin. And it's unrelated to the deprecated parameter in OpenAI's API.
