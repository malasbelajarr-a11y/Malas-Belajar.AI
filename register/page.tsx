"use client"
import { useState } from "react"

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" })
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          access_code: form.code,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.detail || data.error || "Pendaftaran gagal")
        return
      }
      if (data.id) localStorage.setItem("mls_user_id", String(data.id))
      setMsg("Daftar berhasil! Mengalihkan ke Malas Belajar AI...")
      setTimeout(() => { window.location.href = "/" }, 500)
    } catch {
      setMsg("Gagal konek ke server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <h1>Daftar Malas Belajar AI</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input placeholder="Nama Lengkap" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}} />
        <input placeholder="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}} />
        <input placeholder="Password" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}} />
        <input placeholder="Kode: MLS-NGU-xxxx / MLS-MAN-xxxx / MLS-SPV-xxxx" required value={form.code} onChange={e => setForm({...form, code: e.target.value})} style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}} />
        <button type="submit" disabled={loading} style={{padding: 12, background: "black", color: "white", border: "none", borderRadius: 5, fontWeight: "bold", opacity: loading ? .6 : 1}}>
          {loading ? "MEMPROSES..." : "DAFTAR"}
        </button>
      </form>
      {msg && <p style={{marginTop: 10, fontWeight: "bold"}}>{msg}</p>}
    </div>
  )
}
