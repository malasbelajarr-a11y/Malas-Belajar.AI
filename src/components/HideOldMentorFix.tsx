import { useEffect } from "react";

export default function HideOldMentorFix() {
  useEffect(() => {
    const sync = () => {
      const text = document.body?.innerText || "";
      const mentor = text.includes("MENTOR CONTROL ROOM") || text.includes("BUAT KODE SEKALI PAKAI") || text.includes("GENERATE 3 KODE");
      const old = document.querySelector('[data-testid="subtest-fix-overlay"]') as HTMLElement | null;
      if (old) old.style.display = mentor ? "none" : "";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
