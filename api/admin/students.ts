import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listStudents, publicStudent } from "../../_lib/studentStore";
import crypto from "node:crypto";

const LEGACY = new Set(["MENTOR-MLS","RODI2026","MALASBELAJAR","MLS2026","123456","ADMIN","MENTOR"]);
const HASH = "d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
function valid(v:unknown){const c=String(v||"").trim().toUpperCase();return LEGACY.has(c)||crypto.createHash("sha256").update(c).digest("hex")===HASH;}
export default async function handler(req:VercelRequest,res:VercelResponse){
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
  if(!valid(req.query?.mentor_code||body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});
  if(req.method!=="GET")return res.status(405).json({detail:"Method tidak didukung."});
  return res.status(200).json((await listStudents()).map(publicStudent));
}
