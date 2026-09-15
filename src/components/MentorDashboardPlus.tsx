import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";

type Level = "nguli" | "mandor" | "supervisor";
type Student = { id: string; name: string; email: string; level: Level; active: boolean };
type AccessCode = { id: string; code: string; level: Level; used: boolean; used_by: string };
type LeaderboardEntry = { rank: number; participant: string; score: number; correct: number; total: number; submitted_at: string };
type LiveClass = { id: string; title: string; description: string; youtube_url: string; starts_at: string; level: string; status: string };

const tabs = ["overview", "students", "ranking", "codes", "live"] as const;
type Tab = (typeof tabs)[number];
const levelLabel: Record<Level, string> = { nguli: "Nguli ⚒️", mandor: "Mandor ⛑️", supervisor: "Supervisor 🎖️" };

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.message || "Permintaan gagal.");
  return body as T;
}

function mentorCode() {
  try { return sessionStorage.getItem("mls_mentor_code") || localStorage.getItem("mls_mentor_code") || "CECEKOKOMLS"; } catch { return "CECEKOKOMLS"; }
}

export default function MentorDashboardPlus() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
  const [lives, setLives] = useState<LiveClass[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<Level>("nguli");
  const [count, setCount] = useState("10");
  const [liveTitle, setLiveTitle] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [liveStarts, setLiveStarts] = useState("");
  const [liveExplanation, setLiveExplanation] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const code = mentorCode();
      const [studentRows, leaderboardRows, liveRows] = await Promise.all([
        jsonRequest<Student[]>(`/api/admin/students?mentor_code=${encodeURIComponent(code)}`),
        apiGet<LeaderboardEntry[]>("/utbaby/leaderboard"),
        apiGet<LiveClass[]>("/live-classes"),
      ]);
      setStudents(Array.isArray(studentRows) ? studentRows : []);
      setRanking(Array.isArray(leaderboardRows) ? leaderboardRows : []);
      setLives(Array.isArray(liveRows) ? liveRows : []);
    } catch (error: any) {
      toast.error(error?.message || "Data Mentor belum bisa dimuat.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const detect = () => {
      const dashboard = document.querySelector('[data-testid="mentor-dashboard"]') as HTMLElement | null;
      if (!dashboard) { setHost(null); return; }
      let target = dashboard.querySelector('[data-testid="mentor-dashboard-plus-host"]') as HTMLElement | null;
      if (!target) {
        target = document.createElement("div");
        target.setAttribute("data-testid", "mentor-dashboard-plus-host");
        const container = dashboard.querySelector(".mx-auto.max-w-7xl.px-5.py-8") || dashboard;
        container.prepend(target);
      }
      setHost(target);
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (host) void load(); }, [host]);

  const generateCodes = async () => {
    try {
      const generated = await jsonRequest<AccessCode[]>("/api/admin/access-codes", { method: "POST", body: JSON.stringify({ mentor_code: mentorCode(), level, count: Math.max(1, Math.min(50, Number(count) || 10)) }) });
      setCodes(generated);
      setTab("codes");
      toast.success(`${generated.length} kode sekali pakai dibuat.`);
    } catch (error: any) { toast.error(error?.message || "Gagal membuat kode."); }
  };

  const scheduleLive = async () => {
    if (!liveTitle.trim() || !liveUrl.trim() || !liveStarts) { toast.error("Judul, URL, dan waktu Live Class wajib diisi."); return; }
    try {
      const live = await jsonRequest<LiveClass>("/api/live-classes", { method: "POST", body: JSON.stringify({ mentor_code: mentorCode(), title: liveTitle.trim(), description: liveExplanation.trim() || "Live Class bersama mentor Malas Belajar.", youtube_url: liveUrl.trim(), starts_at: new Date(liveStarts).toISOString(), recording_url: liveUrl.trim(), level }) });
      setLives((current) => [live, ...current]);
      setLiveTitle(""); setLiveUrl(""); setLiveStarts(""); setLiveExplanation("");
      toast.success("Live Class berhasil dijadwalkan.");
    } catch (error: any) { toast.error(error?.message || "Gagal menjadwalkan Live Class."); }
  };

  const toggleStudent = async (student: Student) => {
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(student.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mentor_code: mentorCode(), active: !student.active }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || "Gagal memperbarui siswa.");
      setStudents((current) => current.map((item) => item.id === student.id ? { ...item, active: !item.active } : item));
    } catch (error: any) { toast.error(error?.message || "Gagal memperbarui siswa."); }
  };

  const activeStudents = students.filter((item) => item.active).length;
  const byLevel = (lvl: Level) => students.filter((item) => item.level === lvl).length;
  if (!host) return null;

  return createPortal(
    <section className="mb-6 rounded-2xl border-4 border-violet-950 bg-violet-950 p-5 text-white shadow-[6px_6px_0_#2e1065]" data-testid="mentor-dashboard-plus">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">MENTOR COMMAND CENTER</p>
          <h2 className="mt-1 text-2xl font-black">Dashboard Mentor Lengkap</h2>
          <p className="mt-1 text-xs text-violet-200">Panel siswa · kode sekali pakai · ranking · IRT · Live Class · kontrol progres.</p>
        </div>
        <Button onClick={() => void load()} disabled={loading} className="border-2 border-violet-950 bg-yellow-300 font-black text-violet-950 hover:bg-yellow-400">{loading ? "MEMUAT..." : "REFRESH DATA"}</Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["TOTAL SISWA", students.length, "text-white"], ["AKTIF", activeStudents, "text-emerald-300"], ["NGULI", byLevel("nguli"), "text-yellow-300"], ["MANDOR", byLevel("mandor"), "text-pink-300"], ["SUPERVISOR", byLevel("supervisor"), "text-violet-200"]].map(([label, value, tone]) => <div key={String(label)} className="rounded-xl border-2 border-violet-700 bg-violet-900 p-3"><p className="text-[10px] font-bold text-violet-300">{label}</p><p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p></div>)}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">{tabs.map((item) => <Button key={item} onClick={() => setTab(item)} variant={tab === item ? "default" : "outline"} className={tab === item ? "bg-yellow-300 text-violet-950" : "border-violet-700 bg-violet-900 text-white"}>{item === "overview" ? "Ringkasan" : item === "students" ? "Panel Siswa" : item === "ranking" ? "Ranking + IRT" : item === "codes" ? "Kode Akses" : "Live Class"}</Button>)}</div>

      {tab === "overview" && <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950"><h3 className="font-black">KODE MENTOR → KODE SISWA</h3><p className="mt-1 text-xs text-slate-600">Satu kode hanya bisa dipakai satu akun. Setelah dipakai, kode ditolak untuk akun lain.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_120px]"><select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-md border-2 border-violet-950 bg-white px-3 py-2 text-sm font-bold"><option value="nguli">Nguli</option><option value="mandor">Mandor</option><option value="supervisor">Supervisor</option></select><Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} className="border-2 border-violet-950"/><Button onClick={() => void generateCodes()} className="bg-yellow-300 font-black text-violet-950">GENERATE</Button></div></div>
        <div className="rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950"><h3 className="font-black">RINGKASAN RANKING</h3><p className="mt-1 text-xs text-slate-600">Skor hasil UTBABY + pembobotan tingkat kesukaran dan daya pembeda butir.</p><div className="mt-3 space-y-2">{ranking.slice(0, 5).map((entry) => <div key={`${entry.participant}-${entry.rank}`} className="flex items-center justify-between rounded-lg border-2 border-violet-100 p-2"><span className="text-xs font-bold">#{entry.rank} {entry.participant}</span><strong>{entry.score}</strong></div>)}{!ranking.length && <p className="py-6 text-center text-xs text-slate-500">Belum ada hasil.</p>}</div></div>
      </div>}

      {tab === "students" && <div className="mt-5 overflow-x-auto rounded-xl border-2 border-violet-700 bg-white"><table className="w-full text-left text-sm text-violet-950"><thead><tr className="border-b-2 border-violet-200 bg-violet-50"><th className="p-3">#</th><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Level</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead><tbody>{students.map((student, index) => <tr key={student.id} className="border-b border-violet-100"><td className="p-3">{index + 1}</td><td className="p-3 font-black">{student.name}</td><td className="p-3">{student.email}</td><td className="p-3"><Badge>{levelLabel[student.level]}</Badge></td><td className="p-3">{student.active ? "Aktif" : "Nonaktif"}</td><td className="p-3"><Button size="sm" variant={student.active ? "destructive" : "outline"} onClick={() => void toggleStudent(student)}>{student.active ? "Nonaktifkan" : "Aktifkan"}</Button></td></tr>)}{!students.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data siswa.</td></tr>}</tbody></table></div>}

      {tab === "ranking" && <div className="mt-5 rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-yellow-100 p-4"><p className="text-xs font-bold">PENILAIAN IRT-LIKE</p><p className="mt-1 text-sm">Bobot mempertimbangkan kesukaran dan daya pembeda butir, lalu dinormalisasi ke rentang skor aplikasi.</p></div><div className="rounded-lg bg-pink-100 p-4"><p className="text-xs font-bold">PESERTA</p><p className="mt-1 text-2xl font-black">{ranking.length}</p></div><div className="rounded-lg bg-violet-100 p-4"><p className="text-xs font-bold">TOP SKOR</p><p className="mt-1 text-2xl font-black">{ranking[0]?.score ?? "—"}</p></div></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b-2"><th className="p-2">Rank</th><th className="p-2">Peserta</th><th className="p-2">Skor</th><th className="p-2">Benar</th><th className="p-2">Total</th><th className="p-2">Waktu</th></tr></thead><tbody>{ranking.map((entry) => <tr key={`${entry.rank}-${entry.participant}`} className="border-b"><td className="p-2 font-black">#{entry.rank}</td><td className="p-2">{entry.participant}</td><td className="p-2 font-black">{entry.score}</td><td className="p-2">{entry.correct}</td><td className="p-2">{entry.total}</td><td className="p-2 text-xs">{entry.submitted_at}</td></tr>)}</tbody></table></div></div>}

      {tab === "codes" && <div className="mt-5 rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">KODE TERAKHIR DIBUAT</h3><p className="mt-1 text-xs text-slate-600">Kode yang baru digenerate muncul di sini supaya gampang dicopy.</p></div><Button onClick={() => void generateCodes()} className="bg-yellow-300 font-black text-violet-950">GENERATE LAGI</Button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{codes.map((item) => <div key={item.id} className="rounded-lg border-2 border-violet-200 bg-yellow-50 p-3"><code className="font-black text-violet-950">{item.code}</code><div className="mt-1 text-[10px] font-bold">{levelLabel[item.level]} · SEKALI PAKAI</div></div>)}{!codes.length && <p className="col-span-full py-8 text-center text-xs text-slate-500">Belum ada kode di sesi ini. Generate dari Ringkasan.</p>}</div></div>}

      {tab === "live" && <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_.9fr]"><div className="rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950"><h3 className="font-black">LIVE CLASS + PENJELASAN LIVE</h3><p className="mt-1 text-xs text-slate-600">Tulis penjelasan/instruksi yang langsung dibawa sebagai deskripsi Live Class.</p><div className="mt-4 grid gap-3"><Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="Judul Live Class" className="border-2 border-violet-950"/><Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="URL YouTube Live" className="border-2 border-violet-950"/><Input type="datetime-local" value={liveStarts} onChange={(e) => setLiveStarts(e.target.value)} className="border-2 border-violet-950"/><Textarea value={liveExplanation} onChange={(e) => setLiveExplanation(e.target.value)} placeholder="Ketik penjelasan / instruksi Live Class di sini..." rows={5} className="border-2 border-violet-950"/><div className="flex gap-2"><select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="flex-1 rounded-md border-2 border-violet-950 bg-white px-3 py-2"><option value="nguli">Nguli</option><option value="mandor">Mandor</option><option value="supervisor">Supervisor</option></select><Button onClick={() => void scheduleLive()} className="bg-cyan-300 font-black text-violet-950">JADWALKAN</Button></div></div></div><div className="space-y-2">{lives.map((live) => <div key={live.id} className="rounded-xl border-2 border-violet-200 bg-white p-4 text-violet-950"><div className="flex items-center justify-between gap-2"><b>{live.title}</b><Badge>{live.level}</Badge></div><p className="mt-1 text-xs text-slate-500">{new Date(live.starts_at).toLocaleString("id-ID")}</p><p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{live.description}</p></div>)}</div></div>}
    </section>, host,
  );
}
