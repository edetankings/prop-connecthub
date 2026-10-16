import { defineConfig } from "drizzle-kit";

// Historical tooling only. Never point this empty legacy schema at the
// independent database; its reviewed installation lives under database/.
const legacyDatabaseUrl = process.env.PROP_CONNECT_LEGACY_DATABASE_URL;
if (!legacyDatabaseUrl) {
  throw new Error("Historical Drizzle tooling is disabled. Supply PROP_CONNECT_LEGACY_DATABASE_URL only for an explicitly reviewed legacy operation; use the isolated baseline for the independent project.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: legacyDatabaseUrl,
  },
});
