import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  EditorContent,
  useEditor,
  BubbleMenu,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import type { Editor as TipTapEditorInstance } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";

import { Node, mergeAttributes } from "@tiptap/core";

import clsx from "clsx";

import { SlashCommandExtension, SlashCommandItem } from "./editor/slashCommandExtension";
import { CalloutNodeView } from "./editor/nodes/CalloutNodeView";
import { EmbedNodeView } from "./editor/nodes/EmbedNodeView";
import { TableBubbleMenu } from "./editor/TableBubbleMenu";

import {
  CodeBracketIcon,
  PhotoIcon,
  DocumentTextIcon,
  QueueListIcon,
  Bars3Icon,
  HashtagIcon,
  LinkIcon,
  MinusIcon,
  SparklesIcon,
  BarsArrowDownIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("css", css);
lowlight.register("html", html);
lowlight.register("json", json);
lowlight.register("python", python);

function safe(editor: TipTapEditorInstance | null) {
  if (!editor || editor.isDestroyed) return null;
  return editor.chain().focus();
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const ToggleExtension = Details.extend({
  name: "toggle",
}).configure({
  HTMLAttributes: {
    class: "notion-toggle",
    "data-type": "toggle",
  },
});

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  selectable: true,
  addAttributes() {
    return {
      emoji: { default: "💡" },
      color: { default: "default" },
    };
  },
  parseHTML() {
    return [{ tag: "aside[data-type='callout']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ editor, range }) => {
          const pos = range ?? editor.state.selection.head;
          const size = editor.state.doc.content.size;
          const clamped = Math.max(0, Math.min(pos, size));

          editor.commands.insertContentAt(clamped, {
            type: "callout",
            attrs: attrs ?? {},
            content: [{ type: "paragraph" }],
          });

          safe(editor)?.run();
          return true;
        },
    };
  },
});

const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      url: { default: "" },
      title: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='embed']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "embed" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
  addCommands() {
    return {
      setEmbed:
        (attrs) =>
        ({ editor, range }) => {
          if (!attrs?.url) return false;

          const pos = range ?? editor.state.selection.head;
          const size = editor.state.doc.content.size;
          const clamped = Math.max(0, Math.min(pos, size));

          editor.commands.insertContentAt(clamped, {
            type: "embed",
            attrs,
          });

          safe(editor)?.run();
          return true;
        },
    };
  },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  editorClassName?: string;
};

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands…",
  editable = true,
  className,
  editorClassName,
}: Props) {
  const lastValue = useRef(value ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<TipTapEditorInstance | null>(null);

  const slashItems = useMemo<SlashCommandItem[]>(
    () => [
      {
        title: "Text",
        description: "Plain text",
        icon: DocumentTextIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).setParagraph().run();
        },
      },
      {
        title: "Heading 1",
        description: "Large heading",
        icon: HashtagIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).setNode("heading", { level: 1 }).run();
        },
      },
      {
        title: "List",
        description: "Bulleted list",
        icon: Bars3Icon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: "Ordered list",
        description: "Numbered",
        icon: QueueListIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: "Quote",
        description: "Blockquote",
        icon: SparklesIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: "Code block",
        description: "Syntax highlighted",
        icon: CodeBracketIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).setCodeBlock().run();
        },
      },
      {
        title: "Divider",
        description: "Horizontal line",
        icon: MinusIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).setHorizontalRule().run();
        },
      },
      {
        title: "Callout",
        description: "Highlighted block",
        icon: BarsArrowDownIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).setCallout().run();
        },
      },
      {
        title: "Table",
        description: "3×3 table",
        icon: RectangleGroupIcon,
        command: ({ editor, range }) => {
          safe(editor)
            ?.deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        },
      },
      {
        title: "Embed",
        description: "External link",
        icon: LinkIcon,
        command: ({ editor, range }) => {
          const url = window.prompt("Embed URL");
          if (!url) return;
          safe(editor)?.deleteRange(range).setEmbed({ url }).run();
        },
      },
      {
        title: "Image",
        description: "Upload",
        icon: PhotoIcon,
        command: ({ editor, range }) => {
          safe(editor)?.deleteRange(range).run();
          setTimeout(() => inputRef.current?.click(), 0);
        },
      },
    ],
    []
  );

  const handleFiles = useCallback(async (files: FileList | null) => {
    const instance = editorRef.current;
    if (!instance || instance.isDestroyed) return;
    if (!files?.length) return;

    const items = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!items.length) return;

    for (const f of items) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!editorRef.current || editorRef.current.isDestroyed) return resolve();
          if (typeof e.target?.result === "string") {
            safe(editorRef.current)?.setImage({ src: e.target.result, alt: f.name }).run();
          }
          resolve();
        };
        reader.readAsDataURL(f);
      });
    }
  }, []);

  const editor = useEditor(
    {
      content: value,
      editable,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder,
          showOnlyWhenEditable: true,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          validate: (href) => isValidUrl(href),
          HTMLAttributes: {
            class: "underline text-neutral-700 hover:text-neutral-900",
          },
        }),
        Image.configure({ allowBase64: true }),
        Table.configure({
          resizable: true,
          HTMLAttributes: { class: "notion-table w-full text-sm border border-neutral-200" },
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: { class: "bg-neutral-100 font-semibold" },
        }),
        TableCell.configure({
          HTMLAttributes: { class: "border p-3 align-top" },
        }),
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class:
              "rounded-xl bg-neutral-950/90 p-4 font-mono text-[13px] text-neutral-100 overflow-x-auto",
          },
        }),
        ToggleExtension,
        DetailsSummary.configure({
          HTMLAttributes: { class: "cursor-pointer text-neutral-700 font-medium flex gap-2" },
        }),
        DetailsContent.configure({
          HTMLAttributes: { class: "pl-4 text-neutral-700" },
        }),
        Callout,
        Embed,
        SlashCommandExtension.configure({ items: slashItems }),
      ],
      editorProps: {
        attributes: {
          class: clsx(
            "notion-editor prose prose-neutral mx-auto min-h-[50vh] max-w-3xl text-[16px] leading-7 outline-none",
            editorClassName
          ),
        },
        handlePaste: (view, event) => {
          const files = event.clipboardData?.files;
          if (files?.length) {
            void handleFiles(files);
            return true;
          }

          const text = event.clipboardData?.getData("text/plain");
          if (text && isValidUrl(text)) {
            safe(editorRef.current)?.setEmbed({ url: text }).run();
            return true;
          }

          return false;
        },
        handleDrop: (view, event) => {
          const files = event.dataTransfer?.files;
          if (files?.length) {
            event.preventDefault();
            void handleFiles(files);
            return true;
          }
          return false;
        },
      },
      onUpdate({ editor }) {
        if (!editor || editor.isDestroyed) return;
        const html = editor.isEmpty ? "" : editor.getHTML();
        if (lastValue.current !== html) {
          lastValue.current = html;
          onChange(html);
        }
      },
    },
    [editable, placeholder]
  );

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const normalized = value ?? "";
    if (lastValue.current === normalized) return;

    const current = editor.getHTML();
    if (current === normalized || (editor.isEmpty && normalized === "")) {
      lastValue.current = normalized;
      return;
    }

    const selection = editor.state.selection;
    const from = selection?.from ?? 0;
    const to = selection?.to ?? 0;

    editor.commands.setContent(normalized, false);

    const size = editor.state.doc.content.size;
    const clamp = (n: number) => Math.max(0, Math.min(n, size));

    safe(editor)
      ?.setTextSelection({ from: clamp(from), to: clamp(to) })
      .run();

    lastValue.current = normalized;
  }, [value, editor]);

  const menuBtn = (active: boolean) =>
    clsx(
      "flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition",
      active
        ? "bg-neutral-900 text-white"
        : "text-neutral-100 hover:bg-white/10 hover:text-white"
    );

  const blockBtn = (active?: boolean) =>
    clsx(
      "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm transition",
      active
        ? "bg-neutral-200 text-neutral-900"
        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
    );

  return (
    <div
      className={clsx(
        "relative rounded-2xl border border-neutral-200 bg-white px-6 py-5 shadow-sm",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

            {!editor ? (
        <div className="h-40 animate-pulse rounded-xl bg-neutral-200/80" />
      ) : (
        <>
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, offset: [0, 8] }}
            className="rounded-full bg-neutral-900/95 px-2 py-1 shadow-xl"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => safe(editor)?.toggleBold().run()}
                className={menuBtn(editor.isActive("bold"))}
              >
                <strong>B</strong>
              </button>

              <button
                type="button"
                onClick={() => safe(editor)?.toggleItalic().run()}
                className={menuBtn(editor.isActive("italic"))}
              >
                <em>I</em>
              </button>

              <button
                type="button"
                onClick={() => safe(editor)?.toggleUnderline().run()}
                className={menuBtn(editor.isActive("underline"))}
              >
                <span className="underline">U</span>
              </button>

              <button
                type="button"
                onClick={() => safe(editor)?.toggleStrike().run()}
                className={menuBtn(editor.isActive("strike"))}
              >
                <span className="line-through">S</span>
              </button>

              <button
                type="button"
                onClick={() => safe(editor)?.toggleCode().run()}
                className={menuBtn(editor.isActive("code"))}
              >
                <CodeBracketIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const href = window.prompt("Enter URL:");
                  if (!href) return;
                  safe(editor)?.extendMarkRange("link").setLink({ href }).run();
                }}
                className={menuBtn(editor.isActive("link"))}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </div>
          </BubbleMenu>

          <TableBubbleMenu editor={editor} />
        </>
      )}
