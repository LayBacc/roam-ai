# Roam AI

The AI extension for Roam.

## Get started

- Add your own Open AI API key in the Roam Depot settings. You can [sign up for an API key here](https://openai.com/api/).
- To open the menu, type `qq` in any block.

## Capabilities

### ▶️ Run

Have a conversation based on the context in the current page

AI rseponses are tagged with `[assistant]:`

### 🧱 Run (load context)

Load existing pages as context.

https://www.loom.com/share/046f983192cb4cbb954ba3b8541f3645

#### what gets included in the prompt:

The content of all [[]] and (()) above the current block on this page will be loaded

### 🌅 Generate Image

Generate an image using DALL-E 3 or DALL-E 2.

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
