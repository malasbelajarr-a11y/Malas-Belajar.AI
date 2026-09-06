import app from "../server";

// Vercel catch-all API function: forwards every /api/* route to the
// existing Express application so nested routes such as
// /api/admin/access-codes and /api/wacawaci/resources work in production.
export default app;
