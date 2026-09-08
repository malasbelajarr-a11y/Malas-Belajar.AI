import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type User = { id: string; name: string; email: string; level: "nguli" | "mandor" | "supervisor"; active: boolean; session_token?: string };
const levelLabel = { nguli: "Nguli ⚒️", mandor: "Mandor ⛑️", supervisor: "Supervisor 🎖️" };
function getStoredSession() {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("mls_user_id");
  if (!id || id.startsWith("usr-demo-") || id === "usr-mandor-1" || id === "usr-spv-1") {
    localStorage.removeItem("mls_user_id"); localStorage.removeItem("mls_user"); localStorage.removeItem("mls_session_token"); return null;
  }
  return id;
}
export default function StudentAuthGateV2({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(getStoredSession);
  const [mentorMode, setMentorMode] = useState(false);
  const [mentorCode, setMentorCode] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [loading, setLoading] = useState(false); const [mentorLoading, setMentorLoading] = useState(false);
  if (session) return <>{children}</>;
  const submitStudent = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !code.trim()) return toast.error("Nama, email, dan kode akses wajib diisi.");
    setLoading(true);
    try {
      const user = await apiPost<User>("/auth/register", { name: name.trim(), email: email.trim(), access_code: code.trim().toUpperCase() });
      localStorage.setItem("mls_user_id", user.id); localStorage.setItem("mls_user", JSON.stringify(user));
      if (user.session_token) localStorage.setItem("mls_session_token", user.session_token);
      setSession(user.id); toast.success(`Berhasil masuk sebagai ${levelLabel[user.level]}.`);
    } catch (error: any) { toast.error(error?.body?.message || error?.message || "Kode akses salah. Minta kode dari mentor."); }
    finally { setLoading(false); }
  };
  const submitMentor = async (event: FormEvent) => {
    event.preventDefault();
    if (!mentorCode.trim()) return toast.error("Kode mentor wajib diisi.");
    setMentorLoading(true);
    try {
      const result = await apiPost<{ verified: boolean }>("/mentor/verify", { code: mentorCode.trim() });
      if (!result.verified) throw new Error("Kode mentor tidak cocok.");
      sessionStorage.setItem("mls_mentor_code", mentorCode.trim());
      const mentorUser = { id: "mentor-session", name: "Mentor Malas Belajar", email: "mentor@malasbelajar.id", level: "supervisor" as const, active: true };
      const token = btoa(JSON.stringify(mentorUser)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      localStorage.setItem("mls_user_id", token); localStorage.setItem("mls_session_token", token); localStorage.setItem("mls_user", JSON.stringify(mentorUser));
      setSession(token); toast.success("Kode mentor benar. Membuka panel mentor...");
    } catch (error: any) { toast.error(error?.body?.message || error?.message || "Kode mentor tidak cocok."); }
    finally { setMentorLoading(false); }
  };
  return <main className="pixel-world min-h-screen px-4 py-6 sm:px-6 sm:py-8" data-testid="auth-portal"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-14 w-20 items-center justify-center rounded-xl border-2 border-violet-950 bg-yellow-300 shadow-[2px_2px_0_#2e1065]"><span className="pixel-title text-lg text-violet-950">MLS</span></div><div><p className="pixel-title text-lg text-white">MALAS BELAJAR</p><p className="font-mono text-[10px] uppercase tracking-widest text-yellow-300">member gateway · snbt 2026</p></div></div><Button variant="secondary" onClick={() => setMentorMode(!mentorMode)} className="border-2 border-violet-950 bg-yellow-300 text-violet-950 font-bold hover:bg-yellow-400" data-testid="open-mentor-from-auth-button">🧑‍🏫 {mentorMode ? "Kembali ke Siswa" : "Masuk Mentor"}</Button></header>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><section><div className="inline-flex items-center gap-2 rounded-full border-2 border-pink-400 bg-pink-900/60 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-pink-300">⚡ Langkah 1: Pilih Level Belajarmu</div><h1 className="pixel-title mt-3 max-w-3xl text-2xl leading-tight text-white sm:text-4xl">DARI NGULI SAMPAI SIAP TEMBUS PTN IMPIAN.</h1><p className="mt-2 text-sm text-violet-200">Gunakan kode dari mentor. Level akan terbaca otomatis dari kode dan tidak perlu dipilih lagi.</p><div className="mt-5 grid gap-3">{Object.entries(levelLabel).map(([key,label]) => <div key={key} className={`pixel-card p-4 ${key === "nguli" ? "bg-yellow-300" : key === "mandor" ? "bg-pink-300" : "bg-violet-300"}`}><p className="pixel-title text-sm text-violet-950">{label}</p><p className="mt-1 text-xs font-semibold text-violet-900">Level ditentukan otomatis oleh kode akses mentor.</p></div>)}</div></section>
    <section className="pixel-card self-start border-4 border-violet-950 bg-white p-6">{mentorMode ? <><h2 className="pixel-title text-xl text-violet-950">LOGIN MENTOR</h2><p className="mt-1 text-xs text-slate-600">Masukkan kode verifikasi khusus mentor.</p><form onSubmit={submitMentor} className="mt-5 space-y-4"><div><label className="pixel-label mb-1 block">Kode Mentor</label><Input type="password" value={mentorCode} onChange={e => setMentorCode(e.target.value)} placeholder="Kode mentor" autoComplete="off" /></div><Button type="submit" disabled={mentorLoading} className="h-12 w-full border-2 border-violet-950 bg-yellow-300 font-black text-violet-950">{mentorLoading ? "MEMVERIFIKASI..." : "MASUK MENTOR"}</Button></form></> : <><div className="rounded-xl border-2 border-violet-950 bg-violet-100 p-1 text-center font-mono text-xs font-black text-violet-950">⚡ LOGIN SISWA — KODE AKSES WAJIB</div><h2 className="mt-3 pixel-title text-xl text-violet-950">DAFTAR & MASUK SISWA</h2><p className="mt-1 text-xs text-slate-600">Isi nama, email, dan kode akses dari mentor. Kode menentukan levelmu otomatis.</p><form onSubmit={submitStudent} className="mt-5 space-y-4" noValidate><div><label className="pixel-label mb-1 block">Nama Lengkap Siswa</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Rian Pratama" required /></div><div><label className="pixel-label mb-1 block">Alamat Email</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="siswa@gmail.com" required /></div><div><label className="pixel-label mb-1 block">Kode Akses Siswa *</label><Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="MLS-NGU-XXXXXX-XX" required className="font-mono uppercase" /><p className="mt-2 text-[11px] font-bold text-slate-500">Wajib. Kode salah = tidak bisa masuk.</p></div><Button type="submit" disabled={loading} className="h-12 w-full border-2 border-violet-950 bg-yellow-300 font-black text-violet-950">{loading ? "MEMERIKSA KODE..." : "MASUK KE RUANG BELAJAR"}</Button></form></>}</section></div></div></main>;
}
