# Roam AI
The AI extension for Roam. 

## Get started
- Add your own Open AI API key in the Roam Depot settings. You can [sign up for an API key here](https://openai.com/api/).
- To open the menu, type `qq` in any block.

## Capabilities
### Completion: 
Generate text based on the current block + the current tree.
https://www.loom.com/share/d152e7a184f94080b8777f595821f43e

### 📍 Local Completion
Generate text based on the current block only.

### 🔄 Rephrase
Say it in another way.

This reads only the current block (local). 

### Label parent: 
Given the children blocks, generate a label for the parent block.
https://www.loom.com/share/0880aaabdfed430da11fe9bfc4372973

### 😈 Devil's Advocate 
Break out of your own bubble. Get perspectives other than your own. 
https://www.loom.com/share/27fa0c02861545ce97f2733c57dcf960

### Give examples (Coming soon)

## Troubleshooting

- If you are unable to open the menu again, press "Esc" to reset.
- For all questions / suggestions, DM me [@Lay_Bacc](https://twitter.com/Lay_Bacc/)

## Custom models
The format for configuring custom models then looks like this:
```
[{ "name": "model A", "endpoint": "closedai.com/v1/completions", "displayName": "model A", "model": "model-001" }]
```

Note: the `endpoint` parameter is used internally by the plugin. And it's unrelated to the deprecated parameter in OpenAI's API.
