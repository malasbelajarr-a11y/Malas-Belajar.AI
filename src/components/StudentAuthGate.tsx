import { FormEvent, ReactNode, useState } from "react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  level: "nguli" | "mandor" | "supervisor";
  active: boolean;
};

const levelLabel = {
  nguli: "Nguli ⚒️",
  mandor: "Mandor ⛑️",
  supervisor: "Supervisor 🎖️",
};

export default function StudentAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mls_user_id") : null,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !code.trim()) {
      toast.error("Nama, email, dan kode akses wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const user = await apiPost<User>("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        access_code: code.trim().toUpperCase(),
      });
      localStorage.setItem("mls_user_id", user.id);
      localStorage.setItem("mls_user", JSON.stringify(user));
      setSession(user.id);
      toast.success(`Berhasil masuk sebagai ${levelLabel[user.level]}.`);
    } catch (error: any) {
      toast.error(error?.body?.message || error?.message || "Kode akses salah. Minta kode dari mentor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pixel-world min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-2xl border-4 border-violet-950 bg-white shadow-[8px_8px_0_#2e1065] md:grid-cols-2">
          <div className="flex flex-col justify-center bg-violet-950 p-8 text-white sm:p-10">
            <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-yellow-300">MALAS BELAJAR.AI</p>
            <h1 className="pixel-title mt-4 text-4xl text-yellow-300 sm:text-5xl">MASUK SISWA</h1>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-violet-100">
              Masuk sekali menggunakan kode yang dibuat mentor. Setelah berhasil, kamu langsung masuk ke ruang belajar sesuai levelmu.
            </p>
            <div className="mt-8 rounded-xl border-2 border-yellow-300 bg-violet-900 p-4 text-sm font-bold text-yellow-100">
              Kode akses menentukan levelmu otomatis: Nguli, Mandor, atau Supervisor.
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5 p-6 sm:p-10" noValidate>
            <div>
              <label className="pixel-label mb-2 block">Nama</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" autoComplete="name" required />
            </div>
            <div>
              <label className="pixel-label mb-2 block">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" type="email" autoComplete="email" required />
            </div>
            <div>
              <label className="pixel-label mb-2 block">Kode Akses <span className="text-pink-600">*</span></label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MLS-NGU-XXXXXX-XX" autoComplete="off" required className="font-mono uppercase" />
              <p className="mt-2 text-xs font-bold text-slate-500">Wajib. Kode salah = tidak bisa masuk.</p>
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full border-2 border-violet-950 bg-yellow-300 font-black text-violet-950 hover:bg-yellow-400">
              {loading ? "MEMERIKSA KODE..." : "MASUK KE RUANG BELAJAR"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
