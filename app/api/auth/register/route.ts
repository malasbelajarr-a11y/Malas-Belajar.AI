export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, password, code } = body

  // Daftar kode yg boleh
  const KODE_MEMBER = ["KODE1", "KODE2"]
  const KODE_MENTOR = "CEKEKOKOMLS"  // <-- INI KODE MENTORNYA

  // Cek kode
  if (!KODE_MEMBER.includes(code) && code !== KODE_MENTOR) {
    return Response.json({ error: "Kode salah" }, { status: 400 })
  }

  // Kalau bener
  if (code === KODE_MENTOR) {
    return Response.json({ message: "Daftar berhasil! Kamu terdaftar sebagai MENTOR" }, { status: 200 })
  } else {
    return Response.json({ message: "Daftar berhasil! Kamu terdaftar sebagai MEMBER" }, { status: 200 })
  }
}
