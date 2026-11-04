import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The API tests each boot a real Postgres (PGlite, WebAssembly); with every file running in
    // parallel, the first test in a file can pass 5s on startup alone.
    testTimeout: 20_000,
    include: ["packages/**/test/**/*.test.ts", "scripts/**/test/**/*.test.ts", "apps/**/test/**/*.test.ts"],
  },
});
