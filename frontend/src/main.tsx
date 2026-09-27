
  import { createRoot } from "react-dom/client";
  import "./styles/index.css";

  // Microsoft login (MSAL v5 popup) redirects back to this origin with the auth
  // response in the URL hash, e.g. "#code=...&state=...". MSAL v5 no longer reads
  // the popup's URL from the main window — the redirect page itself must hand the
  // response over via the redirect bridge, which broadcasts it to the main window
  // and closes the popup. Without this, the whole app boots inside the popup.
  function isMsalAuthResponse() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.has("state") && (params.has("code") || params.has("error"));
  }

  async function bootstrap() {
    if (isMsalAuthResponse()) {
      try {
        const { broadcastResponseToMainFrame } = await import("@azure/msal-browser/redirect-bridge");
        await broadcastResponseToMainFrame();
        // window.close() is attempted by the bridge; this only shows if the browser blocked it.
        document.getElementById("root")!.textContent = "Sign-in complete. You can close this window.";
        return;
      } catch (err) {
        // Not a valid MSAL response — fall through and load the app normally.
        console.error("Microsoft sign-in response could not be processed:", err);
      }
    }

    const { default: App } = await import("./app/App.tsx");
    createRoot(document.getElementById("root")!).render(<App />);
  }

  bootstrap();
