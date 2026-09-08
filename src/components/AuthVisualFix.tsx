import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** Keeps the existing home design, removes demo UI, and wires the visible auth buttons to real pages. */
export default function AuthVisualFix({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

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
        if (text === "Kode Akses (Opsional):") el.textContent = "Kode Akses *:";
      });

      const input = document.querySelector<HTMLInputElement>('[data-testid="register-access-code-input"]');
      if (input) {
        input.required = true;
        input.placeholder = "Masukkan kode akses dari mentor";
        input.setAttribute("aria-required", "true");
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
      if (text.includes("BUAT AKUN") && text.includes("KODE")) {
        event.preventDefault();
        event.stopPropagation();
        navigate("/akun");
      } else if (text.includes("LOGIN SISWA")) {
        event.preventDefault();
        event.stopPropagation();
        navigate("/login");
      }
    };

    apply();
    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, [navigate]);

  return <>{children}</>;
}
