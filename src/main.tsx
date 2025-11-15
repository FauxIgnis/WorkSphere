import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

type RootElement = HTMLElement & { innerText?: string };

const rootElement = document.getElementById("root") as RootElement | null;

if (!rootElement) {
  throw new Error("Root element with id 'root' not found in the document.");
}

const root = createRoot(rootElement);
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (typeof convexUrl !== "string" || convexUrl.length === 0) {
  console.error(
    "VITE_CONVEX_URL is not defined. Make sure `convex dev` is running or provide the deployment URL in your environment.",
  );

  root.render(
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] text-neutral-900">
      <div className="max-w-lg space-y-4 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Configuration required</h1>
        <p className="text-sm text-neutral-600">
          The application cannot connect to Convex because the <code className="rounded bg-neutral-100 px-1 py-0.5">VITE_CONVEX_URL</code>
          environment variable is missing. Start the backend with <code className="rounded bg-neutral-100 px-1 py-0.5">convex dev</code> or set the URL in a
          <code className="rounded bg-neutral-100 px-1 py-0.5">.env.local</code> file.
        </p>
        <p className="text-sm text-neutral-600">
          Once configured, restart the development server to continue.
        </p>
      </div>
    </div>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  root.render(
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </StrictMode>,
  );
}
