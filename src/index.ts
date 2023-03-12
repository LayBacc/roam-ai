import toConfigPageName from "roamjs-components/util/toConfigPageName";
import runExtension from "roamjs-components/util/runExtension";
import addStyle from "roamjs-components/dom/addStyle";
import createBlock from "roamjs-components/writes/createBlock";
import updateBlock from "roamjs-components/writes/updateBlock";
import getCurrentPageUid from "roamjs-components/dom/getCurrentPageUid";

import getOrderByBlockUid from "roamjs-components/queries/getOrderByBlockUid";
import getParentUidByBlockUid from "roamjs-components/queries/getParentUidByBlockUid";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getTextByBlockUid from "roamjs-components/queries/getTextByBlockUid";
import getPageTitleByBlockUid from "roamjs-components/queries/getPageTitleByBlockUid";
import getFullTreeByParentUid from "roamjs-components/queries/getFullTreeByParentUid";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import getShallowTreeByParentUid from "roamjs-components/queries/getShallowTreeByParentUid";

import Hashids from 'hashids'

import { render as renderMenu } from "./RoamAIMenu";

const extensionId = "roam-ai";
const CONFIG = toConfigPageName(extensionId);

let lastEditedBlockUid: string;
let valueToCursor: string;

let OPEN_AI_API_KEY = '';
let MAX_TOKENS = 256;
let MAX_WINDOW_SIZE = 4000;
let CONTENT_TAG = '';
let CUSTOM_MODELS:any = [];

const hashids = new Hashids();

const normalizePageTitle = (title: string): string =>
  title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const parseModulesFromString = (rawString: string) => {
  const output = [] as any;

  const matches = rawString.match(/\[\[(.*?)\]\]|\(\((.*?)\)\)/g);

  matches.forEach(match => {
    const isPageReference = match.startsWith("[[")
    const title = isPageReference ? match.slice(2, match.length - 2) : null;
    const id = isPageReference ? null : match.slice(2, match.length - 2);

    output.push({
      title,
      id,
      type: isPageReference ? "page" : "block"
    });
  });
  return output;
}

const parseRoamTree = (data: any, level: number = 0): string => {
  let result = '';
  for (const block of data) {
    if (block.text) {
      // add the current block to the result
      result += `${'\t'.repeat(level)}- ${block.text}\n`;

      // check for nested blocks
      if (block.children && block.children.length > 0) {
        result += parseRoamTree(block.children, level + 1);
      }
    }
  }
  return result;
}

const loadContext = ({ parentBlockUid, targetBlockUid, siblings }: any) => {
  let contextRaw = '';
  // add sibling blocks BEFORE the current block
  siblings.find((b: any) => {
    contextRaw += b.text.replace(new RegExp('qq$'), '');
    return b.uid === lastEditedBlockUid;
  })

  const contextModules = parseModulesFromString(contextRaw)
  
  let fullContext = '';
  contextModules.map((contextModule: any) => {
    let blockUid = contextModule.id;
    let title = contextModule.title;
    if (contextModule.type === 'page') {
      blockUid = getPageUidByPageTitle(contextModule.title)
    }

    if (contextModule.type === 'block') {
      title = getTextByBlockUid(blockUid)
    }

    const tree = getFullTreeByParentUid(blockUid);
    
    fullContext += `### ${title}`;
    fullContext += parseRoamTree(tree.children, 0);
    fullContext += '\n\n\n';
  })

  return fullContext;
}

const sendRequest = (option: any, model: any) => {
  const targetBlockUid = lastEditedBlockUid;
  const parentBlockUid = getParentUidByBlockUid(lastEditedBlockUid);
  const siblings = getBasicTreeByParentUid(parentBlockUid);

  if (option?.id === 'open_chatroam') {
    // generate a new page
    const seed = Date.now();
    const roomId = hashids.encode(seed);
    const roomPage = `[[ChatRoam ${roomId}]]`;

    createBlock({
      node: { text: roomPage },
      parentUid: targetBlockUid
    })
    return;
  }

  let prompt : any;
  if (option?.id === 'load_context') {
    prompt = loadContext({ parentBlockUid, targetBlockUid, siblings });
  }
  else if (option?.id === 'continue_default') {
    prompt = 'current page context: \n```\n';

    const pageTitle = getPageTitleByBlockUid(targetBlockUid); 
    const currPageUid = getPageUidByPageTitle(pageTitle); // getPageUidByBlockUid(targetBlockUid);

    // add full page context to prompt
    const tree = getFullTreeByParentUid(currPageUid);
    prompt += parseRoamTree(tree.children, 0).slice(-MAX_WINDOW_SIZE);
    prompt += '\n```\n';

    // current block content 
    prompt += getTextByBlockUid(targetBlockUid).replace(new RegExp('qq$'), '');
    prompt += '\n';
  }
  else {
    prompt = option.preset || '';
  }

  if (option.local) {
    prompt += valueToCursor.replace(new RegExp('qq$'), '');
    prompt += option.presetSuffix || '';
  }
  else if (!option?.fullPage) {
    prompt += getTextByBlockUid(parentBlockUid);
    prompt += '\n';

    // add sibling blocks BEFORE the current block
    siblings.find((b) => {
      prompt += getTextByBlockUid(b.uid).replace(new RegExp('qq$'), '')
      prompt += '\n';
      return b.uid === lastEditedBlockUid;
    })
    prompt += option.presetSuffix || '';

    if (siblings.length <= 1) {
      prompt += valueToCursor.replace(new RegExp('qq$'), '');
    }
  }

  // build the request payload
  let data;
  let url;
  if (option?.outputType === 'chat') {
    url = 'https://api.openai.com/v1/chat/completions';

    const pageTitle = getPageTitleByBlockUid(targetBlockUid); 
    const currPageUid = getPageUidByPageTitle(pageTitle);
    const tree = getFullTreeByParentUid(currPageUid);
 
    let messages:any = [];
    tree.children.map(block => {
      const childrenText = parseRoamTree(block.children, 0);

      if (block.text.startsWith('[assistant]:')) {
        messages.push({ role: 'assistant', content: block.text.replace('[assistant]:', '') })
        messages.push({ role: 'assistant', content: childrenText })
      }
      else {
        messages.push({ role: 'user', content: block.text.replace(new RegExp('qq$'), '') })
        messages.push({ role: 'user', content: childrenText })
      }
    })

    data = {
      model: 'gpt-3.5-turbo',
      messages: messages
    }
  }
  else if (option?.outputType === 'image') {
    url = 'https://api.openai.com/v1/images/generations'
    data = {
      prompt: prompt,
      n: 1
    }
  }
  else {
    url = model.endpoint || 'https://api.openai.com/v1/completions';
    data = {
      model: model.name,
      prompt: prompt,
      temperature: 0.7,
      max_tokens: option.maxTokens || MAX_TOKENS
    }
  }

  // replace the "qq" text
  updateBlock({
    text: getTextByBlockUid(lastEditedBlockUid).replace(new RegExp(' qq$'), ` ${CONTENT_TAG}`),
    uid: lastEditedBlockUid
  });

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
    if (data.error) return;

    // insert chat response
    if (option?.outputType === 'chat') {
      const text = data.choices[0].message.content.trim();
      const lines = text.split("\n");

      const pageTitle = getPageTitleByBlockUid(targetBlockUid); 
      const currPageUid = getPageUidByPageTitle(pageTitle);

      createBlock({
        node: { text: `[assistant]: ${text}` },
        parentUid: currPageUid,
        order: getOrderByBlockUid(targetBlockUid) + 1
      })

      return;
    }

    // insert image
    if (option?.outputType === 'image') {
      const output = `![](${data.data?.[0]?.url})`
      createBlock({
        node: { text: output },
        parentUid: targetBlockUid
      })
      return;
    }

    // insert text completion
    const text = data?.text ? data.text : data.choices[0].text.trim();  // depending on the endpoint
    const lines = text.split("\n");
    lines.reverse().map((line: any) => {
      line = line.trim().replace(/^- /, '');

      if (line.length === 0) return; // skip blank line

      if (option.operation === 'updateParent') {
        updateBlock({
          text: line,
          uid: parentBlockUid
        })
      }
      // bullet point
      else if (line.startsWith('- ')) {
        // insert into the last child
        createBlock({
          node: { text: line },
          parentUid: targetBlockUid
        })
      }
      else {
        createBlock({
          node: { text: line },
          parentUid: targetBlockUid
        })
      }
    })
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

export default runExtension({
  extensionId, 
  run: ({ extensionAPI }) => {
    const style = addStyle(`.roamjs-smartblocks-popover-target {
  display:inline-block;
  height:14px;
  width:17px;
  margin-right:7px;
}
.bp3-portal {
  z-index: 1000;
}
.roamjs-smartblocks-store-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 12px 0;
  cursor: pointer;
  font-size: 12px;   
  border: 1px solid #10161a26;
  background: white;
  border-radius: 24px;
}
.roamjs-smartblocks-store-item:hover {
  box-shadow: 0px 3px 6px #00000040;
  transform: translate(0,-3px);
}
.roamjs-smartblocks-store-label .bp3-popover-wrapper {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.roamjs-smartblocks-store-tabs .bp3-tab-list {
  justify-content: space-around;
}
.roamjs-smartblocks-store-tabs {
  height: 48px;
}
.roamjs-smartblock-menu {
  width: 300px;
}`);

    const updateAPIKey = (value: string) => {
      if (!value) return;
      OPEN_AI_API_KEY = value.trim();
    }

    const updateMaxTokens = (value: string) => {
      if (!value) return;
      MAX_TOKENS = Number(value.trim());
    }    

    const updateContentTag = (value: string) => {
      if (!value) return;
      CONTENT_TAG = value.trim();
    }    

    const updateCustomModels = (value: string) => {
      if (!value) return;

      try {
        CUSTOM_MODELS = JSON.parse(value.trim());
      }
      catch (err) {}
    }

    updateAPIKey(extensionAPI.settings.get("api_key") as string);
    updateMaxTokens(extensionAPI.settings.get("max_tokens") as string);
    updateContentTag(extensionAPI.settings.get("content_tag") as string);
    updateCustomModels(extensionAPI.settings.get("custom_models") as any);

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
        {
          action: {
            type: "input",
            onChange: (e) => updateMaxTokens(e.target.value),
            placeholder: "256",
          },
          id: "max_tokens",
          name: "Maximum length",
          description:
            "The maximnum number of words to generate. Default is 256.",
        },
        {
          action: {
            type: "input",
            onChange: (e) => updateContentTag(e.target.value),
            placeholder: "[[qq]]",
          },
          id: "content_tag",
          name: "Content tag",
          description:
            "A string to replace 'qq' with. Default is blank.",
        },
        {
          action: {
            type: "input",
            onChange: (e) => updateCustomModels(e.target.value),
            placeholder: '[{ "name": "model A", "endpoint": "closedai.com/v1/completions", "displayName": "model A", "model": "model-001" }]',
          },
          id: "custom_models",
          name: "Custom models",
          description:
            "Bring your own endpoints.",
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
            customModels: CUSTOM_MODELS,
            onClose: () => {
              menuLoaded = false;
            },
          });
        }
      }
    };
    document.addEventListener("input", documentInputListener);

    return {
      elements: [style],
      domListeners: [
        { type: "input", listener: documentInputListener, el: document },
        { type: "keydown", el: appRoot, listener: appRootKeydownListener },
      ]
    };
  },
  unload: () => {
  },
});
  