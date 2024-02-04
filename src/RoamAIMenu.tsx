import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import './index.css';

import { getCoords } from "./dom";
import { Menu } from '@headlessui/react'
import type { OnloadArgs } from "roamjs-components/types/native";

type Props = {
  textarea: HTMLTextAreaElement;
  triggerStart: number;
  triggerRegex: RegExp;
  extensionAPI: OnloadArgs["extensionAPI"];
  sendRequest: any;
};

const OPTIONS = [
  {
    id: 'chat',
    name: '▶️ Run',
    outputType: 'chat',
    endpoint: 'chat'
  },
  {
    id: 'run-with-context',
    name: '🧱 Run (load context)',
    outputType: 'chat',
    endpoint: 'chat',
    loadPages: true
  },
  {
    id: 'open-chatroam',
    name: '➕ New ChatRoam (blank page)',
    outputType: 'none',
    endpoint: 'none'
  },
  {
    id: 'generate-image',
    name: '🌅 Generate image',
    scope: 'local',
    outputType: 'image',
    endpoint: 'image'
  }
]  

const MODELS: any = {
  none: [{name: '-', displayName: '-' }],
  image: [{name: 'dall-e-3', displayName: 'dall-e-3' }, {name: 'dall-e-2', displayName: 'dall-e-2' }],
  chat: [
    {
      name: 'gpt-3.5-turbo-0125',
      displayName: 'gpt-3.5-turbo-0125'
    },
    {
      name: 'gpt-3.5-turbo',
      displayName: 'gpt-3.5-turbo'
    },
    {
      name: 'gpt-4-0125-preview',
      displayName: 'gpt-4-0125-preview'
    },
    {
      name: 'gpt-4',
      displayName: 'gpt-4'
    },
    {
      name: 'gpt-4-32k',
      displayName: 'gpt-4-32k'
    }
  ]
}

const RoamAIMenu = ({
  onClose,
  textarea,
  triggerStart,
  triggerRegex,
  extensionAPI,
  sendRequest,
  customModels
}: any) => {
  const { ["block-uid"]: blockUid, ["window-id"]: windowId } = useMemo(
    () => window.roamAlphaAPI.ui.getFocusedBlock(),
    []
  );
  const menuRef = useRef(null);
  const [modelIndex, setModelIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const getModels = () => {
    const endpoint = OPTIONS[activeIndex]?.endpoint || 'none';
    return MODELS[endpoint].concat(customModels || []);
  }

  const getCurrentModel = useCallback(() => {
    return getModels()[modelIndex];
  }, [modelIndex, getModels]); // Ensure getModels is stable via useCallback as well

  const onSelect = useCallback(
    (option) => {
      onClose();
      sendRequest(option, getCurrentModel());
    },
    [activeIndex, onClose, sendRequest, getCurrentModel]
  );

  const keydownListener = useCallback(

    (e: KeyboardEvent) => {
      // switch mode
      if (e.ctrlKey || e.metaKey) {
        // select model
        const modelCount = getModels().length;

        if (e.key === "ArrowUp") {
          // setModelIndex(1)//(modelIndex - 1)
          setModelIndex((modelIndex - 1 + modelCount) % modelCount);
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        if (e.key === "ArrowDown") {
          setModelIndex((modelIndex + 1) % modelCount);
          // setModelIndex(1) // (modelIndex +1)

          e.stopPropagation();
          e.preventDefault();
        } 

        return;
      }
      else {
        setModelIndex(0);

        if (e.key === "ArrowDown") {
          const index = Number(menuRef.current.getAttribute("data-active-index"));
          const count = menuRef.current.childElementCount;

          setActiveIndex((index + 1) % count);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === "ArrowUp") {
          const index = Number(menuRef.current.getAttribute("data-active-index"));
          const count = menuRef.current.childElementCount;
          setActiveIndex((index - 1 + count) % count);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key == "ArrowLeft" || e.key === "ArrowRight") {
          // e.stopPropagation();
          // e.preventDefault();
        } else if (e.key === "Enter") {
          const index = Number(menuRef.current.getAttribute("data-active-index"));
          onSelect(OPTIONS[index]);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === "Escape") {
          onClose();
        } else {
          const value =
            triggerRegex.exec(
              textarea.value.substring(0, textarea.selectionStart)
            )?.[1] || "";
          if (value) {
            setFilter(value);
          } else {
            onClose();
            return;
          }
        }
      }
    },
    [menuRef, setActiveIndex, setFilter, onClose, triggerRegex, textarea, modelIndex, activeIndex]
  );

  useEffect(() => {
    const listeningEl = !!textarea.closest(".rm-reference-item")
      ? textarea.parentElement // Roam rerenders a new textarea in linked references on every keypress
      : textarea;
    listeningEl.addEventListener("keydown", keydownListener);
    return () => {
      listeningEl.removeEventListener("keydown", keydownListener);
    }; 
  }, [keydownListener]);
  
  

  return (
    <div 
      className="bg-white drop-shadow-lg"
    >
      <div className="p-3 text-md text-neutral-500 bg-gray-100 border border-l-0 border-t-0 border-r-0 border-b-1 border-gray-300 mb-2 flex items-center gap-x-4">
        <div className="font-semibold text-gray-500">
          { getCurrentModel()?.displayName }
        </div>
        <div className="text-gray-500 text-sm">
          ⌘ + ↑/↓ to select model
        </div>
      </div>

      <div 
        className="py-1 px-1" 
        ref={menuRef}
        data-active-index={activeIndex}
      >
        { 
          OPTIONS.map((option, index) => {
            return(
              <div 
                className={`text-lg rounded-md text-neutral-900 hover:bg-neutral-100 font-medium w-full cursor-pointer px-1.5 py-1.5 ${activeIndex === index && 'bg-gray-100 font-semibold'}`}
                onClick={() => onSelect(option)}
              >
                { option.name }
              </div>
            )
          })
        }
      </div>
    </div>
  );
};

export const render = (props: any) => {
  const parent = document.createElement("span");
  const coords = getCoords(props.textarea);
  parent.style.position = "absolute";
  parent.style.zIndex = '10';
  parent.style.boxShadow = '0 0 0 1px rgb(16 22 26 / 10%), 0 2px 4px rgb(16 22 26 / 20%), 0 8px 24px rgb(16 22 26 / 20%)';
  parent.style.border = '1px solid rgb(213,218,222)';
  parent.style.width = '400px';
  parent.style.left = `${coords.left + 20}px`;
  parent.style.top = `${coords.top + 20}px`;
  props.textarea.parentElement.insertBefore(parent, props.textarea);

  ReactDOM.render(
    <RoamAIMenu
      {...props}
      onClose={() => {
        props.onClose();
        ReactDOM.unmountComponentAtNode(parent);
        parent.remove();
      }}
    />,
    parent
  );
};

export default RoamAIMenu;