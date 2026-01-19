import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  base: '/SkyNeedle/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['cesium'],
      output: {
        globals: {
          cesium: 'Cesium'
        }
      }
    }
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
