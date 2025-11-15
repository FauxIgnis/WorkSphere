import { NodeViewWrapper } from "@tiptap/react";

export interface EmbedNodeViewProps {
  node: {
    attrs: {
      url: string;
      title?: string;
    };
  };
}

const iframeAllowList = ["youtube.com", "youtu.be", "player.vimeo.com"];

function isEmbeddable(url: string) {
  try {
    const parsed = new URL(url);
    return iframeAllowList.some((domain) => parsed.hostname.includes(domain));
  } catch (error) {
    return false;
  }
}

export function EmbedNodeView({ node }: EmbedNodeViewProps) {
  const { url, title } = node.attrs;
  const embeddable = isEmbeddable(url);
  const displayUrl = (() => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch (error) {
      return url;
    }
  })();

  return (
    <NodeViewWrapper className="notion-embed my-4 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      {embeddable ? (
        <div className="aspect-video w-full bg-neutral-950/5">
          <iframe
            src={url}
            title={title ?? url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 font-semibold text-neutral-500">
          {displayUrl.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-medium text-neutral-800">{title ?? url}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 underline-offset-2 hover:underline"
          >
            {displayUrl}
          </a>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
