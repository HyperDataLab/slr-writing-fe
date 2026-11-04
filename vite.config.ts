import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_WRITING_API_TARGET || "http://localhost:5100",
          changeOrigin: true,
        },
        "/slr-api": {
          target: env.VITE_SLR_API_TARGET || "http://localhost:5000",
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/slr-api/, "/api"),
        },
      },
    },
  };
});

