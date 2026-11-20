import path from "node:path";
import { defineConfig } from "vitest/config";

// Node environment by default; component tests opt into jsdom with a
// `// @vitest-environment jsdom` docblock.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  esbuild: { jsx: "automatic" },
  test: { exclude: ["node_modules/**", ".next/**", "e2e/**"] },
});
