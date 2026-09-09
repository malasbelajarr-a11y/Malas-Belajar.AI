import { useEffect, useState } from "react";
import { FileText, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";

type Level = "nguli" | "mandor" | "supervisor";
type Kind = "video" | "module";

const SUBTESTS = [
  ["pu", "Penalaran Umum (PU)"],
  ["ppu", "Pengetahuan & Pemahaman Umum (PPU)"],
  ["pbm", "Pemahaman Bacaan & Menulis (PBM)"],
  ["pk", "Pengetahuan Kuantitatif (PK)"],
  ["lit_indo", "Literasi Bahasa Indonesia"],
  ["lit_inggris", "Literasi Bahasa Inggris"],
  ["pm", "Penalaran Matematika (PM)"],
] as const;

const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("File tidak dapat dibaca."));
  reader.readAsDataURL(file);
});

export default function MentorContentFix() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<"rodi" | "wacawaci">("rodi");
  const [subtest, setSubtest] = useState("pu");
  const [level, setLevel] = useState<Level>("nguli");
  const [kind, setKind] = useState<Kind>("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [topic, setTopic] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("Sedang");
  const [options, setOptions] = useState(["", "", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const [steps, setSteps] = useState("");
  const [trapTip, setTrapTip] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detect = () => {
      const text = document.body?.innerText || "";
      const isMentor = text.includes("MENTOR CONTROL ROOM") || text.includes("BUAT KODE SEKALI PAKAI") || text.includes("GENERATE 3 KODE");
      setVisible(isMentor);
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const close = () => setVisible(false);

  const addRodi = async () => {
    if (!prompt.trim()) return toast.error("Soal wajib diisi.");
    setBusy(true);
    try {
      await apiPost("/rodi/questions", {
        mentor_code: "CECEKOKOMLS",
        subtest,
        level,
        prompt: prompt.trim(),
        topic: topic.trim(),
        answer: answer.trim(),
        difficulty,
        options: options.filter(Boolean),
        correct_option: correct === "" ? null : Number(correct),
        steps: steps.split("\n").map((x) => x.trim()).filter(Boolean),
        trap_tip: trapTip.trim(),
        video_url: videoUrl.trim(),
      });
      toast.success(`Soal berhasil masuk ke ${SUBTESTS.find(([id]) => id === subtest)?.[1]}.`);
      setPrompt(""); setTopic(""); setAnswer(""); setOptions(["", "", "", "", ""]); setCorrect(""); setSteps(""); setTrapTip(""); setVideoUrl("");
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || "Gagal menambahkan soal.");
    } finally { setBusy(false); }
  };

  const addWacawaci = async () => {
    if (!title.trim()) return toast.error("Judul materi wajib diisi.");
    if (!url.trim() && !file) return toast.error("Masukkan URL atau pilih file materi.");
    setBusy(true);
    try {
      let materialUrl = url.trim();
      if (file) {
        if (file.size > 4 * 1024 * 1024) {
          throw new Error("File maksimal 4 MB untuk upload langsung. Untuk file besar, pakai URL Google Drive/YouTube/PDF.");
        }
        materialUrl = await toDataUrl(file);
      }
      await apiPost("/wacawaci/resources", {
        mentor_code: "CECEKOKOMLS",
        kind,
        title: title.trim(),
        description: description.trim(),
        url: materialUrl,
        is_public: true,
        level,
        subtest,
      });
      toast.success(`Materi berhasil masuk ke ${SUBTESTS.find(([id]) => id === subtest)?.[1]}.`);
      setTitle(""); setDescription(""); setUrl(""); setFile(null);
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || "Upload gagal.");
    } finally { setBusy(false); }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-pink-50/98 p-4 sm:p-6" data-testid="mentor-content-fix">
      <div className="mx-auto max-w-6xl rounded-2xl border-4 border-violet-950 bg-white shadow-[8px_8px_0_#2e1065]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b-4 border-violet-950 bg-yellow-300 p-4">
          <div><p className="font-mono text-xs font-black tracking-widest text-violet-700">MENTOR CONTENT MANAGER</p><h1 className="text-2xl font-black text-violet-950">TAMBAH KONTEN PER SUBTES</h1></div>
          <button onClick={close} className="rounded-lg border-2 border-violet-950 bg-white p-2"><X /></button>
        </header>

        <div className="border-b-4 border-violet-950 p-4"><div className="flex flex-wrap gap-2"><button onClick={() => setTab("rodi")} className={`rounded-lg border-2 border-violet-950 px-5 py-3 font-black ${tab === "rodi" ? "bg-yellow-300" : "bg-white"}`}><Plus className="mr-1 inline h-4 w-4"/> TAMBAH SOAL RODI</button><button onClick={() => setTab("wacawaci")} className={`rounded-lg border-2 border-violet-950 px-5 py-3 font-black ${tab === "wacawaci" ? "bg-pink-300" : "bg-white"}`}><Upload className="mr-1 inline h-4 w-4"/> TAMBAH WACAWACI</button></div></div>

        {tab === "rodi" ? (
          <section className="bg-violet-50 p-5">
            <div className="mb-4 rounded-xl border-2 border-violet-300 bg-yellow-100 p-3"><b>1. PILIH SUBTES</b><p className="text-xs">Soal akan tersimpan khusus di loker subtes ini.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={subtest} onChange={(e) => setSubtest(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold md:col-span-2">{SUBTESTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold"><option value="nguli">Nguli</option><option value="mandor">Mandor</option><option value="supervisor">Supervisor</option></select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold"><option>Mudah</option><option>Sedang</option><option>Sulit</option><option>Sangat Sulit</option></select>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik soal" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Jawaban singkat" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Tulis soal di sini..." className="min-h-32 rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <div className="md:col-span-2"><p className="mb-2 font-black">Pilihan A–E</p><div className="grid gap-2 md:grid-cols-2">{options.map((v, i) => <input key={i} value={v} onChange={(e) => setOptions((p) => p.map((x, j) => j === i ? e.target.value : x))} placeholder={`${String.fromCharCode(65 + i)}. pilihan`} className="rounded-lg border-2 border-violet-950 bg-white p-3" />)}</div></div>
              <select value={correct} onChange={(e) => setCorrect(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold"><option value="">Jawaban benar</option>{options.map((o, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}{o ? `. ${o}` : ""}</option>)}</select>
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL video pembahasan (opsional)" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Pembahasan langkah demi langkah — satu langkah/baris" className="min-h-24 rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <input value={trapTip} onChange={(e) => setTrapTip(e.target.value)} placeholder="Jebakan soal (opsional)" className="rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <button disabled={busy} onClick={addRodi} className="rounded-lg border-2 border-violet-950 bg-yellow-300 px-5 py-3 font-black disabled:opacity-50 md:col-span-2"><Plus className="mr-2 inline h-4 w-4"/>{busy ? "MENYIMPAN..." : `TAMBAH SOAL KE ${SUBTESTS.find(([id]) => id === subtest)?.[1].toUpperCase()}`}</button>
            </div>
          </section>
        ) : (
          <section className="bg-violet-50 p-5">
            <div className="mb-4 rounded-xl border-2 border-violet-300 bg-pink-100 p-3"><b>1. PILIH SUBTES</b><p className="text-xs">Materi yang di-upload hanya muncul di loker subtes yang dipilih.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={subtest} onChange={(e) => setSubtest(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold md:col-span-2">{SUBTESTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold"><option value="video">Video</option><option value="module">Modul</option></select>
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-lg border-2 border-violet-950 bg-white p-3 font-bold"><option value="nguli">Nguli</option><option value="mandor">Mandor</option><option value="supervisor">Supervisor</option></select>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul materi" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL YouTube / PDF / Drive (opsional jika pilih file)" className="rounded-lg border-2 border-violet-950 bg-white p-3" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi materi" className="min-h-24 rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-lg border-2 border-violet-950 bg-white p-3 md:col-span-2" />
              {file && <p className="text-xs font-bold text-violet-700 md:col-span-2">File dipilih: {file.name}</p>}
              <button disabled={busy} onClick={addWacawaci} className="rounded-lg border-2 border-violet-950 bg-pink-300 px-5 py-3 font-black disabled:opacity-50 md:col-span-2"><Upload className="mr-2 inline h-4 w-4"/>{busy ? "MENGUPLOAD..." : `UPLOAD KE ${SUBTESTS.find(([id]) => id === subtest)?.[1].toUpperCase()}`}</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
