import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   test: {
//     environment: 'jsdom',
//     setupFiles: './src/test/setup.ts',
//     clearMocks: true,
//   },
//   server: {
//     proxy: {
//       '/api': {
//         target: 'https://api.realtiq.com.ng',
//         changeOrigin: true,
//       },
// '/socket.io': {
//   target: 'https://api.realtiq.com.ng',
//   changeOrigin: true,
//   ws: true,
// },
//     },
//   },
// })

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
