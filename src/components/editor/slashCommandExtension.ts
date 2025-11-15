import { Extension } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import type { ComponentType } from "react";
import { SlashCommandList, SlashCommandListHandle } from "./SlashCommandList";

export interface SlashCommandItem {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  keywords?: string[];
  disabled?: boolean;
  command: (props: { editor: Editor; range: { from: number; to: number } }) => void;
}

export interface SlashCommandExtensionOptions {
  items: SlashCommandItem[];
}

export const SlashCommandExtension = Extension.create<SlashCommandExtensionOptions>({
  name: "slash-command",

  addOptions() {
    return {
      items: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) => {
          const normalized = query.toLowerCase();
          return this.options.items
            .filter((item) => {
              if (item.disabled) return false;
              const haystack = [
                item.title,
                item.description ?? "",
                ...(item.keywords ?? []),
              ]
                .join(" ")
                .toLowerCase();
              return haystack.includes(normalized);
            })
            .slice(0, 50);
        },
        render: () => {
          let component: ReactRenderer<SlashCommandListHandle> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props: {
                  items: props.items as SlashCommandItem[],
                  command: (item) => props.command(item),
                },
                editor: props.editor,
              });

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                interactive: true,
                trigger: "manual",
                placement: "left-start",
                arrow: false,
                offset: [0, 12],
              });

              popup[0].show();
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items as SlashCommandItem[],
                command: (item: SlashCommandItem) => props.command(item),
              });

              popup?.[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.[0].hide();
                return true;
              }

              const handled = component?.ref?.onKeyDown({ event: props.event });
              if (handled) {
                return true;
              }

              return false;
            },
            onExit() {
              popup?.[0].destroy();
              popup = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
