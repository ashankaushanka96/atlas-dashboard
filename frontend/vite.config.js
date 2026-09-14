import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GH_PAGES_BASE is only set by the GitHub Pages deploy workflow (a project
// site is served from https://<user>.github.io/<repo>/, not the domain
// root). Local dev and the docker/Ansible builds never set it, so `base`
// stays "/" for them.
export default defineConfig({
  base: process.env.GH_PAGES_BASE || "/",
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
