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
          target: env.VITE_API_PROXY_TARGET || "http://localhost:5100",
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("firebase")) return "vendor-firebase";
              if (id.includes("gsap") || id.includes("motion")) return "vendor-animation";
              if (id.includes("@heroicons") || id.includes("@radix-ui")) return "vendor-ui";
              if (id.includes("react-router") || id.includes("react-dom") || id.includes("react/")) return "vendor-react";
              if (id.includes("i18next")) return "vendor-i18n";
            }
          },
        },
      },
    },
  };
});

