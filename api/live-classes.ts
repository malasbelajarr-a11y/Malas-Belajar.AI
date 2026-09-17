import type { VercelRequest,VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { supabaseConfigured,supabaseRequest } from './_lib/supabase';

const CODES=new Set(['MENTOR-MLS','RODI2026','MALASBELAJAR','MLS2026','123456','ADMIN','MENTOR']);
const HASH='d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e';
const memory:any[]=[];
function valid(v:unknown){const c=String(v||'').trim().toUpperCase();return CODES.has(c)||crypto.createHash('sha256').update(c).digest('hex')===HASH;}
function parse(r:any){try{return JSON.parse(r.description)}catch{return null}}

export default async function handler(req:VercelRequest,res:VercelResponse){
  try{
    if(req.method==='GET'){
      if(supabaseConfigured()){
        try{
          const rows=await supabaseRequest<any[]>('wacawaci_resources?kind=eq.live_class&select=*&order=created_at.desc');
          return res.status(200).json(rows.map(parse).filter(Boolean));
        }catch(error){ console.error('LIVE_LOAD_ERROR',error); }
      }
      return res.status(200).json(memory);
    }
    if(req.method!=='POST')return res.status(405).json({detail:'Method tidak didukung.'});
    const body:any=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    if(!valid(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
    const youtube=String(body.youtube_url||'').trim();
    if(!youtube)return res.status(400).json({detail:'URL YouTube Live wajib diisi.'});
    const item={id:`live-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,title:String(body.title||'Live Class Tambahan').trim(),description:String(body.description||'Sesi belajar langsung').trim(),youtube_url:youtube,starts_at:String(body.starts_at||new Date().toISOString()),recording_url:String(body.recording_url||youtube),level:String(body.level||'nguli'),status:'scheduled'};
    if(supabaseConfigured()){
      await supabaseRequest('wacawaci_resources',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:item.id,kind:'live_class',title:item.title,description:JSON.stringify(item),url:item.youtube_url,is_public:true,created_by:'mentor',level:item.level})});
    }
    memory.unshift(item);
    return res.status(201).json(item);
  }catch(error){
    console.error('LIVE_SAVE_ERROR',error);
    return res.status(500).json({detail:error instanceof Error?error.message:'Server gagal menyimpan Live Class.'});
  }
}
