import express from "express";
import app from "../../server";

// Auth requests are routed through a dedicated Vercel function. Parse the
// incoming body at the function boundary before handing it to Express so
// register/demo/login never fail because req.body is undefined.
const handler = express();
handler.use(express.json());
handler.use(express.urlencoded({ extended: true }));
handler.use(app);

export default handler;
