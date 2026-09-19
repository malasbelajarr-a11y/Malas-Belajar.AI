import crypto from "node:crypto";
import { accessCodeAlreadyUsed, findStudent, listStudents, markAccessCodeUsed, passwordMatches, publicStudent, saveStudent } from "./studentStore";
import { supabaseConfigured, supabaseRequest } from "./supabase";

type Level = "nguli" | "mandor" | "supervisor";
const generatedCodes = new Map<string,{level:Level;used:boolean;used_by:string}>();

function bodyOf(req:any){if(!req.body)return {};if(typeof req.body==="string"){try{return JSON.parse(req.body)}catch{return {}}}return req.body;}
function setCookie(res:any,student:any){const token=encodeURIComponent(JSON.stringify(publicStudent(student)));res.setHeader("Set-Cookie",`mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);}
function readSession(req:any){const raw=String(req.headers?.cookie||""),m=raw.match(/(?:^|;\s*)mls_session=([^;]+)/);if(!m)return null;try{return JSON.parse(decodeURIComponent(m[1]))}catch{return null}}

async function levelFromCode(code:string):Promise<Level|null>{
 const n=String(code||"").trim().toUpperCase();
 if(supabaseConfigured()){
  const rows=await supabaseRequest<any[]>(`access_codes?code=eq.${encodeURIComponent(n)}&select=level,used&limit=1`);
  const row=rows?.[0],level=String(row?.level||"").toLowerCase();
  if(row&&!Boolean(row.used)&&(level==="nguli"||level==="mandor"||level==="supervisor"))return level;
  return null;
 }
 const saved=generatedCodes.get(n);
 if(saved&&!saved.used)return saved.level;
 if(/^MLS-NGU-\d{4}$/.test(n))return"nguli";
 if(/^MLS-MAN-\d{4}$/.test(n))return"mandor";
 if(/^MLS-SPV-\d{4}$/.test(n))return"supervisor";
 return null;
}

export default async function auth(req:any,res:any,path:string){
 const body=bodyOf(req),order:Level[]=["nguli","mandor","supervisor"];
 if(path==="/api/auth/me"&&req.method==="GET"){
  const s=readSession(req);if(!s?.id)return res.status(200).json(null);
  const st=(await listStudents()).find(x=>x.id===String(s.id));return res.status(200).json(st?publicStudent(st):null);
 }
 if(path==="/api/auth/logout"&&req.method==="POST"){res.setHeader("Set-Cookie","mls_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");return res.status(200).json({ok:true});}
 if(path==="/api/auth/register"&&req.method==="POST"){
  const session=readSession(req),sessionStudent=session?.id?(await listStudents()).find(s=>s.id===String(session.id)):null;
  const requestedLevel=String(body.level||"").trim().toLowerCase() as Level,requestedCode=String(body.access_code||body.accessCode||body.code||"").trim().toUpperCase();
  if(sessionStudent&&order.includes(requestedLevel)&&requestedCode&&order.indexOf(requestedLevel)>order.indexOf(sessionStudent.level)){
   if(await levelFromCode(requestedCode)!==requestedLevel)return res.status(400).json({detail:"Kode akses tidak sesuai dengan level tujuan."});
   if(await accessCodeAlreadyUsed(requestedCode)||generatedCodes.get(requestedCode)?.used)return res.status(409).json({detail:"Kode akses ini sudah pernah dipakai."});
   const updated=await markAccessCodeUsed(sessionStudent,requestedCode,requestedLevel);setCookie(res,updated);return res.status(200).json(publicStudent(updated));
  }
  const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  if(!name||!email||!password||!requestedCode)return res.status(400).json({detail:"Nama, email, password, dan kode akses wajib diisi."});
  if(password.length<6)return res.status(400).json({detail:"Password minimal 6 karakter."});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({detail:"Format email tidak valid."});
  const level=await levelFromCode(requestedCode);if(!level)return res.status(400).json({detail:"Kode akses tidak valid."});
  if(await accessCodeAlreadyUsed(requestedCode)||generatedCodes.get(requestedCode)?.used)return res.status(409).json({detail:"Kode akses ini sudah pernah dipakai."});
  if(await findStudent(email))return res.status(409).json({detail:"Email sudah terdaftar. Silakan login dengan password yang dibuat sebelumnya."});
  const student=await saveStudent({name,email,level,password,accessCode:requestedCode});setCookie(res,student);return res.status(201).json(publicStudent(student));
 }
 if(path==="/api/auth/login"&&req.method==="POST"){
  const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  if(!email||!password)return res.status(400).json({detail:"Email dan password wajib diisi."});
  const student=await findStudent(email);if(!student)return res.status(401).json({detail:"Email belum terdaftar. Silakan daftar terlebih dahulu."});
  if(!student.active)return res.status(403).json({detail:"Akun kamu sedang dinonaktifkan."});
  if(!passwordMatches(student,password))return res.status(401).json({detail:"Password salah."});
  setCookie(res,student);return res.status(200).json(publicStudent(student));
 }
 if(path==="/api/auth/demo"&&req.method==="POST"){
  const requested=String(body.level||"nguli").trim().toLowerCase() as Level;if(!order.includes(requested))return res.status(400).json({detail:"Level demo tidak valid."});
  const students=await listStudents(),demo=students.find(s=>s.id===(requested==="nguli"?"usr-demo-1":requested==="mandor"?"usr-mandor-1":"usr-spv-1"));
  if(!demo)return res.status(404).json({detail:"Akun demo tidak tersedia."});setCookie(res,demo);return res.status(200).json(publicStudent(demo));
 }
 if(path==="/api/auth/level"&&(req.method==="PATCH"||req.method==="POST")){
  const session=readSession(req),email=String(body.email||session?.email||"").trim().toLowerCase(),target=String(body.level||"").trim().toLowerCase() as Level,code=String(body.access_code||body.code||"").trim().toUpperCase();
  if(!email||!order.includes(target)||!code)return res.status(400).json({detail:"Untuk naik level, kode akses level tujuan wajib diisi."});
  const student=await findStudent(email);if(!student)return res.status(404).json({detail:"Akun siswa tidak ditemukan."});
  if(order.indexOf(target)<=order.indexOf(student.level))return res.status(400).json({detail:"Level tujuan harus lebih tinggi dari level sekarang."});
  if(await levelFromCode(code)!==target)return res.status(400).json({detail:"Kode akses tidak sesuai dengan level tujuan."});
  if(await accessCodeAlreadyUsed(code)||generatedCodes.get(code)?.used)return res.status(409).json({detail:"Kode akses ini sudah pernah dipakai."});
  const updated=await markAccessCodeUsed(student,code,target);setCookie(res,updated);return res.status(200).json(publicStudent(updated));
 }
 return null;
}
