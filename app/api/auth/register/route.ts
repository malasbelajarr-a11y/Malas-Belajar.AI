export async function POST(req: Request) {
  const {name, email, password, code} = await req.json()

  const VALID_CODES = {
    "CEKOKOMLS": "MENTOR",
    "KODE1": "LEVEL1",
    "KODE2": "LEVEL2",
    "KODE3": "LEVEL3"
  }

  if(!VALID_CODES[code]) {
    return new Response("Kode salah", {status: 400})
  }

  // disini nanti simpen ke database
  return new Response("OK", {status: 200})
}
