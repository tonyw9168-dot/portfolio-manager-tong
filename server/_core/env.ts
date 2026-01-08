export const ENV = {
  appId: process.env.VITE_APP_ID ?? "portfolio-manager",
  cookieSecret: process.env.JWT_SECRET ?? "portfolio-manager-secret-key-2026",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

if (typeof window === "undefined") {
  console.log(`[Config] OAuth enabled: ${!!ENV.oAuthServerUrl}`);
  console.log(`[Config] App ID: ${ENV.appId}`);
}
