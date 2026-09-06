import app from "../server";

// Keep one Express app as the single Vercel API function. server.ts already
// installs JSON, urlencoded, cookie, and all /api/* middleware/routes.
export default app;
