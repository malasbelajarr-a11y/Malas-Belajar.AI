import crypto from "node:crypto";

export type MentorQuestion = {
  id:string; chapter:string; chapter_label:string; number:number; difficulty:string; topic:string; prompt:string; answer:string;
  steps:string[]; is_final:boolean; options:string[]; correct_option:number|null; irt_difficulty:number; irt_discrimination:number;
  level:string; trap_tip:string; video_url:string; file_url:string;
};
export type MentorTryout = {id:string;title:string;description:string;duration_minutes:number;question_count:number;status:string;max_score:number;level:string;questions:MentorQuestion[]};
export const SUBTESTS = [
 ["pu","Penalaran Umum",30],["ppu","Pengetahuan & Pemahaman Umum",20],["pbm","Pemahaman Bacaan & Menulis",20],["pk","Pengetahuan Kuantitatif",20],
 ["lit_indo","Literasi Bahasa Indonesia",30],["lit_inggris","Literasi Bahasa Inggris",20],["pm","Penalaran Matematika",20],
] as const;
export const mentorQuestions:MentorQuestion[]=[];
export const mentorTryouts:MentorTryout[]=[];
const MENTOR_CODE_HASH="d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
const LEGACY=new Set(["MENTOR-MLS","RODI2026","MALASBELAJAR","MLS2026","123456","ADMIN","MENTOR"]);
export function validMentorCode(v:unknown){const c=String(v||"").trim().toUpperCase();return LEGACY.has(c)||crypto.createHash("sha256").update(c).digest("hex")===MENTOR_CODE_HASH;}
export function createQuestion(body:any):MentorQuestion{
 const chapter=String(body.subtest||"pu"),meta=SUBTESTS.find(x=>x[0]===chapter);if(!meta)throw new Error("Subtes tidak valid.");
 const options=Array.isArray(body.options)?body.options.map(String).filter(Boolean).slice(0,5):[];if(options.length<4)throw new Error("Minimal 4 opsi wajib diisi.");
 const correct=Math.max(0,Math.min(options.length-1,Number(body.correct_option)||0));
 return {id:`mentor-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,chapter,chapter_label:meta[1],number:mentorQuestions.filter(q=>q.chapter===chapter).length+1,difficulty:String(body.difficulty||"Sedang"),topic:String(body.topic||"Soal Mentor"),prompt:String(body.prompt||"").trim(),answer:options[correct],steps:Array.isArray(body.steps)?body.steps.map(String).filter(Boolean):[],is_final:false,options,correct_option:correct,irt_difficulty:Number(body.irt_difficulty)||0,irt_discrimination:Number(body.irt_discrimination)||1.2,level:String(body.level||"nguli"),trap_tip:String(body.trap_tip||""),video_url:String(body.video_url||""),file_url:String(body.file_url||"")};
}
export function createTryout(body:any):MentorTryout{
 const level=String(body.level||"nguli");
 const missing=SUBTESTS.map(([id,label,count])=>({id,label,count,have:mentorQuestions.filter(q=>(q.chapter===id)&&(q.level===level||q.level==="all")).length})).filter(x=>x.have<x.count);
 if(missing.length)throw new Error(`Bank soal belum lengkap: ${missing.map(x=>`${x.label} ${x.have}/${x.count}`).join(", ")}`);
 const questions=SUBTESTS.flatMap(([id,,count])=>mentorQuestions.filter(q=>q.chapter===id&&(q.level===level||q.level==="all")).slice(0,count));
 const t:MentorTryout={id:`mentor-to-${Date.now()}`,title:String(body.title||"UTBK Tryout Mentor"),description:String(body.description||"Tryout 7 subtes buatan mentor."),duration_minutes:195,question_count:160,status:"active",max_score:1000,level,questions};mentorTryouts.unshift(t);return t;
}