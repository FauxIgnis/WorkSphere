import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";

const CALLOUT_COLORS: Record<string, string> = {
  default: "border-neutral-200 bg-neutral-50",
  info: "border-blue-200 bg-blue-50",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  danger: "border-rose-200 bg-rose-50",
};

export interface CalloutNodeViewProps {
  updateAttributes: (attrs: Record<string, unknown>) => void;
  node: {
    attrs: {
      emoji?: string;
      color?: keyof typeof CALLOUT_COLORS;
    };
  };
}

export function CalloutNodeView({ node, updateAttributes }: CalloutNodeViewProps) {
  const { emoji = "💡", color = "default" } = node.attrs;
  const className = CALLOUT_COLORS[color] ?? CALLOUT_COLORS.default;

  const handleEmojiChange = () => {
    const promptEmoji = window.prompt("Callout icon (emoji)", emoji ?? "");
    if (!promptEmoji) return;
    updateAttributes({ emoji: promptEmoji });
  };

  const handleColorChange = () => {
    const promptColor = window.prompt(
      "Callout color (default, info, success, warning, danger)",
      color
    );
    if (!promptColor) return;
    const normalized = promptColor.toLowerCase();
    if (!CALLOUT_COLORS[normalized]) return;
    updateAttributes({ color: normalized });
  };

  return (
    <NodeViewWrapper
      as="aside"
      className={`notion-callout group relative my-3 flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-[15px] leading-7 text-neutral-800 ${className}`}
      data-color={color}
    >
      <button
        type="button"
        onClick={handleEmojiChange}
        className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-xl transition hover:bg-white/70"
        aria-label="Change callout icon"
      >
        {emoji}
      </button>
      <div className="flex-1">
        <NodeViewContent className="notion-callout-content" />
      </div>
      <button
        type="button"
        onClick={handleColorChange}
        className="absolute right-3 top-3 hidden rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-neutral-500 shadow-sm transition hover:bg-white group-hover:flex"
      >
        Color
      </button>
    </NodeViewWrapper>
  );
}
