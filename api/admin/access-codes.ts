import crypto from 'node:crypto';
import type { VercelRequest,VercelResponse } from '@vercel/node';

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
  if(req.method!=='POST')return res.status(405).json({detail:'Method tidak diizinkan.'});
  try{
    const body:any=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid. Verifikasi mentor terlebih dahulu.'});
    const level=String(body.level||'nguli').toLowerCase();
    if(!['nguli','mandor','supervisor'].includes(level))return res.status(400).json({detail:'Level tidak valid.'});
    const count=Math.max(1,Math.min(50,Number(body.count)||1));
    const prefix=level==='nguli'?'NGU':level==='mandor'?'MAN':'SPV';
    const codes=new Set<string>();
    while(codes.size<count)codes.add(`MLS-${prefix}-${crypto.randomInt(1000,10000)}`);
    const out=[...codes].map((code,i)=>({id:`code-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,code,level,used:false,used_by:''}));
    if(configured()){
      try{
        await supabase('access_codes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(out.map(x=>({id:x.id,code:x.code,level:x.level,used:false,used_by:null,created_at:new Date().toISOString()})))});
      }catch(error){
        console.error('ACCESS_CODE_PERSIST_ERROR',error);
        for(const item of out)memory.unshift(item);
      }
    }else{
      for(const item of out)memory.unshift(item);
    }
    return res.status(200).json(out);
  }catch(error){
    console.error('MENTOR_ACCESS_CODE_ERROR',error);
    return res.status(500).json({detail:error instanceof Error?error.message:'Server gagal membuat kode siswa.'});
  }
}
