import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        new URL("./migrations", import.meta.url).pathname,
      );
      return {
        miniflare: {
          bindings: {
            ADMIN_TOKEN: "test-admin-token",
            RESEND_API_KEY: "",
            RESEND_FROM_EMAIL: "",
            ADMIN_NOTIFY_EMAIL: "",
            TEST_MIGRATIONS: migrations,
          },
        },
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
