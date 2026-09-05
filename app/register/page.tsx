"use client"
import { useState } from "react"

export default function Register() {
  const [form, setForm] = useState({name:"", email:"", password:"", code:""})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form)
    })
    if(res.ok) alert("Daftar berhasil! Silakan login")
    else alert("Kode salah!")
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
      <input placeholder="Nama" onChange={e=>setForm({...form, name:e.target.value})}/>
      <input placeholder="Email" type="email" onChange={e=>setForm({...form, email:e.target.value})}/>
      <input placeholder="Password" type="password" onChange={e=>setForm({...form, password:e.target.value})}/>
      <input placeholder="Kode Level / Mentor" onChange={e=>setForm({...form, code:e.target.value})}/>
      <button type="submit">Daftar</button>
      <p className="text-sm">Kode Mentor: CECEKOKOMLS | Kode Level: KODE1, KODE2</p>
    </form>
  )
}
