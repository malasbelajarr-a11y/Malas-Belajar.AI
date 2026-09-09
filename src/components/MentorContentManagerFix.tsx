import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const SUBTESTS = [
  ["pu", "Penalaran Umum (PU)"],
  ["ppu", "Pengetahuan & Pemahaman Umum (PPU)"],
  ["pbm", "Pemahaman Bacaan & Menulis (PBM)"],
  ["pk", "Pengetahuan Kuantitatif (PK)"],
  ["lit_indo", "Literasi Bahasa Indonesia"],
  ["lit_inggris", "Literasi Bahasa Inggris"],
  ["pm", "Penalaran Matematika (PM)"],
] as const;

type Item = { id: string; title?: string; prompt?: string; chapter?: string; chapter_label?: string; kind?: string; subtest?: string; level?: string };

const mentorCode = "CECEKOKOMLS";

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.message || "Permintaan gagal.");
  return body as T;
}

export default function MentorContentManagerFix() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState("pu");
  const [rodiItems, setRodiItems] = useState<Item[]>([]);
  const [wacaItems, setWacaItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    try {
      const [r, w] = await Promise.all([
        jsonRequest<Item[]>("/api/rodi/questions"),
        jsonRequest<Item[]>("/api/wacawaci/resources"),
      ]);
      setRodiItems(Array.isArray(r) ? r : []);
      setWacaItems(Array.isArray(w) ? w : []);
    } catch {
      // The mentor page can still be used if a content endpoint is unavailable.
    }
  };

  useEffect(() => {
    const detect = () => {
      const dashboard = document.querySelector('[data-testid="mentor-dashboard"]');
      if (!dashboard) {
        setHost(null);
        return;
      }
      let target = dashboard.querySelector('[data-testid="mentor-content-manager-host"]') as HTMLElement | null;
      if (!target) {
        target = document.createElement("div");
        target.dataset.testid = "mentor-content-manager-host";
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

  useEffect(() => {
    if (!host) return;
    refresh();
  }, [host]);

  useEffect(() => {
    const handler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.('[data-testid="admin-add-question-button"]') as HTMLButtonElement | null;
      if (!button) return;
      const prompt = (document.querySelector('[data-testid="admin-question-prompt-input"]') as HTMLInputElement | null)?.value?.trim() || "";
      const optionsRaw = (document.querySelector('[data-testid="admin-question-options-input"]') as HTMLTextAreaElement | null)?.value || "";
      const level = (document.querySelector('[data-testid="level-select"]') as HTMLSelectElement | null)?.value || "nguli";
      if (!prompt) return;
      event.preventDefault();
      event.stopPropagation();
      void (async () => {
        try {
          setBusy("rodi-upload");
          await jsonRequest("/api/rodi/questions", {
            method: "POST",
            body: JSON.stringify({ mentor_code: mentorCode, subtest: selected, prompt, options: optionsRaw.split("\n").filter(Boolean).slice(0, 5), correct_option: 0, steps: ["Pembahasan mentor: evaluasi stimulus dan pilih opsi paling tepat."], difficulty: "Aplikasi", level }),
          });
          toast.success(`Soal masuk ke ${SUBTESTS.find(([id]) => id === selected)?.[1]}.`);
          (document.querySelector('[data-testid="admin-question-prompt-input"]') as HTMLInputElement | null)?.value && ((document.querySelector('[data-testid="admin-question-prompt-input"]') as HTMLInputElement).value = "");
          await refresh();
        } catch (error: any) {
          toast.error(error?.message || "Gagal menambah soal.");
        } finally {
          setBusy("");
        }
      })();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [selected]);

  const remove = async (kind: "rodi" | "wacawaci", id: string) => {
    if (!window.confirm(kind === "rodi" ? "Hapus soal RODI ini?" : "Hapus materi Wacawaci ini?")) return;
    try {
      setBusy(`${kind}-${id}`);
      await jsonRequest(kind === "rodi" ? `/api/rodi/questions?id=${encodeURIComponent(id)}&mentor_code=${mentorCode}` : `/api/wacawaci/resources?id=${encodeURIComponent(id)}&mentor_code=${mentorCode}`, { method: "DELETE" });
      toast.success(kind === "rodi" ? "Soal RODI dihapus." : "Materi Wacawaci dihapus.");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menghapus.");
    } finally {
      setBusy("");
    }
  };

  if (!host) return null;
  const subtestLabel = (id?: string) => SUBTESTS.find(([key]) => key === id)?.[1] || id || "PU";

  return createPortal(
    <section className="mb-6 rounded-xl border-4 border-violet-950 bg-white p-4 shadow-[4px_4px_0_#2e1065]" data-testid="mentor-content-manager">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-violet-600">KONTEN MENTOR</p>
          <h2 className="text-lg font-black text-violet-950">Pilih Loker Subtes + Kelola Upload</h2>
          <p className="text-xs text-slate-500">Pilihan ini dipakai saat menambah soal RODI dan materi Wacawaci.</p>
        </div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-lg border-2 border-violet-950 bg-yellow-100 px-3 py-2 text-sm font-black" data-testid="mentor-subtest-select">
          {SUBTESTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
          <div className="flex items-center justify-between gap-2"><b className="text-violet-950">RODI TERUPLOAD</b><span className="font-mono text-xs">{rodiItems.length}</span></div>
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {rodiItems.length ? rodiItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-violet-200 bg-white p-2"><div className="min-w-0"><p className="truncate text-xs font-black text-violet-950">{item.prompt || item.title}</p><p className="truncate text-[10px] text-slate-500">{subtestLabel(item.chapter)} · {item.level || "nguli"}</p></div><button type="button" onClick={() => remove("rodi", item.id)} disabled={busy === `rodi-${item.id}`} className="shrink-0 rounded-md border-2 border-violet-950 bg-pink-300 p-1.5 text-violet-950"><Trash2 className="h-4 w-4" /></button></div>) : <p className="py-4 text-center text-xs text-slate-500">Belum ada soal RODI tambahan.</p>}
          </div>
        </div>

        <div className="rounded-xl border-2 border-violet-200 bg-pink-50 p-3">
          <div className="flex items-center justify-between gap-2"><b className="text-violet-950">WACAWACI TERUPLOAD</b><span className="font-mono text-xs">{wacaItems.length}</span></div>
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {wacaItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-pink-200 bg-white p-2"><div className="min-w-0"><p className="truncate text-xs font-black text-violet-950">{item.title}</p><p className="truncate text-[10px] text-slate-500">{subtestLabel(item.subtest)} · {item.kind} · {item.level || "nguli"}</p></div><button type="button" onClick={() => remove("wacawaci", item.id)} disabled={busy === `wacawaci-${item.id}`} className="shrink-0 rounded-md border-2 border-violet-950 bg-pink-300 p-1.5 text-violet-950"><Trash2 className="h-4 w-4" /></button></div>)}
            {!wacaItems.length && <p className="py-4 text-center text-xs text-slate-500">Belum ada materi Wacawaci.</p>}
          </div>
        </div>
      </div>
    </section>,
    host,
  );
}
