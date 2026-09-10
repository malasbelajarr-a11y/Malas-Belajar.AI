import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentAuth from "@/pages/StudentAuth";
import { getSessionUserId } from "@/lib/session";

const LOGO = "/api/assets/mls-logo.png";
const BYPASS_KEY = "mls_student_gate_bypass";

export default function StudentEntryGate() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (getSessionUserId() || localStorage.getItem(BYPASS_KEY) === "1") return;
    setOpen(true);
    const timer = window.setTimeout(() => setShowLogin(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  const enterMentor = () => {
    localStorage.setItem(BYPASS_KEY, "1");
    setOpen(false);
  };

  if (showLogin) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#26005b]">
        <div className="mx-auto flex min-h-screen max-w-2xl items-start justify-center px-4 py-6">
          <div className="w-full">
            <div className="mb-3 flex items-center justify-between rounded-2xl border-4 border-violet-950 bg-yellow-300 px-4 py-3 shadow-[5px_6px_0_#3b1475]">
              <div className="flex items-center gap-3">
                <img src={LOGO} alt="Malas Belajar" className="h-12 w-16 object-contain" />
                <span className="font-mono font-black text-violet-950">MALAS BELAJAR</span>
              </div>
              <button
                type="button"
                onClick={enterMentor}
                className="rounded-xl border-2 border-violet-950 bg-white px-3 py-2 text-xs font-black text-violet-950"
              >
                👨‍🏫 MENTOR
              </button>
            </div>
            <StudentAuth />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#26005b]">
      <div className="text-center">
        <img
          src={LOGO}
          alt="Logo Malas Belajar"
          className="mx-auto h-56 w-72 object-contain drop-shadow-[8px_10px_0_rgba(46,16,101,.65)]"
        />
        <p className="mt-4 font-mono text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
          MALAS BELAJAR
        </p>
      </div>
    </div>
  );
}
