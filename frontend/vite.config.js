import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 (reachable via your machine's LAN IP)
    port: 3000,
    allowedHosts: ["dashboard.example.com"],
    hmr: {
      protocol: "wss", // nginx terminates TLS on 443, so the browser must speak wss back
      port: 3000, // dev server port
      clientPort: 443, // the public port the browser connects to (nginx), not the container's 3000
      path: "/ws", // nginx's dedicated websocket-upgrade location proxying to this container
    },
  },
});
