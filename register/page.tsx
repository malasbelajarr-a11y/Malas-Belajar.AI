"use client"
import { useState } from "react"

export default function RegisterPage() {
  const [form, setForm] = useState({name:"", email:"", password:"", code:""})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    alert(res.ok ? "Daftar berhasil!" : "Gagal: " + data.error)
  }

  return (
    <div style={{padding:20, maxWidth:400, margin:"0 auto"}}>
      <h1>Daftar Malas-Belajar.AI</h1>
      <form onSubmit={handleSubmit} style={{display:"flex", flexDirection:"column", gap:10, marginTop:20}}>
        <input placeholder="Nama" required onChange={e=>setForm({...form, name:e.target.value})} style={{padding:8}}/>
        <input placeholder="Email" type="email" required onChange={e=>setForm({...form, email:e.target.value})} style={{padding:8}}/>
        <input placeholder="Password" type="password" required onChange={e=>setForm({...form, password:e.target.value})} style={{padding:8}}/>
        <input placeholder="Kode: KODE1 / KODE2 / CECEKOKOMLS" required onChange={e=>setForm({...form, code:e.target.value})} style={{padding:8}}/>
        <button type="submit" style={{padding:10, background:"black", color:"white"}}>Daftar</button>
      </form>
    </div>
  )
}
