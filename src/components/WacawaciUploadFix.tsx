import { useEffect } from "react";
import { toast } from "sonner";

const API = "/api/wacawaci/resources";
const STORAGE_KEY = "mls_wacawaci_resources_v1";
const MENTOR_CODE = ["CECE", "KOKO", "MLS"].join("");
const SUBTESTS = [
  ["pu", "Penalaran Umum (PU)"],
  ["ppu", "Pengetahuan & Pemahaman Umum (PPU)"],
  ["pbm", "Pemahaman Bacaan & Menulis (PBM)"],
  ["pk", "Pengetahuan Kuantitatif (PK)"],
  ["lit_indo", "Literasi Bahasa Indonesia"],
  ["lit_inggris", "Literasi Bahasa Inggris"],
  ["pm", "Penalaran Matematika (PM)"],
] as const;

type Resource = { id: string; kind: string; title: string; description: string; url: string; is_public: boolean; created_by: string; level: string; subtest: string };

const readStored = (): Resource[] => {
  try { const raw = localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const writeStored = (items: Resource[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100))); } catch { /* storage quota: API copy remains available */ }
};
const remember = (resource: Resource) => writeStored([resource, ...readStored().filter((x) => x.id !== resource.id)]);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File gagal dibaca."));
    reader.readAsDataURL(file);
  });

function ensureSubtestSelector() {
  const kind = document.querySelector<HTMLSelectElement>('[data-testid="admin-resource-kind-select"]');
  const existing = document.querySelector('[data-testid="admin-resource-subtest-select"]');
  if (!kind || existing) return;
  const parent = kind.parentElement;
  if (!parent?.parentElement) return;
  const wrapper = parent.parentElement;
  const label = document.createElement("div");
  label.textContent = "LOKER SUBTES";
  label.style.cssText = "font-size:11px;font-weight:900;color:#2e1065;margin:8px 0 5px;text-transform:uppercase";
  const select = document.createElement("select");
  select.setAttribute("data-testid", "admin-resource-subtest-select");
  select.setAttribute("aria-label", "Loker subtes Wacawaci");
  select.style.cssText = "width:100%;border:2px solid #2e1065;border-radius:8px;background:#fff;padding:10px;font-weight:800;color:#2e1065";
  SUBTESTS.forEach(([id, text]) => { const option = document.createElement("option"); option.value = id; option.textContent = text; select.appendChild(option); });
  wrapper.insertBefore(label, parent);
  wrapper.insertBefore(select, parent);
}

export default function WacawaciUploadFix() {
  useEffect(() => {
    const observer = new MutationObserver(ensureSubtestSelector);
    observer.observe(document.body, { childList: true, subtree: true });
    ensureSubtestSelector();

    const upload = async (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>('[data-testid="admin-upload-resource-button"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      const input = (testid: string) => document.querySelector<HTMLInputElement>(`[data-testid="${testid}"]`);
      const kind = document.querySelector<HTMLSelectElement>('[data-testid="admin-resource-kind-select"]');
      const level = document.querySelector<HTMLSelectElement>('[data-testid="admin-content-level-select"]');
      const subtest = document.querySelector<HTMLSelectElement>('[data-testid="admin-resource-subtest-select"]');
      const title = input("admin-resource-title-input")?.value.trim() || "";
      const description = document.querySelector<HTMLTextAreaElement>('[data-testid="admin-resource-description-input"]')?.value.trim() || "";
      const url = input("admin-resource-url-input")?.value.trim() || "";
      const file = input("admin-resource-file-input")?.files?.[0];
      if (!title) return toast.error("Isi judul materi dulu.");
      if (!url && !file) return toast.error("Masukkan URL materi atau pilih file.");

      let resourceUrl = url;
      if (!resourceUrl && file) {
        if (file.size > 3_000_000) return toast.error("File terlalu besar untuk upload langsung. Isi URL Google Drive/YouTube pada kolom URL.");
        try { resourceUrl = await readAsDataUrl(file); } catch { return toast.error("File tidak bisa dibaca."); }
      }

      const originalText = button.textContent || "PUBLIKASIKAN";
      button.textContent = "MENYIMPAN...";
      (button as HTMLButtonElement).disabled = true;
      const chosenSubtest = subtest?.value || "pu";
      try {
        const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ mentor_code: MENTOR_CODE, kind: kind?.value || "video", title, description, url: resourceUrl, is_public: true, level: level?.value || "nguli", subtest: chosenSubtest }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.detail || body?.error || `Gagal (${response.status})`);
        if (body?.id) remember(body as Resource);
        const selectedLabel = SUBTESTS.find(([id]) => id === chosenSubtest)?.[1] || "loker subtes";
        toast.success(`Materi masuk ke ${selectedLabel}.`);
        const titleInput = input("admin-resource-title-input"); const urlInput = input("admin-resource-url-input"); const fileInput = input("admin-resource-file-input"); const desc = document.querySelector<HTMLTextAreaElement>('[data-testid="admin-resource-description-input"]');
        if (titleInput) titleInput.value = ""; if (desc) desc.value = ""; if (urlInput) urlInput.value = ""; if (fileInput) fileInput.value = "";
        window.dispatchEvent(new CustomEvent("mls-wacawaci-uploaded"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mempublikasikan materi.");
      } finally { button.textContent = originalText; (button as HTMLButtonElement).disabled = false; }
    };

    document.addEventListener("click", upload, true);
    return () => { observer.disconnect(); document.removeEventListener("click", upload, true); };
  }, []);
  return null;
}
