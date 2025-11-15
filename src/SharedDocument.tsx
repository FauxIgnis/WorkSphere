import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useParams } from "react-router-dom";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { normalizeDocumentContent } from "./lib/documentContent";

export function SharedDocument() {
  const { shareableLink } = useParams<{ shareableLink: string }>();
  const [notFound, setNotFound] = useState(false);

  const document = useQuery(
    api.documents.getDocumentByShareableLink,
    shareableLink ? { shareableLink } : "skip"
  );

  const formattedContent = useMemo(
    () => normalizeDocumentContent(document?.content),
    [document?.content]
  );

  useEffect(() => {
    if (shareableLink && document === null) {
      setNotFound(true);
    }
  }, [document, shareableLink]);

  const exportToPDF = () => {
    if (!document) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .content p { margin: 0 0 1em; }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <div class="content">${formattedContent || "<p>This document is empty.</p>"}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentArrowDownIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
          <p className="text-gray-600">
            The shared document you're looking for doesn't exist or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Kodex</h1>
            <span className="ml-2 text-sm text-gray-500 font-medium">v1.0</span>
          </div>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </header>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
            <div className="text-sm text-gray-500">
              Last modified: {new Date(document.lastModifiedAt).toLocaleString()}
              <span className="mx-2">•</span>
              Version {document.version}
            </div>
          </div>
          
          <div className="prose max-w-none">
            <div
              className="text-gray-900 leading-relaxed"
              style={{ fontFamily: 'Georgia, serif' }}
              dangerouslySetInnerHTML={{
                __html: formattedContent || "<p>This document is empty.</p>",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
