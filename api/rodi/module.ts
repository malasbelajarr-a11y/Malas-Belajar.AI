import app from "../../server";
import { loadMentorQuestions, mentorQuestions } from "../_lib/mentorBank";

export default async function handler(req:any,res:any){
  if(req.method!=="GET")return res.status(405).json({detail:"Method tidak didukung."});
  await loadMentorQuestions();
  const originalJson=res.json.bind(res);
  res.json=(data:any)=>{
    if(data&&Array.isArray(data.questions)){
      data.questions=[...mentorQuestions,...data.questions];
      data.total_questions=data.questions.length;
    }
    return originalJson(data);
  };
  return app(req,res);
}
