import { useEffect } from "react";
import { toast } from "sonner";

const API = "/api/wacawaci/resources";

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File gagal dibaca."));
    reader.readAsDataURL(file);
  });

export default function WacawaciUploadFix() {
  useEffect(() => {
    const upload = async (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>(
        '[data-testid="admin-upload-resource-button"]',
      );
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const input = (testid: string) =>
        document.querySelector<HTMLInputElement>(`[data-testid="${testid}"]`);
      const kind = document.querySelector<HTMLSelectElement>(
        '[data-testid="admin-resource-kind-select"]',
      );
      const level = document.querySelector<HTMLSelectElement>(
        '[data-testid="admin-content-level-select"]',
      );
      const title = input("admin-resource-title-input")?.value.trim() || "";
      const description =
        document.querySelector<HTMLTextAreaElement>(
          '[data-testid="admin-resource-description-input"]',
        )?.value.trim() || "";
      const url = input("admin-resource-url-input")?.value.trim() || "";
      const file = input("admin-resource-file-input")?.files?.[0];

      if (!title) {
        toast.error("Isi judul materi dulu.");
        return;
      }
      if (!url && !file) {
        toast.error("Masukkan URL materi atau pilih file.");
        return;
      }

      let resourceUrl = url;
      if (!resourceUrl && file) {
        if (file.size > 3_000_000) {
          toast.error(
            "File terlalu besar untuk upload langsung. Isi URL Google Drive/YouTube pada kolom URL.",
          );
          return;
        }
        try {
          resourceUrl = await readAsDataUrl(file);
        } catch {
          toast.error("File tidak bisa dibaca.");
          return;
        }
      }

      const originalText = button.textContent || "PUBLIKASIKAN";
      button.setAttribute("data-upload-fixing", "true");
      button.textContent = "MENYIMPAN...";
      (button as HTMLButtonElement).disabled = true;

      try {
        const response = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mentor_code: "CECEKOKOMLS",
            kind: kind?.value || "video",
            title,
            description,
            url: resourceUrl,
            is_public: true,
            level: level?.value || "nguli",
          }),
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.detail || body?.error || `Gagal (${response.status})`);
        }

        toast.success("Materi Wacawaci berhasil dipublikasikan!");
        input("admin-resource-title-input")!.value = "";
        const desc = document.querySelector<HTMLTextAreaElement>(
          '[data-testid="admin-resource-description-input"]',
        );
        if (desc) desc.value = "";
        input("admin-resource-url-input")!.value = "";
        if (input("admin-resource-file-input")) {
          input("admin-resource-file-input")!.value = "";
        }

        window.dispatchEvent(new CustomEvent("mls-wacawaci-uploaded"));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal mempublikasikan materi.",
        );
      } finally {
        button.removeAttribute("data-upload-fixing");
        button.textContent = originalText;
        (button as HTMLButtonElement).disabled = false;
      }
    };

    document.addEventListener("click", upload, true);
    return () => document.removeEventListener("click", upload, true);
  }, []);

  return null;
}
