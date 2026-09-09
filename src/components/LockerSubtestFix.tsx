import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, apiUpload } from "@/lib/api";

type Level = "nguli" | "mandor" | "supervisor";
type Kind = "video" | "module";

const SUBTESTS = [
  { id: "pu", label: "Penalaran Umum (PU)" },
  { id: "ppu", label: "Pengetahuan & Pemahaman Umum (PPU)" },
  { id: "pbm", label: "Pemahaman Bacaan & Menulis (PBM)" },
  { id: "pk", label: "Pengetahuan Kuantitatif (PK)" },
  { id: "lit_indo", label: "Literasi Bahasa Indonesia" },
  { id: "lit_inggris", label: "Literasi Bahasa Inggris" },
  { id: "pm", label: "Penalaran Matematika (PM)" },
] as const;

interface Question {
  id: string;
  chapter: string;
  chapter_label: string;
  number: number;
  difficulty: string;
  prompt: string;
  answer: string;
  steps: string[];
}
interface Resource {
  id: string;
  kind: string;
  title: string;
  description: string;
  url: string;
  is_public: boolean;
  created_by: string;
  level: string;
  subtest?: string;
}

export default function LockerSubtestFix() {
  const [active, setActive] = useState<"rodi" | "wacawaci" | null>(null);
  const [mentorWacawaci, setMentorWacawaci] = useState(false);
  const [selected, setSelected] = useState("pu");
  const [kind, setKind] = useState<Kind>("video");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("nguli");

  useEffect(() => {
    const detect = () => {
      const hasRodi = Boolean(document.querySelector('[data-testid="rodi-locker"]'));
      const hasWaca = Boolean(document.querySelector('[data-testid="wacawaci-locker"]'));
      const hasMentorWacawaciForm = Boolean(document.querySelector('[data-testid="admin-resource-kind-select"]'));
      setActive(hasRodi ? "rodi" : hasWaca ? "wacawaci" : null);
      setMentorWacawaci(hasMentorWacawaciForm);
      const badge = document.querySelector('[data-testid="header-level-badge"]')?.textContent?.toLowerCase() || "";
      if (badge.includes("supervisor")) setLevel("supervisor");
      else if (badge.includes("mandor")) setLevel("mandor");
      else setLevel("nguli");
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active && !mentorWacawaci) return;
    setLoading(true);
    const endpoint = active === "rodi" ? "/rodi/module" : "/wacawaci/resources";
    apiGet<any>(endpoint)
      .then((data) => {
        if (active === "rodi") setQuestions(data?.questions ?? []);
        else setResources(data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [active, mentorWacawaci, level]);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => q.chapter === selected || q.chapter === "mentor"),
    [questions, selected],
  );
  const visibleResources = useMemo(
    () => resources.filter((r) => r.kind === kind && (!r.subtest || r.subtest === selected) && (!r.level || r.level === level)),
    [resources, kind, selected, level],
  );

  const upload = async () => {
    if (!title.trim()) return toast.error("Judul materi wajib diisi.");
    try {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        await apiUpload<Resource>(
          `/wacawaci/upload?mentor_code=CECEKOKOMLS&kind=${kind}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&level=${level}&subtest=${selected}`,
          form,
        );
      } else {
        await apiPost<Resource>("/wacawaci/resources", {
          mentor_code: "CECEKOKOMLS",
          kind,
          title,
          description,
          url,
          is_public: true,
          level,
          subtest: selected,
        });
      }
      const fresh = await apiGet<Resource[]>("/wacawaci/resources");
      setResources(fresh ?? []);
      setTitle("");
      setDescription("");
      setUrl("");
      setFile(null);
      toast.success(`Materi masuk ke ${SUBTESTS.find((s) => s.id === selected)?.label}.`);
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || "Upload gagal.");
    }
  };

  if (!active && !mentorWacawaci) return null;

  const closeOverlay = () => {
    if (mentorWacawaci) {
      const target = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim().toLowerCase() === "students",
      );
      if (target) target.click();
      return;
    }
    const back = document.querySelector('[data-testid="global-back-button"]') as HTMLButtonElement | null;
    if (back) back.click();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-pink-50/98 p-4 sm:p-6" data-testid="subtest-fix-overlay">
      <div className="mx-auto max-w-7xl rounded-2xl border-4 border-violet-950 bg-white shadow-[8px_8px_0_#2e1065]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-violet-950 bg-yellow-300 p-4">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-violet-700">MALAS BELAJAR · 7 SUBTES</p>
            <h1 className="text-2xl font-black text-violet-950">
              {mentorWacawaci ? "WACAWACI — UPLOAD PER SUBTES" : active === "rodi" ? "RODI — PILIH LOKER SUBTES" : "WACAWACI — PILIH LOKER SUBTES"}
            </h1>
          </div>
          <button className="rounded-lg border-2 border-violet-950 bg-white p-2" onClick={closeOverlay}>
            <X />
          </button>
        </div>

        {mentorWacawaci && (
          <div className="border-b-4 border-violet-950 bg-violet-50 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold">
                {SUBTESTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold">
                <option value="video">Video</option>
                <option value="module">Modul</option>
              </select>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul materi" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL video/PDF (opsional)" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi" className="min-h-24 rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <button onClick={upload} className="rounded-lg border-2 border-violet-950 bg-pink-300 px-5 py-3 font-black md:col-span-2">
                <Upload className="mr-2 inline h-4 w-4" /> UPLOAD KE LOKER SUBTES
              </button>
            </div>
          </div>
        )}

        {active && (
          <>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {SUBTESTS.map((s, i) => (
                <button key={s.id} onClick={() => setSelected(s.id)} className={`rounded-xl border-4 border-violet-950 p-4 text-left shadow-[3px_3px_0_#2e1065] ${selected === s.id ? "bg-yellow-300" : "bg-violet-50"}`}>
                  <span className="font-mono text-xs font-black text-pink-600">0{i + 1}</span>
                  <p className="mt-2 font-black text-violet-950">{s.label}</p>
                  <p className="mt-2 text-xs text-slate-600">Buka untuk melihat {active === "rodi" ? "soal" : "modul/video"} subtes ini.</p>
                </button>
              ))}
            </div>

            <div className="border-t-4 border-violet-950 bg-violet-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black text-pink-600">LOKER {selected.toUpperCase()}</p>
                  <h2 className="text-xl font-black text-violet-950">{SUBTESTS.find((s) => s.id === selected)?.label}</h2>
                </div>
                {active === "wacawaci" && (
                  <div className="flex gap-2">
                    <button onClick={() => setKind("video")} className={`rounded-lg border-2 border-violet-950 px-4 py-2 font-black ${kind === "video" ? "bg-pink-300" : "bg-white"}`}><Video className="mr-1 inline h-4 w-4" /> VIDEO</button>
                    <button onClick={() => setKind("module")} className={`rounded-lg border-2 border-violet-950 px-4 py-2 font-black ${kind === "module" ? "bg-yellow-300" : "bg-white"}`}><FileText className="mr-1 inline h-4 w-4" /> MODUL</button>
                  </div>
                )}
              </div>
              {loading ? (
                <p className="py-10 text-center font-bold">Memuat isi loker…</p>
              ) : active === "rodi" ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {visibleQuestions.length ? visibleQuestions.map((q) => (
                    <article key={q.id} className="rounded-xl border-2 border-violet-200 bg-white p-4">
                      <div className="flex justify-between"><b>#{q.number}</b><span className="text-xs font-bold text-pink-600">{q.difficulty}</span></div>
                      <h3 className="mt-3 font-black text-violet-950">{q.prompt}</h3>
                      <p className="mt-3 text-xs text-slate-600">Jawaban: {q.answer}</p>
                      <details className="mt-3"><summary className="cursor-pointer font-black text-violet-700">Lihat pembahasan</summary><div className="mt-2 space-y-1 text-xs text-slate-700">{q.steps?.map((s, i) => <p key={i}>{i + 1}. {s}</p>)}</div></details>
                    </article>
                  )) : <p className="py-10 text-center font-bold text-slate-500">Belum ada soal untuk subtes ini.</p>}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {visibleResources.length ? visibleResources.map((r) => (
                    <article key={r.id} className="rounded-xl border-2 border-violet-200 bg-white p-4">
                      <div className="flex justify-between"><span className="rounded bg-pink-100 px-2 py-1 text-xs font-black">{r.kind}</span><span className="text-[10px] font-black uppercase text-violet-600">{r.level}</span></div>
                      <h3 className="mt-3 font-black text-violet-950">{r.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="mt-4 inline-block font-black text-pink-600 underline">BUKA MATERI →</a>
                    </article>
                  )) : <p className="py-10 text-center font-bold text-slate-500">Belum ada materi untuk subtes ini.</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
