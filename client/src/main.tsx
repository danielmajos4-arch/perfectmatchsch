import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { register } from "./lib/serviceWorker";
import { startEmailNotificationProcessor } from "./lib/emailNotificationService";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  register({
    onSuccess: (registration) => {
      console.log('[Service Worker] Registered successfully:', registration);
    },
    onUpdate: (registration) => {
      console.log('[Service Worker] Update available:', registration);
      // Update prompt will be handled by ServiceWorkerUpdate component (Task 1.4)
    },
  });

  // Start email notification processor (runs every minute)
  // Only in production to avoid unnecessary API calls in development
  const stopEmailProcessor = startEmailNotificationProcessor(60000); // 60 seconds
  
  // Cleanup on page unload (though this is rarely needed for SPAs)
  window.addEventListener('beforeunload', () => {
    stopEmailProcessor();
  });
} else {
  // In development, log that service worker is disabled
  console.log('[Service Worker] Disabled in development mode');
  console.log('[Email Notifications] Processor disabled in development mode');
}
