import { mentorQuestions, mentorTryouts, SUBTESTS, validMentorCode } from "../_lib/mentorBank";
export default function handler(req:any,res:any){
 const code=req.query?.mentor_code;
 if(!validMentorCode(code))return res.status(403).json({detail:"Kode mentor tidak valid."});
 if(req.method!=="GET")return res.status(405).json({detail:"Method tidak didukung."});
 return res.status(200).json({subtests:SUBTESTS.map(([id,label,question_count])=>({id,label,question_count,added:mentorQuestions.filter(q=>q.chapter===id).length})),questions:mentorQuestions,tryouts:mentorTryouts});
}