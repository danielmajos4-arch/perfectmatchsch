import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { register } from "./lib/serviceWorker";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality (only in production)
if (import.meta.env.PROD) {
  register({
    onSuccess: (registration) => {
      console.log('[Service Worker] Registered successfully:', registration);
    },
    onUpdate: (registration) => {
      console.log('[Service Worker] Update available:', registration);
    },
  });
} else {
  console.log('[Service Worker] Disabled in development mode');
}
