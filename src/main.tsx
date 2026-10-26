import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { validateSupabaseConfig } from "./integrations/supabase/config";
import "leaflet/dist/leaflet.css";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

async function startApp() {
  try {
    validateSupabaseConfig(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
  } catch (error) {
    root.render(
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section role="alert" className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">PROP-CONNECT needs configuration</h1>
          <p className="mt-3 text-sm">{error instanceof Error ? error.message : "The public backend configuration is invalid."}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            For local development, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local using .env.example, then restart the development server.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Use the project's public publishable key. Server secrets must stay on the server.</p>
        </section>
      </main>,
    );
    return;
  }

  try {
    // Load backend-dependent modules only after configuration has been checked.
    const { default: App } = await import("./App.tsx");
    root.render(<HelmetProvider><App /></HelmetProvider>);
  } catch {
    root.render(
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section role="alert" className="max-w-lg rounded-xl border border-border p-6">
          <h1 className="text-xl font-semibold">PROP-CONNECT could not load</h1>
          <p className="mt-3">Refresh the page to retry loading the application.</p>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>Reload page</button>
        </section>
      </main>,
    );
  }
}

void startApp();
