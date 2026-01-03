import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // OpenSky API proxy (browser CORS-safe).
      "/opensky": {
        target: "https://opensky-network.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/opensky/, "")
      }
    }
  }
});


