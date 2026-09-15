import { createQuestion, mentorQuestions, validMentorCode } from "../../_lib/mentorBank";
export default function handler(req:any,res:any){
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
 if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});
 if(req.method!=="POST")return res.status(405).json({detail:"Method tidak didukung."});
 try{const q=createQuestion(body);if(!q.prompt)return res.status(400).json({detail:"Soal wajib diisi."});mentorQuestions.unshift(q);return res.status(201).json(q)}catch(e:any){return res.status(400).json({detail:e.message})}
}