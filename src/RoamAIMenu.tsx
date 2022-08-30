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

const OPTIONS = [
  {
    id: 'completion_default'
    name: '🧠 Completion (60 words)',
  },
  {
    id: 'completion_120'
    name: '🧠 Completion (120 words)',
  }
]  

const RoamAIMenu = ({
  onClose,
  textarea,
  triggerStart,
  triggerRegex,
  extensionAPI,
  sendRequest
}: { onClose: () => void } & Props) => {
  const { ["block-uid"]: blockUid, ["window-id"]: windowId } = useMemo(
    () => window.roamAlphaAPI.ui.getFocusedBlock(),
    []
  );
  const menuRef = useRef<HTMLUListElement>(null);
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

export const render = (props: Props & { onClose: () => void }) => {
  const parent = document.createElement("span");
  const coords = getCoords(props.textarea);
  parent.style.position = "absolute";
  parent.style.zIndex = 10;
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