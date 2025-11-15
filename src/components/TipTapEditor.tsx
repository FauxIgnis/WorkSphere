import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";

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
        }),
        Placeholder.configure({
          placeholder,
          includeChildren: true,
          showOnlyWhenEditable: true,
          showOnlyCurrent: true,
          emptyEditorClass: "is-editor-empty",
        }),
      ],
      content: value ?? "",
      editable,
      editorProps: {
        attributes: {
          class:
            "min-h-[60vh] text-[16px] leading-7 text-neutral-800 outline-none focus:outline-none",
          spellcheck: "true",
          "data-placeholder": placeholder,
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
    [onChange, placeholder, editable]
  );

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

    editor.commands.setContent(normalized, false);
    const updatedHtml = editor.getHTML();
    lastValueRef.current = editor.isEmpty ? "" : updatedHtml;
  }, [editor, value]);

  return (
    <div
      className={clsx(
        "group/editor relative rounded-2xl border border-transparent bg-white/70 px-6 py-5 shadow-sm transition focus-within:border-neutral-300 focus-within:bg-white",
        className
      )}
    >
      {editor ? (
        <EditorContent editor={editor} className={editorClassName} />
      ) : (
        <div className="h-40 animate-pulse rounded-xl bg-neutral-200/80" />
      )}
    </div>
  );
}
