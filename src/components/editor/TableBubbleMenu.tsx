import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="table-bubble-menu"
      shouldShow={() => editor.isActive("table")}
      tippyOptions={{ duration: 150, offset: [0, 16] }}
      className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-sm shadow-2xl"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          + Col
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          Col →
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          + Row
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          Row ↓
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          − Col
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          − Row
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50"
        >
          Delete
        </button>
      </div>
    </BubbleMenu>
  );
}
