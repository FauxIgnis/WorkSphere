import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BubbleMenu,
  EditorContent,
  FloatingMenu,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import type { Editor as TipTapEditorInstance } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import { Node, mergeAttributes } from "@tiptap/core";
import clsx from "clsx";
import {
  Bars3BottomLeftIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  HashtagIcon,
  LinkIcon,
  MinusIcon,
  PhotoIcon,
  QueueListIcon,
  RectangleGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { SlashCommandExtension, SlashCommandItem } from "./editor/slashCommandExtension";
import { CalloutNodeView } from "./editor/nodes/CalloutNodeView";
import { EmbedNodeView } from "./editor/nodes/EmbedNodeView";
import { TableBubbleMenu } from "./editor/TableBubbleMenu";

lowlight.registerLanguage("javascript", javascript);
lowlight.registerLanguage("typescript", typescript);
lowlight.registerLanguage("css", css);
lowlight.registerLanguage("html", html);
lowlight.registerLanguage("json", json);
lowlight.registerLanguage("python", python);

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
      emoji: {
        default: "💡",
      },
      color: {
        default: "default",
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "aside[data-type='callout']",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
      }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ editor, range }) => {
          const content = {
            type: this.name,
            attrs: attrs ?? {},
            content: [
              {
                type: "paragraph",
              },
            ],
          };

          editor.commands.insertContentAt(range ?? editor.state.selection.head, content);
          editor.chain().focus().run();
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
      url: {
        default: "",
      },
      title: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-type='embed']",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "embed",
      }),
    ];
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
          const content = {
            type: this.name,
            attrs,
          };
          editor.commands.insertContentAt(range ?? editor.state.selection.head, content);
          editor.chain().focus().run();
          return true;
        },
    };
  },
});

function isValidUrl(url: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

type TipTapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  editable?: boolean;
};

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands or start writing...",
  className,
  editorClassName,
  editable = true,
}: TipTapEditorProps) {
  const lastValueRef = useRef(value ?? "");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<TipTapEditorInstance | null>(null);

  const slashCommands = useMemo<SlashCommandItem[]>(
    () => [
      {
        title: "Text",
        description: "Start writing with plain text",
        icon: DocumentTextIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setParagraph().run();
        },
      },
      {
        title: "Heading 1",
        description: "Large section heading",
        icon: HashtagIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
        },
      },
      {
        title: "Heading 2",
        description: "Medium section heading",
        icon: HashtagIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
        },
      },
      {
        title: "Heading 3",
        description: "Small section heading",
        icon: HashtagIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
        },
      },
      {
        title: "Heading 4",
        description: "Tiny section heading",
        icon: HashtagIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("heading", { level: 4 }).run();
        },
      },
      {
        title: "Bulleted list",
        description: "Create a simple bullet list",
        icon: Bars3Icon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: "Numbered list",
        description: "Create an ordered list",
        icon: QueueListIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: "Toggle list",
        description: "Collapsible content",
        icon: BarsArrowDownIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleDetails().run();
        },
      },
      {
        title: "Quote",
        description: "Add a block quote",
        icon: SparklesIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: "Callout",
        description: "Highlight important information",
        icon: Bars3BottomLeftIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCallout().run();
        },
      },
      {
        title: "Divider",
        description: "Visually separate blocks",
        icon: MinusIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
      },
      {
        title: "Code block",
        description: "Capture syntax highlighted code",
        icon: CodeBracketIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock().run();
        },
      },
      {
        title: "Inline code",
        description: "Format inline code",
        icon: CodeBracketIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCode().run();
        },
      },
      {
        title: "Bold",
        description: "Make text bold",
        icon: Bars3BottomLeftIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBold().run();
        },
      },
      {
        title: "Italic",
        description: "Emphasize text",
        icon: Bars3BottomLeftIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleItalic().run();
        },
      },
      {
        title: "Underline",
        description: "Underline text",
        icon: Bars3BottomLeftIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleUnderline().run();
        },
      },
      {
        title: "Strikethrough",
        description: "Strike text",
        icon: Bars3BottomLeftIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleStrike().run();
        },
      },
      {
        title: "Image",
        description: "Upload or paste an image",
        icon: PhotoIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          window.setTimeout(() => {
            imageInputRef.current?.click();
          }, 0);
        },
      },
      {
        title: "Table",
        description: "Insert a 3x3 table",
        icon: RectangleGroupIcon,
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        },
      },
      {
        title: "Embed",
        description: "Embed external content",
        icon: LinkIcon,
        command: ({ editor, range }) => {
          const url = window.prompt("Embed URL");
          if (!url) return;
          editor.chain().focus().deleteRange(range).setEmbed({ url }).run();
        },
      },
    ],
    []
  );

  const handleFiles = useCallback(async (files: FileList | null) => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;
    if (!files?.length) return;
    const filesArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!filesArray.length) return;

    const insertImage = (src: string, alt?: string) => {
      editorInstance.chain().focus().setImage({ src, alt }).run();
    };

    for (const file of filesArray) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === "string") {
            insertImage(result, file.name);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
          heading: {
            levels: [1, 2, 3, 4],
          },
          codeBlock: false,
        }),
        Placeholder.configure({
          placeholder,
          includeChildren: true,
          showOnlyWhenEditable: true,
          showOnlyCurrent: true,
          emptyEditorClass: "is-editor-empty",
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class:
              "text-neutral-900 underline underline-offset-2 decoration-neutral-400 hover:decoration-neutral-600",
          },
        }),
        Image.configure({
          inline: false,
          allowBase64: true,
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class:
              "notion-table w-full overflow-hidden rounded-xl border border-neutral-200 text-sm",
          },
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: {
            class: "bg-neutral-100 font-semibold",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border border-neutral-200 p-3 align-top",
          },
        }),
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class:
              "notion-codeblock overflow-x-auto rounded-xl bg-neutral-950/90 p-4 font-mono text-[13px] text-neutral-100",
          },
        }),
        ToggleExtension,
        DetailsSummary.configure({
          HTMLAttributes: {
            class:
              "flex cursor-pointer select-none items-center gap-2 text-[15px] font-medium text-neutral-700",
          },
        }),
        DetailsContent.configure({
          HTMLAttributes: {
            class: "pl-5 text-[15px] text-neutral-700",
          },
        }),
        Callout,
        Embed,
        SlashCommandExtension.configure({
          items: slashCommands,
        }),
      ],
      content: value ?? "",
      editable,
      editorProps: {
        attributes: {
          class: clsx(
            "notion-editor prose prose-neutral mx-auto min-h-[60vh] w-full max-w-3xl text-[16px] leading-7 text-neutral-800 outline-none focus:outline-none",
            editorClassName
          ),
          spellcheck: "true",
          "data-placeholder": placeholder,
        },
        handlePaste: (view, event) => {
          const files = event.clipboardData?.files;
          if (files && files.length) {
            void handleFiles(files);
            return true;
          }
          const text = event.clipboardData?.getData("text/plain");
          if (text && isValidUrl(text)) {
            editorRef.current?.chain().focus().setEmbed({ url: text }).run();
            return true;
          }
          return false;
        },
        handleDrop: (view, event, slice, moved) => {
          if (!event.dataTransfer) return false;
          const files = event.dataTransfer.files;
          if (files && files.length) {
            event.preventDefault();
            void handleFiles(files);
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const nextValue = editor.isEmpty ? "" : html;

        if (lastValueRef.current === nextValue) {
          return;
        }

        lastValueRef.current = nextValue;
        onChange(nextValue);
      },
    },
    [
      editable,
      editorClassName,
      handleFiles,
      onChange,
      placeholder,
      slashCommands,
    ]
  );

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isDestroyed) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const normalized = value ?? "";
    if (lastValueRef.current === normalized) {
      return;
    }

    const currentHTML = editor.getHTML();
    if (currentHTML === normalized || (editor.isEmpty && normalized === "")) {
      lastValueRef.current = normalized;
      return;
    }

    const { from, to } = editor.state.selection;
    editor.commands.setContent(normalized, false);
    editor.commands.setTextSelection({ from, to });
    const updatedHtml = editor.getHTML();
    lastValueRef.current = editor.isEmpty ? "" : updatedHtml;
  }, [editor, value]);

  const menuButtonClass = (isActive: boolean) =>
    clsx(
      "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition",
      isActive
        ? "bg-neutral-900 text-white"
        : "text-neutral-100 hover:bg-white/10 hover:text-white"
    );

  const blockButtonClass = (active?: boolean) =>
    clsx(
      "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm transition",
      active
        ? "bg-neutral-200 text-neutral-900"
        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
    );

  const handleImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div
      className={clsx(
        "group/editor relative rounded-2xl border border-neutral-200 bg-white/70 px-6 py-5 shadow-sm transition",
        className
      )}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleImageInputChange}
      />
      {editor ? (
        <>
          <BubbleMenu
            editor={editor}
            tippyOptions={{
              duration: 100,
              animation: "shift-away",
              offset: [0, 12],
            }}
            className="overflow-hidden rounded-full bg-neutral-900/95 px-2 py-1 shadow-2xl"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={menuButtonClass(editor.isActive("bold"))}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={menuButtonClass(editor.isActive("italic"))}
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={menuButtonClass(editor.isActive("underline"))}
              >
                <span className="underline">U</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={menuButtonClass(editor.isActive("strike"))}
              >
                <span className="line-through">S</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={menuButtonClass(editor.isActive("code"))}
              >
                <CodeBracketIcon className="h-4 w-4" />
              </button>
            </div>
          </BubbleMenu>
          <TableBubbleMenu editor={editor} />

          <FloatingMenu
            editor={editor}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white px-2 py-1 shadow-xl"
            tippyOptions={{ placement: "left-start", offset: [0, 10] }}
            shouldShow={({ state }) => {
              const { $from } = state.selection;
              return $from.parent.type.name === "paragraph" && $from.parent.textContent.length === 0;
            }}
          >
            <div className="flex items-center gap-1 text-sm text-neutral-600">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={blockButtonClass(editor.isActive("bulletList"))}
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={blockButtonClass(editor.isActive("orderedList"))}
              >
                1. List
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setCallout().run()}
                className={blockButtonClass(editor.isActive("callout"))}
              >
                Callout
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt("Embed URL");
                  if (!url) return;
                  editor.chain().focus().setEmbed({ url }).run();
                }}
                className={blockButtonClass(false)}
              >
                Embed
              </button>
            </div>
          </FloatingMenu>

          <EditorContent editor={editor} className="notion-editor-content" />
        </>
      ) : (
        <div className="h-40 animate-pulse rounded-xl bg-neutral-200/80" />
      )}
    </div>
  );
}

