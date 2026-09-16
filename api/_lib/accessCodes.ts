import {supabaseConfigured,supabaseRequest} from './supabase';
export type AccessLevel='nguli'|'mandor'|'supervisor';
const seed=new Map<string,AccessLevel>([['NGULI-MLS','nguli'],['MLS2026','nguli'],['MLS-NGU-9921','nguli'],['MANDOR-MLS','mandor'],['SPV-MLS','supervisor']]);
const memory=new Map<string,{level:AccessLevel;used:boolean;used_by:string}>();
for(const [code,level] of seed)memory.set(code,{level,used:false,used_by:''});
export async function getAccessCode(code:string){const c=String(code||'').trim().toUpperCase();if(!c)return null;if(supabaseConfigured()){try{const rows=await supabaseRequest<any[]>(`access_codes?code=eq.${encodeURIComponent(c)}&select=*`);if(rows[0])return {code:c,level:rows[0].level as AccessLevel,used:Boolean(rows[0].used),used_by:String(rows[0].used_by||'')};}catch(e){console.error('ACCESS_CODE_LOOKUP_ERROR',e)}}const x=memory.get(c);return x?{code:c,...x}:null}
export async function markAccessCodeUsed(code:string,studentId:string){const c=String(code||'').trim().toUpperCase();const current=await getAccessCode(c);if(!current)throw Error('Kode akses tidak ditemukan.');if(current.used)throw Error('Kode akses ini sudah pernah dipakai.');memory.set(c,{level:current.level,used:true,used_by:studentId});if(supabaseConfigured())await supabaseRequest(`access_codes?code=eq.${encodeURIComponent(c)}`,{method:'PATCH',body:JSON.stringify({used:true,used_by:studentId,used_at:new Date().toISOString()})});return true}
export async function codeLevel(code:string){return (await getAccessCode(code))?.level||null}
