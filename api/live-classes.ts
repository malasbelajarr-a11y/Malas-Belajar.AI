import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const CODES = new Set(["MENTOR-MLS","RODI2026","MALASBELAJAR","MLS2026","123456","ADMIN","MENTOR"]);
const HASH = "d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
const items:any[] = [];
function valid(v:unknown){const c=String(v||"").trim().toUpperCase();return CODES.has(c)||crypto.createHash("sha256").update(c).digest("hex")===HASH;}
export default function handler(req:VercelRequest,res:VercelResponse){
  if(req.method==="GET") return res.status(200).json(items);
  if(req.method!=="POST") return res.status(405).json({detail:"Method tidak didukung."});
  let body:any; try{body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};}catch{return res.status(400).json({detail:"Format Live Class tidak valid."});}
  if(!valid(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});
  const youtube=String(body.youtube_url||"").trim();
  if(!youtube)return res.status(400).json({detail:"URL YouTube Live wajib diisi."});
  const item={id:`live-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,title:String(body.title||"Live Class Tambahan"),description:String(body.description||"Sesi belajar langsung"),youtube_url:youtube,starts_at:String(body.starts_at||new Date().toISOString()),recording_url:String(body.recording_url||youtube),level:String(body.level||"nguli"),status:"scheduled"};
  items.unshift(item); return res.status(201).json(item);
}
