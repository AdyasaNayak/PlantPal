import { defineConfig } from "vite";

// The Express backend runs on port 5000 by default (see backend/.env.example).
const proxy = {
  "/api": {
    target: "http://localhost:5000",
    changeOrigin: true,
  },
};

export default defineConfig({
  server: {
    proxy,
  },
  preview: {
    proxy,
  },
});
