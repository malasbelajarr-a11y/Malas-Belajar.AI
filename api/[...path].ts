import express from "express";
import app from "../server";

// Vercel may hand the request to the function without an Express-parsed body.
// Parse JSON/form bodies once at the function boundary so POST/PATCH routes
// such as auth, mentor, admin, and UTBABY never crash on req.body === undefined.
const handler = express();
handler.use(express.json());
handler.use(express.urlencoded({ extended: true }));
handler.use(app);

export default handler;
