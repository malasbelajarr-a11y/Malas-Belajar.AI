import { useEffect, type ReactNode } from "react";

/**
 * Keeps the existing Malas Belajar login layout intact.
 * Only removes the old one-click demo block and makes the access code mandatory.
 */
export default function AuthVisualFix({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLElement>('[data-testid^="demo-login-"]').forEach((el) => {
        const wrapper = el.parentElement?.parentElement;
        if (wrapper) wrapper.style.display = "none";
        else el.style.display = "none";
      });

      document.querySelectorAll<HTMLElement>("p, label").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (text.includes("ATAU COBA CEPAT (DEMO 1-KLIK)")) {
          const parent = el.parentElement;
          if (parent) parent.style.display = "none";
        }
        if (text === "Kode Akses (Opsional):") {
          el.textContent = "Kode Akses *:";
        }
      });

      const input = document.querySelector<HTMLInputElement>('[data-testid="register-access-code-input"]');
      if (input) {
        input.required = true;
        input.placeholder = "Masukkan kode akses dari mentor";
        input.setAttribute("aria-required", "true");
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
