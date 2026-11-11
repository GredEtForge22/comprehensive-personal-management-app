import { defineConfig } from "drizzle-kit";

// Utilisé pour créer les tables sur Neon :
//   DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.neon.config.ts
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
