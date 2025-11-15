const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const normalizeDocumentContent = (
  rawContent: string | null | undefined
) => {
  if (!rawContent) return "";

  if (HTML_TAG_REGEX.test(rawContent)) {
    return rawContent;
  }

  const paragraphs = rawContent.split(/\n{2,}/);

  return paragraphs
    .map((paragraph) => {
      if (!paragraph.trim()) {
        return "<p><br /></p>";
      }

      const lines = paragraph
        .split(/\n/)
        .map((line) => escapeHtml(line.trimEnd()));

      return `<p>${lines.join("<br />")}</p>`;
    })
    .join("");
};
