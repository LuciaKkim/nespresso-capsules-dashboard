import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // IPv6-only localhost면 127.0.0.1 접속 시 ERR -102 (connection refused)
    host: true,
    port: 5173,
    strictPort: false,
    open: "/",
    proxy: {
      "/api/nespresso": {
        target: "https://www.nespresso.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nespresso/, ""),
      },
    },
  },
});
