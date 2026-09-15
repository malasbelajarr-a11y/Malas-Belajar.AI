import { mentorTryouts, validMentorCode, createTryout } from "../../_lib/mentorBank";
export default function handler(req:any,res:any){
 if(req.method==="GET")return res.status(200).json(mentorTryouts.map(({questions,...summary})=>summary));
 if(req.method==="POST"){
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
  if(!validMentorCode(body.mentor_code))return res.status(403).json({detail:"Kode mentor tidak valid."});
  try{return res.status(201).json(createTryout(body))}catch(e:any){return res.status(400).json({detail:e.message})}
 }
 return res.status(405).json({detail:"Method tidak didukung."});
}