export default function handler(req:any,res:any){
  if(req.method!=="GET")return res.status(405).json({detail:"Method not allowed"});
  const raw=String(req.headers?.cookie||"");
  const match=raw.match(/(?:^|;\s*)mls_session=([^;]+)/);
  if(!match)return res.status(200).json(null);
  try{return res.status(200).json(JSON.parse(decodeURIComponent(match[1])))}catch{return res.status(200).json(null)}
}