import toConfigPageName from "roamjs-components/util/toConfigPageName";
import runExtension from "roamjs-components/util/runExtension";
import { createConfigObserver } from "roamjs-components/components/ConfigPage";
import addStyle from "roamjs-components/dom/addStyle";
import createBlock from "roamjs-components/writes/createBlock";
import getCurrentPageUid from "roamjs-components/dom/getCurrentPageUid";

import getParentUidByBlockUid from "roamjs-components/queries/getParentUidByBlockUid";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getTextByBlockUid from "roamjs-components/queries/getTextByBlockUid";

import { render as renderMenu } from "./RoamAIMenu";

const extensionId = "roam-ai";
const CONFIG = toConfigPageName(extensionId);

let lastEditedBlockUid;
let valueToCursor;

let OPEN_AI_API_KEY = '';

const sendRequest = (option) => {
  let maxTokens = 60;
  switch (option.id) {
    case 'completion_120':
      maxTokens = 120;
      break;
  }

  const parentBlockUid = getParentUidByBlockUid(lastEditedBlockUid);
  const siblings = getBasicTreeByParentUid(parentBlockUid);

  let prompt = '';
  prompt += getTextByBlockUid(parentBlockUid);
  prompt += '\n';
  // add sibling blocks BEFORE the current block
  siblings.find((b) => {
    prompt += getTextByBlockUid(b.uid).replace(new RegExp('qq$'), '')
    prompt += '\n';
    return b.uid === lastEditedBlockUid;
  })

  // if there are no other siblings
  if (siblings.length <= 1) {
    prompt += valueToCursor.replace(new RegExp('qq$'), '');
  }

  const data = {
    model: 'text-davinci-002',
    prompt: prompt,
    temperature: 0.7,
    max_tokens: maxTokens
  }

  const url = 'https://api.openai.com/v1/completions'
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPEN_AI_API_KEY}`
    },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(data => {
    const lines = data.choices[0].text.trim().split("\n");
    lines.reverse().map(line => {
      if (line.trim().length === 0) return; // skip blank lines

      createBlock({
        node: { text: line.trim() },
        parentUid: lastEditedBlockUid
      })
    })
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

export default runExtension({
  extensionId, 
  run: ({ extensionAPI }) => {
    createConfigObserver({ title: CONFIG, config: { tabs: [] } });

    const updateAPIKey = (value: string) => {
      OPEN_AI_API_KEY = value.trim();
    }

    extensionAPI.settings.panel.create({
      tabTitle: "Roam AI",
      settings: [
        {
          action: {
            type: "input",
            onChange: (e) => updateAPIKey(e.target.value),
            placeholder: "sk-u80asgdf780ga3uipgrh1089y",
          },
          id: "api_key",
          name: "API key",
          description:
            "Your Open AI API key",
        },
      ],
    });

    // detect keys
    const appRoot = document.querySelector<HTMLDivElement>(".roam-app");
    const appRootKeydownListener = async (e: KeyboardEvent) => {
      // resetting if the menu is stuck
      if (e.key === 'Escape') {
        menuLoaded = false;
      }
    };
    appRoot?.addEventListener("keydown", appRootKeydownListener);


    // read document input
    let menuLoaded = false;
    let trigger = 'qq';
    let triggerRegex = new RegExp(`${trigger}(.*)$`);;

    const documentInputListener = (e: InputEvent) => {
      const target = e.target as HTMLElement;
      if (
        !menuLoaded &&
        target.tagName === "TEXTAREA" &&
        target.classList.contains("rm-block-input")
      ) {
        const textarea = target as HTMLTextAreaElement;
        const location = window.roamAlphaAPI.ui.getFocusedBlock();
        valueToCursor = textarea.value.substring(
          0,
          textarea.selectionStart
        );

        lastEditedBlockUid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"]
    
        const match = triggerRegex.exec(valueToCursor);
        if (match) {
          menuLoaded = true;

          renderMenu({
            textarea,
            triggerRegex,
            triggerStart: match.index,
            sendRequest,
            extensionAPI,
            onClose: () => {
              menuLoaded = false;
            },
          });
        }
      }
    };
    document.addEventListener("input", documentInputListener);
  },
  unload: () => {},
});
  