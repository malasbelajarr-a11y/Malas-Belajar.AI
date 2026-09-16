import crypto from 'node:crypto';
import type {VercelRequest,VercelResponse} from '@vercel/node';
import {supabaseConfigured,supabaseRequest} from '../_lib/supabase';
import {validMentorCode} from '../_lib/mentorBank';
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({detail:'Method tidak diizinkan.'});
 let body:any;try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{}}catch{return res.status(400).json({detail:'Format permintaan tidak valid.'})}
 if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:'Kode mentor tidak valid. Verifikasi mentor terlebih dahulu.'});
 const level=String(body.level||'nguli').toLowerCase();if(!['nguli','mandor','supervisor'].includes(level))return res.status(400).json({detail:'Level tidak valid.'});
 const count=Math.max(1,Math.min(50,Number(body.count)||1));const prefix=level==='nguli'?'NGU':level==='mandor'?'MAN':'SPV';const out:any[]=[];
 for(let i=0;i<count;i++){
  let code='';
  for(let a=0;a<20;a++){const candidate=`MLS-${prefix}-${crypto.randomInt(1000,10000)}`;if(!supabaseConfigured()){code=candidate;break}const rows=await supabaseRequest<any[]>(`access_codes?code=eq.${candidate}&select=id`);if(!rows.length){code=candidate;break}}
  if(!code)continue;
  const item={id:crypto.randomUUID(),code,level,used:false,used_by:null,created_at:new Date().toISOString()};
  if(supabaseConfigured())await supabaseRequest('access_codes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(item)});
  out.push({id:item.id,code,level,used:false,used_by:''});
 }
 if(!out.length)return res.status(500).json({detail:'Tidak berhasil membuat kode. Coba lagi.'});
 return res.status(200).json(out);
}
