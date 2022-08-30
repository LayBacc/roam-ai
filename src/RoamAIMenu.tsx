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
    id: 'completion_default',
    name: '🧠 Completion (60 words)',
    maxTokens: 60
  },
  {
    id: 'completion_120',
    name: '🧠 Completion (120 words)',
    maxTokens: 120
  },
  {
    id: 'label_from_examples',
    name: 'Label parent',
    maxTokens: 3,
    operation: 'updateParent',
    preset: `examples:\n- apple\n- orange\n- pear\n- watermelon\n- tomato\nlabel: fruits\n\nexamples:\n- acrylic paint\n- wood\n- canvas\n- oil paint\n- bronze\nlabel: art media\n\nexamples:\n- blue\n- red\n- yellow\n- green\n- white\nlabel: colors\n\nexamples:\n- French\n- Spanish\n- Italian\n- English\nlabel: languages\n\nexamples:\n`,
    presetSuffix: 'label: '
  }
]  

const RoamAIMenu = ({
  onClose,
  textarea,
  triggerStart,
  triggerRegex,
  extensionAPI,
  sendRequest
}: any) => {
  const { ["block-uid"]: blockUid, ["window-id"]: windowId } = useMemo(
    () => window.roamAlphaAPI.ui.getFocusedBlock(),
    []
  );
  const menuRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const onSelect = useCallback(
    (option) => {
      onClose()
      sendRequest(option)
    },
    [menuRef, blockUid, onClose, triggerStart, textarea]
  );
  const keydownListener = useCallback(

    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        // const index = Number(menuRef.current.getAttribute("data-active-index"));
        // const count = menuRef.current.childElementCount;
        // setActiveIndex((index + 1) % count);
        // e.stopPropagation();
        // e.preventDefault();
      } else if (e.key === "ArrowUp") {
        // const index = Number(menuRef.current.getAttribute("data-active-index"));
        // const count = menuRef.current.childElementCount;
        // setActiveIndex((index - 1 + count) % count);
        // e.stopPropagation();
        // e.preventDefault();
      } else if (e.key == "ArrowLeft" || e.key === "ArrowRight") {
        // e.stopPropagation();
        // e.preventDefault();
      } else if (e.key === "Enter") {
        const index = Number(menuRef.current.getAttribute("data-active-index"));
        onSelect(index);
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
    },
    [menuRef, setActiveIndex, setFilter, onClose, triggerRegex, textarea]
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
    <div ref={menuRef} className="bg-white py-1 px-1 drop-shadow-lg">
      { 
        OPTIONS.map((option) => {
          return(
            <div 
              className="text-lg bg-white text-neutral-900 hover:bg-blue-50 hover:text-blue-900 w-full cursor-pointer px-1.5 py-1.5"
              onClick={() => onSelect(option)}
            >
              { option.name }
            </div>
          )
        })
      }
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