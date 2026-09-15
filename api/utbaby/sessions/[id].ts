import { mentorTryouts } from "../../../_lib/mentorBank";
export default function handler(req:any,res:any){
 if(req.method!=="GET")return res.status(405).json({detail:"Method tidak didukung."});
 const id=String(req.query?.id||"");const item=mentorTryouts.find(x=>x.id===id)||mentorTryouts[0];
 if(!item)return res.status(404).json({detail:"Belum ada Tryout mentor. Mentor harus membuat Tryout setelah bank 160 soal lengkap."});
 return res.status(200).json(item);
}