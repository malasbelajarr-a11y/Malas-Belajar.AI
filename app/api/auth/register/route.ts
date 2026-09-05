export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, password, code } = body

  const KODE_MEMBER = ["MLS-NGU-2026"]
  const KODE_MENTOR = "CEKEKOKOMLS"

  if (!KODE_MEMBER.includes(code) && code !== KODE_MENTOR) {
    return Response.json({ error: "Kode mentor tidak cocok" }, { status: 400 })
  }

  if (code === KODE_MENTOR) {
    return Response.json({ message: "Verifikasi berhasil! Selamat datang Mentor" }, { status: 200 })
  } else {
    return Response.json({ message: "Daftar berhasil! Selamat datang Member" }, { status: 200 })
  }
}
