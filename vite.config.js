import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium({
    // Ensure Cesium assets are copied to the correct output directory
    rebuildCesium: false
  })],
  base: '/SkyNeedle/',  // GitHub Pages repository path
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
});
