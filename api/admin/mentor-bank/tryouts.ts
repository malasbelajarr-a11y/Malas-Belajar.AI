import { createTryout, validMentorCode } from "../../../_lib/mentorBank";
export default function handler(req:any,res:any){
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
 if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});
 if(req.method!=="POST")return res.status(405).json({detail:"Method tidak didukung."});
 try{return res.status(201).json(createTryout(body))}catch(e:any){return res.status(400).json({detail:e.message})}
}