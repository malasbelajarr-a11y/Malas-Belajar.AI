import crypto from 'node:crypto';
import type { VercelRequest,VercelResponse } from '@vercel/node';

const SUBTESTS=[
  ['pu','Penalaran Umum'],['ppu','Pengetahuan & Pemahaman Umum'],['pbm','Pemahaman Bacaan & Menulis'],['pk','Pengetahuan Kuantitatif'],
  ['lit_indo','Literasi Bahasa Indonesia'],['lit_inggris','Literasi Bahasa Inggris'],['pm','Penalaran Matematika']
] as const;
const MENTOR_CODES=new Set(['MENTOR-MLS','RODI2026','MALASBELAJAR','MLS2026','123456','ADMIN','MENTOR']);
const MENTOR_HASH='d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e';
const memory:any[]=[];
function validMentor(v:unknown){const c=String(v||'').trim().toUpperCase();return MENTOR_CODES.has(c)||crypto.createHash('sha256').update(c).digest('hex')===MENTOR_HASH;}
function configured(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
async function supabase(path:string,init:RequestInit={}){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!base||!key)throw new Error('Supabase belum dikonfigurasi.');
  const response=await fetch(`${base}/rest/v1/${path}`,{...init,signal:AbortSignal.timeout(5000),headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(init.headers||{})}});
  const text=await response.text();
  let body:any=null;try{body=text?JSON.parse(text):null}catch{body=text}
  if(!response.ok)throw new Error(String(body?.message||body?.hint||body?.details||body?.error||`Supabase ${response.status}`));
  return body;
}
export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='POST')return res.status(405).json({detail:'Method tidak didukung.'});
  try{
    const body:any=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid. Verifikasi mentor terlebih dahulu.'});
    const chapter=String(body.subtest||'pu');
    const meta=SUBTESTS.find(x=>x[0]===chapter);
    if(!meta)return res.status(400).json({detail:'Subtes tidak valid.'});
    const prompt=String(body.prompt||'').trim();
    const options=Array.isArray(body.options)?body.options.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,5):[];
    if(!prompt||options.length<4)return res.status(400).json({detail:'Soal dan minimal 4 opsi wajib diisi.'});
    const rawCorrect=Number(body.correct_option);const correct=Number.isFinite(rawCorrect)?Math.max(0,Math.min(options.length-1,rawCorrect)):0;
    const q={id:`mentor-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,chapter,chapter_label:meta[1],number:1,difficulty:String(body.difficulty||'Sedang'),topic:String(body.topic||'Soal Mentor'),prompt,answer:options[correct],steps:Array.isArray(body.steps)?body.steps.map((x:any)=>String(x)).filter(Boolean):[],is_final:false,options,correct_option:correct,irt_difficulty:Number(body.irt_difficulty)||0,irt_discrimination:Number(body.irt_discrimination)||1.2,level:String(body.level||'nguli'),trap_tip:String(body.trap_tip||''),video_url:String(body.video_url||''),file_url:String(body.file_url||'')};
    if(configured()){
      try{
        await supabase('wacawaci_resources',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:q.id,kind:'mentor_question',title:`${q.chapter_label} #${q.number}`,description:JSON.stringify(q),url:q.file_url||q.video_url||'',is_public:true,created_by:'mentor',level:q.level})});
      }catch(error){
        console.error('MENTOR_QUESTION_PERSIST_ERROR',error);
        memory.unshift(q);
      }
    }else memory.unshift(q);
    return res.status(201).json(q);
  }catch(error){
    console.error('MENTOR_QUESTION_SAVE_ERROR',error);
    return res.status(500).json({detail:error instanceof Error?error.message:'Soal gagal disimpan.'});
  }
}
