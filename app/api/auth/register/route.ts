export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, password, code } = body

  const KODE_MEMBER = ["KODE1", "KODE2"]
  const KODE_MENTOR = "CEKEKOKOMLS" // <-- PAKAI YG INI YA

  if (!KODE_MEMBER.includes(code) && code !== KODE_MENTOR) {
    return Response.json({ error: "Kode salah" }, { status: 400 })
  }

  if (code === KODE_MENTOR) {
    return Response.json({ message: "Daftar berhasil! Kamu MENTOR" }, { status: 200 })
  } else {
    return Response.json({ message: "Daftar berhasil! Kamu MEMBER" }, { status: 200 })
  }
}
