"use client"
import { useState } from "react"

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" })
  const [msg, setMsg] = useState("")

  async function handleSubmit(e: any) {
    e.preventDefault()
    setMsg("Loading...")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setMsg(data.message || data.error)
    } catch (err) {
      setMsg("Gagal konek ke server")
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <h1>Daftar Malas Belajar AI</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input 
          placeholder="Nama Lengkap" 
          required
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})} 
          style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}}
        />
        <input 
          placeholder="Email" 
          type="email" 
          required
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})} 
          style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}}
        />
        <input 
          placeholder="Password" 
          type="password" 
          required
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})} 
          style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}}
        />
        <input 
          placeholder="Kode: MLS-NGU-2026 / CEKEKOKOMLS" 
          required
          value={form.code}
          onChange={e => setForm({...form, code: e.target.value})} 
          style={{padding: 10, border: "1px solid #ccc", borderRadius: 5}}
        />
        <button type="submit" style={{padding: 12, background: "black", color: "white", border: "none", borderRadius: 5, fontWeight: "bold"}}>
          DAFTAR
        </button>
      </form>
      {msg && <p style={{marginTop: 10, fontWeight: "bold"}}>{msg}</p>}
    </div>
  )
}
