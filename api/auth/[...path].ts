import app from "../../server";

// Dedicated auth function so /api/auth/* is always resolved by Vercel
// before the SPA/static routing layer. Express still owns the actual auth logic.
export default app;
