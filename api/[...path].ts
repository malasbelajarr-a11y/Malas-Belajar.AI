import crypto from "node:crypto";
import { accessCodeAlreadyUsed, findStudent, listStudents, markAccessCodeUsed, passwordMatches, publicStudent, saveStudent, setStudentActive } from "./_lib/studentStore";
import { supabaseConfigured, supabaseRequest } from "./_lib/supabase";

type Level = "nguli" | "mandor" | "supervisor";
interface MentorQuestion { id:string; chapter:string; chapter_label:string; number:number; difficulty:string; topic:string; prompt:string; answer:string; steps:string[]; is_final:boolean; options:string[]; correct_option:number|null; irt_difficulty:number; irt_discrimination:number; level:string; trap_tip:string; video_url:string; file_url:string; }
interface MentorTryout { id:string; title:string; description:string; duration_minutes:number; question_count:number; status:string; max_score:number; level:string; questions:MentorQuestion[]; }
const generatedCodes = new Map<string,{level:Level;used:boolean;used_by:string}>();
const seedCodes:Array<[string,Level]> = [["NGULI-MLS","nguli"],["MLS2026","nguli"],["MLS-NGU-9921","nguli"],["MANDOR-MLS","mandor"],["SPV-MLS","supervisor"]];
for (const [code,level] of seedCodes) generatedCodes.set(code,{level,used:false,used_by:""});
const MENTOR_CODE_HASH="d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
const LEGACY_MENTOR_CODES=new Set(["MENTOR-MLS","RODI2026","MALASBELAJAR","MLS2026","123456","ADMIN","MENTOR"]);
function validMentorCode(value:unknown){const code=String(value||"").trim().toUpperCase();return LEGACY_MENTOR_CODES.has(code)||crypto.createHash("sha256").update(code).digest("hex")===MENTOR_CODE_HASH;}
function bodyOf(req:any){if(!req.body)return {};if(typeof req.body==="string"){try{return JSON.parse(req.body)}catch{return {}}}return req.body;}
function normalizePath(req:any){const raw=String(req.url||"/").split("?")[0];if(raw==="/api"||raw.startsWith("/api/"))return raw.replace(/\/+$/,"" )||"/api";return `/api${raw.startsWith("/")?raw:`/${raw}`}`.replace(/\/+$/,"" )||"/api";}
async function saveMentorResource(data:any){if(!supabaseConfigured())throw new Error("Penyimpanan Supabase belum aktif.");await supabaseRequest("wacawaci_resources",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(data)});}
async function levelFromCode(code:string):Promise<Level|null>{const n=String(code||"").trim().toUpperCase();if(supabaseConfigured()){const rows=await supabaseRequest<any[]>(`access_codes?code=eq.${encodeURIComponent(n)}&select=level,used&limit=1`);const row=rows?.[0];const level=String(row?.level||"").toLowerCase();if(row&&!Boolean(row.used)&&(level==="nguli"||level==="mandor"||level==="supervisor"))return level;return null;}const saved=generatedCodes.get(n);if(saved&&!saved.used)return saved.level;if(/^MLS-NGU-\d{4}$/.test(n))return"nguli";if(/^MLS-MAN-\d{4}$/.test(n))return"mandor";if(/^MLS-SPV-\d{4}$/.test(n))return"supervisor";return null;}
function setCookie(res:any,student:any){const token=encodeURIComponent(JSON.stringify(publicStudent(student)));res.setHeader("Set-Cookie",`mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);}
function readSession(req:any){const raw=String(req.headers?.cookie||""),m=raw.match(/(?:^|;\s*)mls_session=([^;]+)/);if(!m)return null;try{return JSON.parse(decodeURIComponent(m[1]))}catch{return null}}
const subtestMeta=[
 ["pu","Penalaran Umum",30], ["ppu","Pengetahuan & Pemahaman Umum",20], ["pbm","Pemahaman Bacaan & Menulis",20], ["pk","Pengetahuan Kuantitatif",20], ["lit_indo","Literasi Bahasa Indonesia",30], ["lit_inggris","Literasi Bahasa Inggris",20], ["pm","Penalaran Matematika",20],
] as const;
const mentorQuestions:MentorQuestion[]=[];
const mentorTryouts:MentorTryout[]=[];
function buildMentorTryout(body:any){
 const level=String(body.level||"nguli"); const picked=mentorQuestions.filter(q=>q.level===level||q.level==="all");
 const questions=subtestMeta.flatMap(([id,label,count])=>picked.filter(q=>q.chapter===id).slice(0,count));
 const ordered=questions.length?questions:mentorQuestions.slice(0,160);
 return {id:`mentor-to-${Date.now()}`,title:String(body.title||"UTBK Tryout Mentor"),description:String(body.description||"Tryout 7 subtes buatan mentor."),duration_minutes:195,question_count:ordered.length,status:"active",max_score:1000,level,questions:ordered};
}
async function auth(req:any,res:any,path:string){
 const body=bodyOf(req),order:Level[]=["nguli","mandor","supervisor"];
 if(path==="/api/auth/me"&&req.method==="GET"){const s=readSession(req);if(!s?.id)return res.status(200).json(null);const st=(await listStudents()).find(x=>x.id===String(s.id));return res.status(200).json(st?publicStudent(st):null)}
 if(path==="/api/auth/logout"&&req.method==="POST"){res.setHeader("Set-Cookie","mls_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");return res.status(200).json({ok:true})}
 if(path==="/api/auth/register"&&req.method==="POST"){
  const session=readSession(req),sessionStudent=session?.id?(await listStudents()).find(s=>s.id===String(session.id)):null;
  const requestedLevel=String(body.level||"").trim().toLowerCase() as Level,code=String(body.access_code||body.accessCode||body.code||"").trim().toUpperCase();
  if(sessionStudent&&order.includes(requestedLevel)&&code&&order.indexOf(requestedLevel)>order.indexOf(sessionStudent.level)){if(await levelFromCode(code)!==requestedLevel)return res.status(400).json({detail:"Kode akses tidak sesuai dengan level tujuan."});const updated=await markAccessCodeUsed(sessionStudent,code,requestedLevel);setCookie(res,updated);return res.status(200).json(publicStudent(updated))}
  const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  if(!name||!email||!password||!code)return res.status(400).json({detail:"Nama, email, password, dan kode akses wajib diisi."});
  if(password.length<6)return res.status(400).json({detail:"Password minimal 6 karakter."});
  const level=await levelFromCode(code);if(!level)return res.status(400).json({detail:"Kode akses tidak valid."});
  if(await accessCodeAlreadyUsed(code))return res.status(409).json({detail:"Kode akses ini sudah pernah dipakai."});
  if(await findStudent(email))return res.status(409).json({detail:"Email sudah terdaftar. Silakan login dengan password yang dibuat sebelumnya."});
  const student=await saveStudent({name,email,level,password,accessCode:code});setCookie(res,student);return res.status(201).json(publicStudent(student));
 }
 if(path==="/api/auth/login"&&req.method==="POST"){const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");if(!email||!password)return res.status(400).json({detail:"Email dan password wajib diisi."});const student=await findStudent(email);if(!student)return res.status(401).json({detail:"Email belum terdaftar."});if(!student.active)return res.status(403).json({detail:"Akun kamu sedang dinonaktifkan."});if(!passwordMatches(student,password))return res.status(401).json({detail:"Password salah."});setCookie(res,student);return res.status(200).json(publicStudent(student))}
 return null;
}
async function admin(req:any,res:any,path:string){const body=bodyOf(req);if(path==="/api/admin/students"&&req.method==="GET"){if(!validMentorCode(req.query?.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});return res.status(200).json((await listStudents()).map(publicStudent))}
 if((path==="/api/admin/students"||path.startsWith("/api/admin/students/"))&&(req.method==="PATCH"||req.method==="PUT")){if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});const idFromPath=path.startsWith("/api/admin/students/")?decodeURIComponent(path.slice("/api/admin/students/".length)):"",id=String(body.id||req.query?.id||idFromPath||""),student=(await listStudents()).find(s=>s.id===id);if(!student)return res.status(404).json({detail:"Siswa tidak ditemukan."});return res.status(200).json(publicStudent(await setStudentActive(student,Boolean(body.active))))}
 if(path==="/api/admin/access-codes"){if(!validMentorCode(body.mentor_code||req.query?.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});if(req.method==="GET"){return res.status(200).json(supabaseConfigured()?await supabaseRequest<any[]>("access_codes?select=id,code,level,used,used_by,created_at&order=created_at.desc"):Array.from(generatedCodes.entries()).map(([code,v])=>({id:code,code,level:v.level,used:v.used,used_by:v.used_by})));}if(req.method!=="POST")return res.status(405).json({detail:"Method tidak diizinkan."});const level=String(body.level||"nguli").toLowerCase() as Level,count=Math.max(1,Math.min(50,Number(body.count)||3));if(!["nguli","mandor","supervisor"].includes(level))return res.status(400).json({detail:"Level tidak valid."});const prefix=level==="nguli"?"NGU":level==="mandor"?"MAN":"SPV",out:any[]=[];for(let i=0;i<count;i++){let code="";do{code=`MLS-${prefix}-${crypto.randomInt(1000,10000)}`}while(generatedCodes.has(code));generatedCodes.set(code,{level,used:false,used_by:""});out.push({id:crypto.randomUUID(),code,level,used:false,used_by:null});}if(supabaseConfigured())await supabaseRequest("access_codes",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(out)});return res.status(200).json(out)}
 if(path==="/api/admin/mentor-bank"&&req.method==="GET"){if(!validMentorCode(req.query?.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});let questions=mentorQuestions,tryouts=mentorTryouts;if(supabaseConfigured()){const qr=await supabaseRequest<any[]>("wacawaci_resources?kind=eq.mentor_question&select=*&order=created_at.desc");const tr=await supabaseRequest<any[]>("wacawaci_resources?kind=eq.mentor_tryout&select=*&order=created_at.desc");const decode=(rows:any[])=>rows.map(r=>{try{return JSON.parse(String(r.description||"{}"))}catch{return null}}).filter(Boolean);questions=decode(qr);tryouts=decode(tr);}return res.status(200).json({subtests:subtestMeta.map(([id,label,count])=>({id,label,question_count:count,added:questions.filter((q:any)=>q.chapter===id).length})),questions,tryouts})}
 if(path==="/api/admin/mentor-bank/questions"&&req.method==="POST"){if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});const chapter=String(body.subtest||"pu"),meta=subtestMeta.find(x=>x[0]===chapter);if(!meta)return res.status(400).json({detail:"Subtes tidak valid."});const options=Array.isArray(body.options)?body.options.map(String).filter(Boolean).slice(0,5):[];if(options.length<4||!String(body.prompt||"").trim())return res.status(400).json({detail:"Soal dan minimal 4 opsi wajib diisi."});const correct=Math.max(0,Math.min(options.length-1,Number(body.correct_option)||0));const subbab=String(body.subbab||body.topic||"").trim();const q:any={id:`mentor-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,chapter,chapter_label:meta[1],number:mentorQuestions.filter(x=>x.chapter===chapter).length+1,difficulty:String(body.difficulty||"Sedang"),topic:subbab||"Soal Mentor",subbab,material:String(body.material||"").trim(),prompt:String(body.prompt).trim(),answer:options[correct],steps:Array.isArray(body.steps)?body.steps.map(String).filter(Boolean):["Baca stimulus.","Bandingkan semua opsi.","Pilih jawaban yang paling sesuai dengan premis soal."],is_final:false,options,correct_option:correct,irt_difficulty:Number(body.irt_difficulty)||0,irt_discrimination:Number(body.irt_discrimination)||1.2,level:String(body.level||"nguli"),trap_tip:String(body.trap_tip||""),video_url:String(body.video_url||""),file_url:String(body.file_url||"")};mentorQuestions.unshift(q);if(supabaseConfigured())await saveMentorResource({id:q.id,kind:"mentor_question",title:`${q.chapter_label} #${q.number}`,description:JSON.stringify(q),url:q.file_url||q.video_url||"",is_public:true,created_by:"mentor",level:q.level});return res.status(201).json(q)}
 if(path==="/api/admin/mentor-bank/tryouts"&&req.method==="POST"){if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});const t=buildMentorTryout(body);mentorTryouts.unshift(t);if(supabaseConfigured())await saveMentorResource({id:t.id,kind:"mentor_tryout",title:t.title,description:JSON.stringify(t),url:"",is_public:true,created_by:"mentor",level:t.level});return res.status(201).json(t)}
 return null;
}
async function persistentContent(req:any,res:any,path:string){
 const body=bodyOf(req);
 const wacaKinds="video,module,pdf,ringkasan,cheatsheet,rodi_material";
 const decodeWaca=(row:any)=>{
  let description=String(row?.description||""),subtest="";
  try{const meta=JSON.parse(description);if(meta&&typeof meta==="object"&&meta.__mls_wacawaci){description=String(meta.description||"");subtest=String(meta.subtest||"");}}catch{}
  let subbab="";\n  try{const meta=JSON.parse(String(row?.description||""));if(meta&&typeof meta==="object"&&meta.__mls_wacawaci){subbab=String(meta.subbab||"");}}catch{}\n  return {id:String(row.id),kind:String(row.kind||"module"),title:String(row.title||""),description,url:String(row.url||""),is_public:Boolean(row.is_public),created_by:String(row.created_by||""),level:String(row.level||"nguli"),subtest,subbab};
 };
 const decodeLive=(row:any)=>{
  let meta:any={};try{meta=JSON.parse(String(row?.description||"{}"));}catch{}
  return {id:String(row.id),title:String(row.title||meta.title||""),description:String(meta.description||row.description||""),youtube_url:String(meta.youtube_url||row.url||""),starts_at:String(meta.starts_at||row.created_at||new Date().toISOString()),recording_url:String(meta.recording_url||meta.youtube_url||row.url||""),level:String(row.level||meta.level||"nguli"),status:String(meta.status||"scheduled")};
 };
 if(path==="/api/wacawaci/resources"){
  if(req.method==="GET"){if(!supabaseConfigured())return null;const rows=await supabaseRequest<any[]>("wacawaci_resources?kind=in.("+wacaKinds+")&select=*&order=created_at.desc");return res.status(200).json(rows.map(decodeWaca));}
  if(req.method==="DELETE"){if(!validMentorCode(req.query?.mentor_code||body.mentor_code))return res.status(401).json({detail:"Kode mentor tidak cocok."});if(!supabaseConfigured())return res.status(500).json({detail:"Penyimpanan Supabase belum aktif."});const id=String(req.query?.id||body.id||"").trim();await supabaseRequest("wacawaci_resources?id=eq."+encodeURIComponent(id),{method:"DELETE"});return res.status(200).json({ok:true,id});}
  if(req.method==="POST"){
   if(!validMentorCode(body.mentor_code))return res.status(401).json({detail:"Kode mentor tidak cocok."});if(!supabaseConfigured())return res.status(500).json({detail:"Penyimpanan Supabase belum aktif."});
   const allowed=["video","module","pdf","ringkasan","cheatsheet","rodi_material"],kind=allowed.includes(String(body.kind))?String(body.kind):"module",title=String(body.title||"").trim(),url=String(body.url||"").trim();
   if(!title)return res.status(400).json({detail:"Judul materi wajib diisi."});if(!url && kind!=="rodi_material")return res.status(400).json({detail:"Masukkan link atau file materi."});
   const resource={id:"res-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex"),kind,title,description:String(body.description||"").trim(),url,is_public:true,created_by:"Mentor Malas Belajar",level:["nguli","mandor","supervisor"].includes(String(body.level))?String(body.level):"nguli",subtest:String(body.subtest||"pu"),subbab:String(body.subbab||"")};
   await supabaseRequest("wacawaci_resources",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:resource.id,kind:resource.kind,title:resource.title,description:JSON.stringify({__mls_wacawaci:true,description:resource.description,subtest:resource.subtest,subbab:resource.subbab}),url:resource.url,is_public:true,created_by:resource.created_by,level:resource.level})});
   return res.status(201).json(resource);
  }
  return res.status(405).json({detail:"Method not allowed"});
 }
 if(path==="/api/wacawaci/upload"&&req.method==="POST"){
  if(!validMentorCode(req.query?.mentor_code||body.mentor_code))return res.status(401).json({detail:"Kode mentor tidak cocok."});if(!supabaseConfigured())return res.status(500).json({detail:"Penyimpanan Supabase belum aktif."});
  const title=String(body.title||req.query?.title||"Dokumen Unggahan").trim(),url=String(body.url||req.query?.url||"").trim();if(!url)return res.status(400).json({detail:"URL/file materi wajib diisi."});
  const resource={id:"res-upload-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex"),kind:String(body.kind||req.query?.kind||"module"),title,description:String(body.description||req.query?.description||""),url,is_public:true,created_by:"Mentor Malas Belajar",level:String(body.level||req.query?.level||"nguli"),subtest:String(body.subtest||"pu")};
  await supabaseRequest("wacawaci_resources",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:resource.id,kind:resource.kind,title:resource.title,description:JSON.stringify({__mls_wacawaci:true,description:resource.description,subtest:resource.subtest}),url:resource.url,is_public:true,created_by:resource.created_by,level:resource.level})});return res.status(201).json(resource);
 }
 if(path==="/api/live-classes"){
  if(req.method==="GET"){if(!supabaseConfigured())return null;const rows=await supabaseRequest<any[]>("wacawaci_resources?kind=eq.live_class&select=*&order=created_at.desc");return res.status(200).json(rows.map(decodeLive));}
  if(req.method==="DELETE"){if(!validMentorCode(req.query?.mentor_code||body.mentor_code))return res.status(401).json({detail:"Kode mentor tidak cocok."});if(!supabaseConfigured())return res.status(500).json({detail:"Penyimpanan Supabase belum aktif."});const id=String(req.query?.id||body.id||"").trim();await supabaseRequest("wacawaci_resources?id=eq."+encodeURIComponent(id)+"&kind=eq.live_class",{method:"DELETE"});return res.status(200).json({ok:true,id});}
  if(req.method==="POST"){
   if(!validMentorCode(body.mentor_code))return res.status(401).json({detail:"Kode mentor tidak cocok."});if(!supabaseConfigured())return res.status(500).json({detail:"Penyimpanan Supabase belum aktif."});
   const title=String(body.title||"").trim(),youtube_url=String(body.youtube_url||"").trim(),starts_at=String(body.starts_at||"").trim();if(!title||!youtube_url||!starts_at)return res.status(400).json({detail:"Judul, URL YouTube, dan waktu Live Class wajib diisi."});
   const live={id:"live-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex"),title,description:String(body.description||"").trim()||"Live Class bersama mentor Malas Belajar.",youtube_url,starts_at,recording_url:String(body.recording_url||youtube_url),level:["nguli","mandor","supervisor"].includes(String(body.level))?String(body.level):"nguli",status:"scheduled"};
   await supabaseRequest("wacawaci_resources",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:live.id,kind:"live_class",title:live.title,description:JSON.stringify({description:live.description,youtube_url:live.youtube_url,starts_at:live.starts_at,recording_url:live.recording_url,status:live.status}),url:live.youtube_url,is_public:true,created_by:"Mentor Malas Belajar",level:live.level})});return res.status(201).json(live);
  }
  return res.status(405).json({detail:"Method not allowed"});
 }
 return null;
}
async function content(req:any,res:any,path:string){
 if(path==="/api/rodi/module"&&req.method==="GET"){
  const {default:app}=await import("../server");
  const original:any = await new Promise((resolve,reject)=>{
    const originalJson=res.json.bind(res);
    res.json=(value:any)=>{res.json=originalJson;resolve(value);return res};
    Promise.resolve(app(req,res)).catch(reject);
  });
  if(res.headersSent)return res;
  if(!supabaseConfigured())return res.status(200).json(original);
  try{
   const session=readSession(req);
   const student=session?.id?(await listStudents()).find(s=>s.id===String(session.id)):null;
   const level=String(student?.level||"nguli");
   const rows=await supabaseRequest<any[]>("wacawaci_resources?kind=eq.mentor_question&select=*&order=created_at.desc");
   const mentor=rows.map((r:any)=>{try{return JSON.parse(String(r.description||"{}"))}catch{return null}})
    .filter((q:any)=>q&&(!q.level||q.level==="all"||q.level===level));
   const base=original&&Array.isArray(original.questions)?original.questions:[];
   const merged=[...mentor,...base];
   return res.status(200).json({...original,total_questions:merged.length,questions:merged});
  }catch(error){
   console.error("RODI_MENTOR_BANK_ERROR",error);
   return res.status(200).json(original);
  }
 }
 if(path==="/api/rodi/questions"&&req.method==="GET"){
  let rows:any[]=mentorQuestions;
  if(supabaseConfigured()){
   const stored=await supabaseRequest<any[]>("wacawaci_resources?kind=eq.mentor_question&select=*&order=created_at.desc");
   rows=stored.map((r:any)=>{try{return JSON.parse(String(r.description||"{}"))}catch{return null}}).filter(Boolean);
  }
  const session=readSession(req);
  const student=session?.id?(await listStudents()).find(s=>s.id===String(session.id)):null;
  const level=String(student?.level||"");
  if(level)rows=rows.filter((q:any)=>!q.level||q.level==="all"||q.level===level);
  return res.status(200).json(rows);
}
if(path==="/api/utbaby/sessions"&&req.method==="POST")return res.status(201).json(buildMentorTryout(bodyOf(req)));
 if(path==="/api/utbaby/sessions"&&req.method==="GET")return res.status(200).json(mentorTryouts.map(({questions,...x})=>x));
 if(path.startsWith("/api/utbaby/sessions/")&&req.method==="GET"){const id=path.split("/").pop();const t=mentorTryouts.find(x=>x.id===id)||mentorTryouts[0];if(!t)return res.status(404).json({detail:"Belum ada tryout mentor."});return res.status(200).json(t)}
 return null;
}
export default async function handler(req:any,res:any){const path=normalizePath(req);const raw=String(req.url||"");req.url=path+(raw.includes("?")?`?${raw.split("?")[1]}`:"");try{if(path.startsWith("/api/auth/")){const r=await auth(req,res,path);if(r!==null)return r}if(path.startsWith("/api/admin/")){const r=await admin(req,res,path);if(r!==null)return r}if(path.startsWith("/api/wacawaci/")||path==="/api/wacawaci/resources"||path==="/api/live-classes"){const r=await persistentContent(req,res,path);if(r!==null)return r}if(path.startsWith("/api/utbaby/")||path==="/api/utbaby/sessions"){const r=await content(req,res,path);if(r!==null)return r}const {default:app}=await import("../server");return app(req,res)}catch(error){console.error("API_HANDLER_ERROR",error);if(!res.headersSent)return res.status(500).json({detail:error instanceof Error?error.message:"Server gagal memproses permintaan."})}}