import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";

export default function StudentAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = mode === "register"
        ? await apiPost<any>("/auth/register", {
            name,
            email,
            password,
            access_code: code,
          })
        : await apiPost<any>("/auth/login", {
            email,
            password,
          });

      beginSession(user.id);
      if (user.session_token) localStorage.setItem("mls_session_token", user.session_token);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.detail || err?.message || "Data belum benar atau kode akses salah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#26005b] px-4 py-8 text-violet-950">
      <div className="mx-auto max-w-xl">
        <section className="rounded-[28px] border-4 border-violet-950 bg-white p-6 shadow-[8px_10px_0_#3b1475] sm:p-8">
          <div className="mb-6 rounded-2xl border-4 border-violet-950 bg-violet-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`rounded-xl px-3 py-4 font-mono font-black ${mode === "register" ? "bg-yellow-300" : "bg-transparent"}`}>📝 BUAT AKUN<br/>(KODE)</button>
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-xl px-3 py-4 font-mono font-black ${mode === "login" ? "bg-yellow-300" : "bg-transparent"}`}>🔑 LOGIN SISWA</button>
            </div>
          </div>

          <h1 className="font-mono text-3xl font-black text-violet-950">{mode === "register" ? "AKTIFKAN AKUN" : "LOGIN SISWA"}</h1>
          <p className="mt-3 text-lg text-slate-600">
            {mode === "register"
              ? "Masukkan kode unik dari mentor. Kode otomatis menentukan levelmu."
              : "Masuk menggunakan email dan kata sandi akun yang sudah aktif."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            {mode === "register" && (
              <label className="block">
                <span className="font-mono font-black text-violet-700">NAMA LENGKAP</span>
                <input required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-slate-300 p-4" />
              </label>
            )}

            <label className="block">
              <span className="font-mono font-black text-violet-700">EMAIL</span>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-slate-300 p-4" />
            </label>

            <label className="block">
              <span className="font-mono font-black text-violet-700">KATA SANDI</span>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-slate-300 p-4" />
            </label>

            {mode === "register" && (
              <label className="block">
                <span className="font-mono font-black text-violet-700">KODE UNIK SISWA *</span>
                <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="MLS-NGU-XXXXXX-XX" className="mt-2 w-full rounded-2xl border-2 border-slate-300 p-4 font-mono uppercase" />
              </label>
            )}

            {error && <p className="rounded-xl border-2 border-red-300 bg-red-50 p-3 font-bold text-red-700">{error}</p>}

            <button disabled={loading} className="w-full rounded-2xl border-4 border-violet-950 bg-yellow-300 px-5 py-5 font-mono text-lg font-black shadow-[6px_7px_0_#3b1475]">
              {loading ? "MEMPROSES..." : mode === "register" ? "DAFTAR & MASUK" : "LOGIN & MASUK"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
