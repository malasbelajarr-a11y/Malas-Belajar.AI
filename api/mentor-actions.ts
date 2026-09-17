import crypto from 'node:crypto';
import type { VercelRequest,VercelResponse } from '@vercel/node';

const MENTOR_CODES=new Set(['MENTOR-MLS','RODI2026','MALASBELAJAR','MLS2026','123456','ADMIN','MENTOR']);
const MENTOR_HASH='d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e';
const SUBTESTS=[
  ['pu','Penalaran Umum',30],['ppu','Pengetahuan & Pemahaman Umum',20],['pbm','Pemahaman Bacaan & Menulis',20],['pk','Pengetahuan Kuantitatif',20],
  ['lit_indo','Literasi Bahasa Indonesia',30],['lit_inggris','Literasi Bahasa Inggris',20],['pm','Penalaran Matematika',20]
] as const;
const memoryCodes:any[]=[]; const memoryQuestions:any[]=[]; const memoryTryouts:any[]=[]; const memoryLives:any[]=[];
function validMentor(v:unknown){const c=String(v||'').trim().toUpperCase();return MENTOR_CODES.has(c)||crypto.createHash('sha256').update(c).digest('hex')===MENTOR_HASH;}
function configured(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
async function db(path:string,init:RequestInit={}){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,''); const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!base||!key)throw new Error('Supabase belum dikonfigurasi.');
  const r=await fetch(`${base}/rest/v1/${path}`,{...init,signal:AbortSignal.timeout(5000),headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(init.headers||{})}});
  const text=await r.text(); let body:any=null; try{body=text?JSON.parse(text):null}catch{body=text}
  if(!r.ok)throw new Error(String(body?.message||body?.hint||body?.details||body?.error||`Supabase ${r.status}`)); return body;
}
function bodyOf(req:any){return typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})}
function parseRows(rows:any[],field='description'){return rows.map(r=>{try{return typeof r?.[field]==='string'?JSON.parse(r[field]):r?.data}catch{return null}}).filter(Boolean)}
async function saveResource(data:any){if(!configured())return false;try{await db('wacawaci_resources',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(data)});return true}catch(e){console.error('MENTOR_ACTION_PERSIST_ERROR',e);return false}}

export default async function handler(req:VercelRequest,res:VercelResponse){
  try{
    const action=String(req.query?.action||'').trim().toLowerCase(); const body=bodyOf(req);
    if(!action)return res.status(400).json({detail:'Aksi mentor tidak ditentukan.'});
    if(action==='access-codes'){
      if(req.method!=='POST')return res.status(405).json({detail:'Method tidak diizinkan.'});
      if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
      const level=String(body.level||'nguli').toLowerCase(); if(!['nguli','mandor','supervisor'].includes(level))return res.status(400).json({detail:'Level tidak valid.'});
      const count=Math.max(1,Math.min(50,Number(body.count)||1)); const prefix=level==='nguli'?'NGU':level==='mandor'?'MAN':'SPV'; const codes=new Set<string>();
      while(codes.size<count)codes.add(`MLS-${prefix}-${crypto.randomInt(1000,10000)}`);
      const out=[...codes].map(code=>({id:crypto.randomUUID(),code,level,used:false,used_by:''}));
      let saved=false;
      if(configured())saved=await db('access_codes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(out.map(x=>({id:x.id,code:x.code,level:x.level,used:false,used_by:null,created_at:new Date().toISOString()})))}).then(()=>true).catch(e=>{console.error('ACCESS_CODE_PERSIST_ERROR',e);return false});
      if(!saved)memoryCodes.unshift(...out); return res.status(200).json(out);
    }
    if(action==='questions'){
      if(req.method!=='POST')return res.status(405).json({detail:'Method tidak didukung.'});
      if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
      const chapter=String(body.subtest||'pu'); const meta=SUBTESTS.find(x=>x[0]===chapter); if(!meta)return res.status(400).json({detail:'Subtes tidak valid.'});
      const prompt=String(body.prompt||'').trim(); const options=Array.isArray(body.options)?body.options.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,5):[]; if(!prompt||options.length<4)return res.status(400).json({detail:'Soal dan minimal 4 opsi wajib diisi.'});
      const raw=Number(body.correct_option); const correct=Number.isFinite(raw)?Math.max(0,Math.min(options.length-1,raw)):0;
      const q={id:`mentor-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,chapter,chapter_label:meta[1],number:1,difficulty:String(body.difficulty||'Sedang'),topic:String(body.topic||'Soal Mentor'),prompt,answer:options[correct],steps:Array.isArray(body.steps)?body.steps.map((x:any)=>String(x)).filter(Boolean):[],is_final:false,options,correct_option:correct,irt_difficulty:Number(body.irt_difficulty)||0,irt_discrimination:Number(body.irt_discrimination)||1.2,level:String(body.level||'nguli'),trap_tip:String(body.trap_tip||''),video_url:String(body.video_url||''),file_url:String(body.file_url||'')};
      const saved=await saveResource({id:q.id,kind:'mentor_question',title:`${q.chapter_label} #${q.number}`,description:JSON.stringify(q),url:q.file_url||q.video_url||'',is_public:true,created_by:'mentor',level:q.level}); if(!saved)memoryQuestions.unshift(q); else memoryQuestions.unshift(q); return res.status(201).json(q);
    }
    if(action==='bank'){
      if(req.method!=='GET')return res.status(405).json({detail:'Method tidak didukung.'}); if(!validMentor(req.query?.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
      let questions=[...memoryQuestions]; let tryouts=[...memoryTryouts];
      if(configured()){try{questions=parseRows(await db('wacawaci_resources?kind=eq.mentor_question&select=*&order=created_at.desc'));}catch(e){console.error('MENTOR_BANK_LOAD_ERROR',e)} try{tryouts=parseRows(await db('wacawaci_resources?kind=eq.mentor_tryout&select=*&order=created_at.desc'));}catch(e){console.error('MENTOR_TRYOUT_LOAD_ERROR',e)}}
      return res.status(200).json({subtests:SUBTESTS.map(([id,label,count])=>({id,label,question_count:count,added:questions.filter((q:any)=>q.chapter===id).length})),questions,tryouts});
    }
    if(action==='tryouts'){
      if(req.method!=='POST')return res.status(405).json({detail:'Method tidak didukung.'}); if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
      let questions=[...memoryQuestions]; if(configured()){try{questions=parseRows(await db('wacawaci_resources?kind=eq.mentor_question&select=*&order=created_at.desc'))}catch(e){console.error('MENTOR_TRYOUT_LOAD_ERROR',e)}}
      const level=String(body.level||'nguli'); const picked=SUBTESTS.flatMap(([id,,count])=>questions.filter((q:any)=>q.chapter===id&&(q.level===level||q.level==='all')).slice(0,count));
      if(picked.length<1)return res.status(400).json({detail:'Belum ada soal mentor di bank.'});
      const t={id:`mentor-to-${Date.now()}`,title:String(body.title||'UTBK Tryout Mentor'),description:'Tryout 7 subtes buatan mentor.',duration_minutes:195,question_count:picked.length,status:'active',max_score:1000,level,questions:picked};
      const saved=await saveResource({id:t.id,kind:'mentor_tryout',title:t.title,description:JSON.stringify(t),url:'',is_public:true,created_by:'mentor',level:t.level}); memoryTryouts.unshift(t); return res.status(201).json(t);
    }
    if(action==='live'){
      if(req.method==='GET'){
        if(configured()){try{return res.status(200).json(parseRows(await db('wacawaci_resources?kind=eq.live_class&select=*&order=created_at.desc')))}catch(e){console.error('LIVE_LOAD_ERROR',e)}}
        return res.status(200).json(memoryLives);
      }
      if(req.method!=='POST')return res.status(405).json({detail:'Method tidak didukung.'}); if(!validMentor(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid.'});
      const youtube=String(body.youtube_url||'').trim(); if(!youtube)return res.status(400).json({detail:'URL YouTube Live wajib diisi.'});
      const item={id:`live-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,title:String(body.title||'Live Class Tambahan').trim(),description:String(body.description||'Sesi belajar langsung').trim(),youtube_url:youtube,starts_at:String(body.starts_at||new Date().toISOString()),recording_url:String(body.recording_url||youtube),level:String(body.level||'nguli'),status:'scheduled'};
      const saved=await saveResource({id:item.id,kind:'live_class',title:item.title,description:JSON.stringify(item),url:item.youtube_url,is_public:true,created_by:'mentor',level:item.level}); memoryLives.unshift(item); return res.status(201).json(item);
    }
    return res.status(404).json({detail:'Aksi mentor tidak ditemukan.'});
  }catch(error){console.error('MENTOR_ACTION_ERROR',error);return res.status(500).json({detail:error instanceof Error?error.message:'Server mentor gagal memproses permintaan.'});}
}
