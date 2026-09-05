import { useEffect, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Gamepad2,
  Hammer,
  HardHat,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  UserRoundCog,
  Video,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, apiPost, apiPut, apiUpload } from "@/lib/api";
import { beginSession, endSession } from "@/lib/session";

type View = "dashboard" | "rodi" | "wacawaci" | "live" | "utbaby" | "mentor";
type Level = "nguli" | "mandor" | "supervisor";

interface User {
  id: string;
  name: string;
  email: string;
  level: Level;
  active: boolean;
}
interface Question {
  id: string;
  chapter: string;
  chapter_label: string;
  number: number;
  difficulty: string;
  topic: string;
  prompt: string;
  answer: string;
  steps: string[];
  is_final: boolean;
  options: string[];
  correct_option: number | null;
  irt_difficulty: number;
  irt_discrimination: number;
  level: string;
  trap_tip: string;
  video_url: string;
}
interface ModuleResponse {
  title: string;
  subtitle: string;
  total_questions: number;
  questions: Question[];
}
interface Subtest {
  id: string;
  label: string;
  short_label: string;
  question_count: number;
  duration_minutes: number;
  component: string;
  description: string;
}
interface SubtestResponse {
  year: number;
  total_questions: number;
  total_minutes: number;
  subtests: Subtest[];
  note: string;
  level: string;
}
interface Motivation {
  mascot: string;
  group_name: string;
  message: string;
  source: string;
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
}
interface LiveClass {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  starts_at: string;
  recording_url: string;
  level: string;
  status: string;
}
interface TryoutSummary {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  question_count: number;
  status: string;
  max_score: number;
  level: string;
}
interface TryoutDetail extends TryoutSummary {
  questions: Question[];
}
interface LeaderboardEntry {
  rank: number;
  participant: string;
  score: number;
  correct: number;
  total: number;
  submitted_at: string;
}
interface TryoutResult {
  session_id: string;
  participant: string;
  score: number;
  correct: number;
  total: number;
  percentile: number;
  irt_note: string;
  rank: number;
}
interface Notification {
  id: string;
  title: string;
  message: string;
  kind: string;
  level: string;
  created_at: string;
  read: boolean;
}
interface AccessCode {
  id: string;
  code: string;
  level: string;
  used: boolean;
  used_by: string;
}

const mlsLogo = "/api/assets/mls-logo.png";
const rodiLogo = "/api/assets/rodi-logo.png";
const ceceImage = "/api/assets/cece.png";
const kokoImage = "/api/assets/koko.png";
const gamaImage = "/api/assets/gama.png";
const aiyImage = "/api/assets/aiy.png";
const ganeImage = "/api/assets/gane.png";
const levelReference =
  "https://customer-assets-jai6qajn.emergentagent.net/wingman/b606a45d-f173-428d-b300-6bb114194e84/attachments/9d42367e82fc469a97b5a9b34a78d16a_image.bin";

const mascots = [
  { name: "Cece", image: ceceImage, role: "Si perangkai kata" },
  { name: "Koko", image: kokoImage, role: "Si penakluk teknik" },
  { name: "Gama", image: gamaImage, role: "Gaine · kampus squad" },
  { name: "Aiy", image: aiyImage, role: "Gaine · kampus squad" },
  { name: "Gane", image: ganeImage, role: "Gaine · kampus squad" },
];

const levels: Record<
  Level,
  {
    label: string;
    expansion: string;
    tagline: string;
    description: string;
    icon: typeof Hammer;
    color: string;
  }
> = {
  nguli: {
    label: "Nguli ⚒️",
    expansion: "Ngulik Intensif",
    tagline: "Sebelum jadi ahli, mulai dari nguli dulu.",
    description:
      "Pahami konsep dasar, latihan intensif, dan bangun otot akademik perlahan.",
    icon: Hammer,
    color: "bg-yellow-300",
  },
  mandor: {
    label: "Mandor ⛑️",
    expansion: "Aman Dong Rek!",
    tagline: "Perkuat konsep sampai terasa aman dong.",
    description:
      "Tingkatkan analisis dan hadapi variasi soal yang lebih kompleks.",
    icon: HardHat,
    color: "bg-pink-300",
  },
  supervisor: {
    label: "Supervisor 🎖️",
    expansion: "Supervisioner Kejar PTN",
    tagline: "Siap memimpin perjuangan sendiri.",
    description:
      "Strategi, simulasi, evaluasi, dan konsistensi untuk persaingan PTN.",
    icon: ShieldCheck,
    color: "bg-violet-300",
  },
};

const normalize = (value: string) =>
  value.toLowerCase().replaceAll("−", "-").replace(/\s+/g, "");
const embedYoutube = (url: string) => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([^?&/]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

function PixelButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`pixel-button ${className}`}>
      {children}
    </button>
  );
}

function MascotMessage({
  mascot,
  motivation,
  loading,
}: {
  mascot: (typeof mascots)[number];
  motivation?: Motivation;
  loading: boolean;
}) {
  return (
    <aside
      className="pixel-card flex items-center gap-4 overflow-hidden bg-yellow-200 p-4"
      data-testid="mascot-motivation-card"
    >
      <div className="mascot-frame">
        <img
          src={mascot.image}
          alt={`Maskot ${mascot.name}`}
          data-testid="active-mascot-image"
        />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p
            className="pixel-title text-base text-violet-950"
            data-testid="active-mascot-name"
          >
            {mascot.name}
          </p>
          <Badge className="bg-violet-700 text-white">{mascot.role}</Badge>
        </div>
        <p
          className="mt-2 text-sm font-semibold leading-relaxed text-violet-950"
          data-testid="mascot-motivation-text"
        >
          {loading
            ? "Sedang meracik semangat untukmu…"
            : (motivation?.message ??
              "Pelan bukan berarti berhenti. Kita lanjut satu soal lagi!")}
        </p>
      </div>
    </aside>
  );
}

function FloatingMascot({ mascot }: { mascot: (typeof mascots)[number] }) {
  return (
    <div className="floating-mascot" data-testid="floating-mascot-popup">
      <span className="floating-spark">✦</span>
      <img src={mascot.image} alt={`${mascot.name} muncul memberi semangat`} />
      <div>
        <p className="pixel-title text-xs text-violet-950">
          {mascot.name} muncul!
        </p>
        <p className="text-[10px] font-bold text-violet-700">
          Gas satu langkah lagi!
        </p>
      </div>
    </div>
  );
}

function TryoutReviewOverlay({
  detail,
  answers,
  result,
  onClose,
}: {
  detail: TryoutDetail;
  answers: Record<string, number>;
  result: TryoutResult;
  onClose: () => void;
}) {
  return (
    <div className="review-overlay" data-testid="tryout-review-modal">
      <section className="review-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-violet-950 bg-yellow-300 p-4">
          <div>
            <p className="pixel-label">HASIL AKHIR UTBABY</p>
            <p
              className="pixel-title text-3xl text-violet-950"
              data-testid="tryout-review-score"
            >
              SKOR {result.score}
            </p>
            <p className="text-xs font-black text-violet-800">
              {result.correct}/{result.total} benar · Peringkat #{result.rank}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-2 border-violet-950 bg-white"
            data-testid="close-tryout-review-button"
          >
            Tutup
          </Button>
        </div>
        <div className="space-y-5 p-5">
          {detail.questions.map((question) => {
            const chosen = answers[question.id];
            const correct = question.correct_option ?? -1;
            const isCorrect = chosen === correct;
            return (
              <article
                key={question.id}
                className={`pixel-card p-5 ${isCorrect ? "bg-emerald-50" : "bg-pink-50"}`}
                data-testid={`review-question-${question.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    className={
                      isCorrect
                        ? "bg-emerald-600 text-white"
                        : "bg-pink-600 text-white"
                    }
                  >
                    {isCorrect ? "Benar" : "Perlu diulang"}
                  </Badge>
                  <span className="font-mono text-xs font-black text-violet-700">
                    {question.chapter_label} · #{question.number}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black leading-relaxed text-violet-950">
                  {question.prompt}
                </p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <p className="rounded-lg bg-white p-3">
                    <strong>Jawabanmu:</strong>{" "}
                    {chosen === undefined
                      ? "Tidak dijawab"
                      : `${String.fromCharCode(65 + chosen)}. ${question.options[chosen]}`}
                  </p>
                  <p className="rounded-lg bg-yellow-100 p-3">
                    <strong>Jawaban benar:</strong>{" "}
                    {correct >= 0
                      ? `${String.fromCharCode(65 + correct)}. ${question.options[correct]}`
                      : "Belum ditetapkan"}
                  </p>
                </div>
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="pixel-label">LANGKAH PEMBAHASAN</p>
                  {question.steps.map((step, index) => (
                    <p
                      key={step}
                      className="mt-2 text-sm leading-relaxed text-slate-700"
                    >
                      <span className="mr-2 font-mono font-black text-violet-700">
                        {index + 1}.
                      </span>
                      {step}
                    </p>
                  ))}
                  {question.trap_tip && (
                    <p className="mt-4 rounded-lg border-2 border-pink-300 bg-pink-100 p-3 text-sm font-bold text-violet-950">
                      Jebakan UTBK: {question.trap_tip}
                    </p>
                  )}
                </div>
                {question.video_url && (
                  <div
                    className="mt-4"
                    data-testid={`review-video-${question.id}`}
                  >
                    <p className="pixel-label">VIDEO PEMBAHASAN</p>
                    <div className="aspect-video overflow-hidden rounded-xl border-4 border-violet-950">
                      <iframe
                        src={embedYoutube(question.video_url)}
                        title={`Video pembahasan soal ${question.number}`}
                        className="h-full w-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Splash({ onContinue }: { onContinue: () => void }) {
  return (
    <main
      className="pixel-world flex min-h-screen items-center justify-center overflow-hidden p-6"
      data-testid="splash-screen"
    >
      <div className="splash-stars" />
      <section className="relative z-10 max-w-xl text-center">
        <img
          src={mlsLogo}
          alt="Logo Malas Belajar"
          className="mx-auto h-48 w-64 object-contain drop-shadow-[8px_10px_0_rgba(46,16,101,.65)]"
          data-testid="splash-mls-logo"
        />
        <p className="mt-6 font-mono text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
          Welcome to
        </p>
        <h1
          className="pixel-title mt-3 text-4xl text-white sm:text-6xl"
          data-testid="splash-brand-name"
        >
          MALAS BELAJAR
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-relaxed text-violet-100">
          Tempat latihan terasa seperti game, tapi progresmu benar-benar naik.
        </p>
        <PixelButton
          onClick={onContinue}
          className="mt-8 bg-pink-400 px-8 py-4 text-violet-950"
          data-testid="splash-continue-button"
        >
          PRESS START <ChevronRight className="inline h-5 w-5" />
        </PixelButton>
      </section>
    </main>
  );
}

function StudentAccountGateway({
  user,
  onMentor,
  defaultExpanded = true,
}: {
  user: User;
  onMentor?: () => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [mode, setMode] = useState<"code" | "login" | "register">("code");
  const [selectedLevel, setSelectedLevel] = useState<Level>(user.level || "nguli");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (user.level) {
      setSelectedLevel(user.level);
    }
  }, [user.level]);

  const switchLevelMutation = useMutation({
    mutationFn: (newLevel: Level) =>
      apiPatch<User>("/auth/level", { level: newLevel }),
    onSuccess: (updatedUser) => {
      setSelectedLevel(updatedUser.level);
      queryClient.setQueryData(["session"], updatedUser);
      queryClient.invalidateQueries();
      toast.success(
        `Level belajar aktif diganti ke ${levels[updatedUser.level].label}! Seluruh loker disesuaikan.`,
      );
    },
    onError: () => toast.error("Gagal mengganti level belajar."),
  });

  const authMutation = useMutation({
    mutationFn: () => {
      if (mode === "code") {
        return apiPost<User>("/auth/register", {
          name: name.trim() || user.name || "Pejuang Belajar",
          email: email.trim() || `siswa-${Date.now().toString().slice(-4)}@malasbelajar.id`,
          password: password || "123456",
          access_code: accessCode.trim(),
          level: selectedLevel,
        });
      }
      if (mode === "register") {
        return apiPost<User>("/auth/register", {
          name: name.trim() || "Pejuang Belajar",
          email: email.trim() || "siswa@malasbelajar.id",
          password: password || "123456",
          access_code: accessCode.trim(),
          level: selectedLevel,
        });
      }
      return apiPost<User>("/auth/login", {
        email: email.trim() || "siswa@malasbelajar.id",
        password: password || "123456",
        level: selectedLevel,
      });
    },
    onSuccess: (data: User) => {
      beginSession(data.id);
      setSelectedLevel(data.level);
      queryClient.setQueryData(["session"], data);
      queryClient.invalidateQueries();
      toast.success(
        mode === "code"
          ? `Kode aktif! Selamat datang di level ${levels[data.level].label}, ${data.name}!`
          : `Selamat datang kembali, ${data.name}!`,
      );
      setAccessCode("");
    },
    onError: (err: any) =>
      toast.error(
        err?.message || "Belum bisa memproses. Periksa kembali kode atau akunmu.",
      ),
  });

  const demoMutation = useMutation({
    mutationFn: (lvl: Level) =>
      apiPost<User>("/auth/demo", { level: lvl }),
    onSuccess: (data: User) => {
      beginSession(data.id);
      setSelectedLevel(data.level);
      queryClient.setQueryData(["session"], data);
      queryClient.invalidateQueries();
      toast.success(`Beralih ke akun demo level ${levels[data.level].label}!`);
    },
    onError: () => toast.error("Gagal masuk mode demo."),
  });

  const sampleCodes = [
    { code: "MLS-NGU-2026", level: "nguli" as Level, label: "Kuli (Gratis)" },
    { code: "MLS-MAN-2026", level: "mandor" as Level, label: "Mandor (Drill)" },
    { code: "MLS-SPV-2026", level: "supervisor" as Level, label: "Supervisor (VIP)" },
  ];

  return (
    <section
      id="student-account-gateway"
      className="rounded-2xl border-4 border-violet-950 bg-violet-900/95 p-4 sm:p-6 shadow-[8px_8px_0_#2e1065] text-white"
      data-testid="student-gateway"
    >
      {/* Header Panel Terpadu */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-violet-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-violet-950 bg-yellow-300 text-violet-950 font-black text-sm shadow-[2px_2px_0_#2e1065]">
              ⚡
            </span>
            <h2 className="pixel-title text-xl text-yellow-300 sm:text-2xl">
              PORTAL SISWA & KONTROL LEVEL
            </h2>
          </div>
          <p className="mt-1 text-xs text-violet-200">
            Pilih level belajar, aktivasi kode unik, atau login langsung di sini — isi loker di bawah otomatis sinkron!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border-2 border-violet-950 bg-violet-950/80 px-3 py-1.5 font-mono text-xs">
            <span className="text-violet-300">Siswa: </span>
            <span className="font-bold text-yellow-300">{user.name}</span>
            <span className="mx-1 text-violet-400">·</span>
            <span className="font-black text-pink-400 uppercase">{levels[user.level].label}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-2 border-violet-950 bg-yellow-300 text-violet-950 font-mono text-xs font-black hover:bg-yellow-400"
            data-testid="toggle-gateway-button"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
                <span>Lipat Panel</span>
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
                <span>Buka Form & Kode</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Kolom Kiri: 3 Kartu Level Belajar */}
          <div>
            <div className="flex items-center justify-between">
              <span className="pixel-label text-yellow-300">
                LANGKAH 1: PILIH LEVEL BELAJARMU
              </span>
              <span className="font-mono text-[10px] text-violet-300">
                (Klik kartu untuk ganti materi seketika)
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              {Object.entries(levels).map(([key, level]) => {
                const Icon = level.icon;
                const isCurrentActive = user.level === key;
                const isFormSelected = selectedLevel === key;

                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedLevel(key as Level);
                      if (user.level !== key) {
                        switchLevelMutation.mutate(key as Level);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border-4 border-violet-950 p-4 transition ${
                      isCurrentActive
                        ? `${level.color} text-violet-950 shadow-[4px_4px_0_#2e1065] scale-[1.01]`
                        : isFormSelected
                          ? "bg-violet-800/90 text-white shadow-[2px_2px_0_#2e1065]"
                          : "bg-violet-950/60 text-violet-200 hover:bg-violet-800/60"
                    }`}
                    data-testid={`level-card-${key}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-violet-950 bg-white p-2 shadow-[2px_2px_0_#2e1065]">
                          <Icon className="h-6 w-6 text-violet-950" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="pixel-title text-base">
                              {level.label}
                            </h3>
                            <span className="font-mono text-[11px] font-bold opacity-85">
                              · {level.expansion}
                            </span>
                          </div>
                          <p className="text-xs font-semibold opacity-90">
                            {level.description}
                          </p>
                        </div>
                      </div>

                      {isCurrentActive ? (
                        <span className="rounded-md border-2 border-violet-950 bg-violet-950 px-2 py-0.5 font-mono text-[10px] font-black text-yellow-300">
                          SEDANG AKTIF
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={switchLevelMutation.isPending}
                          className="rounded-md border border-violet-950 bg-yellow-300 px-2 py-1 font-mono text-[10px] font-black text-violet-950 hover:bg-yellow-400"
                        >
                          PILIH
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-violet-950/20 pt-2 text-[11px]">
                      <span className="rounded bg-black/10 px-2 py-0.5 font-mono font-bold">
                        Target: {level.expansion}
                      </span>
                      <span className="font-semibold italic opacity-85">
                        "{level.tagline}"
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kolom Kanan: Form Kode Akses / Login / Daftar */}
          <div className="rounded-xl border-4 border-violet-950 bg-white p-4 sm:p-5 text-violet-950 shadow-[4px_4px_0_#2e1065]">
            {/* Tab Mode */}
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border-2 border-violet-950 bg-violet-100 p-1">
              <button
                type="button"
                onClick={() => setMode("code")}
                className={`rounded py-1.5 font-mono text-xs font-black uppercase transition ${
                  mode === "code"
                    ? "border-2 border-violet-950 bg-yellow-300 text-violet-950 shadow-[2px_2px_0_#2e1065]"
                    : "text-violet-700 hover:text-violet-950"
                }`}
                data-testid="tab-code-button"
              >
                ⚡ KODE
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded py-1.5 font-mono text-xs font-black uppercase transition ${
                  mode === "login"
                    ? "border-2 border-violet-950 bg-yellow-300 text-violet-950 shadow-[2px_2px_0_#2e1065]"
                    : "text-violet-700 hover:text-violet-950"
                }`}
                data-testid="tab-login-button"
              >
                🔑 LOGIN
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded py-1.5 font-mono text-xs font-black uppercase transition ${
                  mode === "register"
                    ? "border-2 border-violet-950 bg-yellow-300 text-violet-950 shadow-[2px_2px_0_#2e1065]"
                    : "text-violet-700 hover:text-violet-950"
                }`}
                data-testid="tab-register-button"
              >
                📝 DAFTAR
              </button>
            </div>

            <div className="mt-4">
              <h3 className="pixel-title text-lg text-violet-950">
                {mode === "code"
                  ? "AKTIVASI KODE AKSES SISWA"
                  : mode === "login"
                    ? "MASUK KE AKUN SISWA"
                    : "BUAT AKUN BARU"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {mode === "code"
                  ? "Punya kode unik dari bimbel atau mentor? Masukkan untuk buka level secara instan."
                  : mode === "login"
                    ? "Masuk dengan email & password untuk melanjutkan progres belajarmu."
                    : "Daftar akun siswa baru untuk menyimpan skor Try Out dan riwayat drill."}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                authMutation.mutate();
              }}
              className="mt-4 space-y-3"
            >
              {/* Form Input Sesuai Mode */}
              {mode === "code" && (
                <div>
                  <label className="pixel-label block mb-1">
                    Kode Unik Siswa:
                  </label>
                  <Input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: MLS-MAN-2026"
                    className="font-mono uppercase font-black tracking-wider text-base border-2 border-violet-950"
                    data-testid="access-code-input"
                  />

                  {/* Contoh Kode Cepat 1-Klik */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">
                      Coba kode:
                    </span>
                    {sampleCodes.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          setAccessCode(s.code);
                          setSelectedLevel(s.level);
                        }}
                        className="rounded border border-violet-950 bg-yellow-100 px-2 py-0.5 font-mono text-[10px] font-black text-violet-950 hover:bg-yellow-200"
                        data-testid={`sample-code-${s.level}`}
                      >
                        {s.code} ({s.label})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "register" && (
                <>
                  <div>
                    <label className="pixel-label block mb-1">
                      Nama Lengkap Siswa:
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Rian Pratama"
                      className="border-2 border-violet-950"
                      data-testid="register-name-input"
                    />
                  </div>
                  <div>
                    <label className="pixel-label block mb-1">
                      Kode Akses (Opsional):
                    </label>
                    <Input
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="MLS-NGU-2026 atau kosongkan"
                      className="font-mono uppercase border-2 border-violet-950"
                      data-testid="register-access-code-input"
                    />
                  </div>
                </>
              )}

              {(mode === "login" || mode === "register") && (
                <>
                  <div>
                    <label className="pixel-label block mb-1">
                      Alamat Email:
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="siswa@malasbelajar.id"
                      className="border-2 border-violet-950"
                      data-testid="auth-email-input"
                    />
                  </div>
                  <div>
                    <label className="pixel-label block mb-1">
                      Kata Sandi:
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="border-2 border-violet-950"
                      data-testid="auth-password-input"
                    />
                  </div>
                </>
              )}

              <PixelButton
                type="submit"
                disabled={authMutation.isPending}
                className="w-full bg-yellow-300 py-3 text-violet-950 font-black shadow-[4px_4px_0_#2e1065] hover:bg-yellow-400"
                data-testid="auth-submit-button"
              >
                {authMutation.isPending ? (
                  "MEMPROSES..."
                ) : mode === "code" ? (
                  "⚡ AKTIFKAN KODE & NAIK LEVEL"
                ) : mode === "login" ? (
                  "MASUK KE AKUN SISWA"
                ) : (
                  "DAFTAR & MULAI BELAJAR"
                )}
              </PixelButton>
            </form>

            {/* Mode Coba Cepat 1-Klik */}
            <div className="mt-4 border-t-2 border-dashed border-slate-200 pt-3">
              <p className="text-center font-mono text-[11px] font-bold text-slate-500">
                ATAU COBA CEPAT (DEMO 1-KLIK):
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("nguli")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-yellow-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-yellow-300"
                  data-testid="demo-login-nguli"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Kuli</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("mandor")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-cyan-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-cyan-300"
                  data-testid="demo-login-mandor"
                >
                  <HardHat className="h-3.5 w-3.5" />
                  <span>Mandor</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("supervisor")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-pink-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-pink-300"
                  data-testid="demo-login-spv"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Supervisor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-violet-950/50 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-yellow-300">Level Aktif:</span>
            <span className="rounded bg-pink-500 px-2 py-0.5 font-mono font-bold uppercase text-white">
              {levels[user.level].label} ({levels[user.level].expansion})
            </span>
            <span className="text-violet-300 italic">— {levels[user.level].tagline}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="font-mono text-yellow-300 underline hover:text-yellow-200"
          >
            Buka kontrol level & aktivasi kode →
          </button>
        </div>
      )}
    </section>
  );
}

function AuthPortal({ onMentor }: { onMentor: () => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [selectedLevel, setSelectedLevel] = useState<Level>("nguli");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const queryClient = useQueryClient();
  const authMutation = useMutation({
    mutationFn: () =>
      mode === "register"
        ? apiPost<User>("/auth/register", {
            name: name.trim() || "Siswa Pejuang",
            email: email.trim() || "siswa@malasbelajar.id",
            password: password || "123456",
            access_code: accessCode,
            level: selectedLevel,
          })
        : apiPost<User>("/auth/login", {
            email: email.trim() || "siswa@malasbelajar.id",
            password: password || "123456",
            level: selectedLevel,
          }),
    onSuccess: (data: User) => {
      beginSession(data.id);
      queryClient.setQueryData(["session"], data);
      queryClient.invalidateQueries();
      toast.success(`Selamat datang, ${data.name}!`);
    },
    onError: (err: any) =>
      toast.error(
        err?.message || "Belum bisa masuk. Periksa email, sandi, atau levelmu.",
      ),
  });

  const demoMutation = useMutation({
    mutationFn: (lvl: Level) =>
      apiPost<User>("/auth/demo", { level: lvl }),
    onSuccess: (data: User) => {
      beginSession(data.id);
      queryClient.setQueryData(["session"], data);
      queryClient.invalidateQueries();
      toast.success(`Masuk sebagai siswa level ${levels[data.level].label}!`);
    },
    onError: () => toast.error("Gagal masuk mode demo."),
  });

  return (
    <main
      className="pixel-world min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      data-testid="auth-portal"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={mlsLogo}
              alt="Malas Belajar"
              className="h-14 w-20 rounded-xl border-2 border-violet-950 bg-yellow-300 object-contain shadow-[2px_2px_0_#2e1065]"
            />
            <div>
              <p className="pixel-title text-lg text-white">MALAS BELAJAR</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-300">
                member gateway · snbt 2026
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={onMentor}
            className="border-2 border-violet-950 bg-yellow-300 text-violet-950 font-bold hover:bg-yellow-400"
            data-testid="open-mentor-from-auth-button"
          >
            <UserRoundCog className="mr-2 h-4 w-4" />
            Masuk Mentor
          </Button>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          {/* Sisi Kiri: Pilihan Level */}
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-pink-400 bg-pink-900/60 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-pink-300">
              <span>⚡</span> Langkah 1: Pilih Level Belajarmu
            </div>
            <h1 className="pixel-title mt-3 max-w-3xl text-2xl leading-tight text-white sm:text-4xl">
              DARI NGULI SAMPAI SIAP TEMBUS PTN IMPIAN.
            </h1>
            <p className="mt-2 text-sm text-violet-200">
              Klik salah satu level di bawah ini untuk memilih kurikulum dan bank soal yang ingin kamu kuasai:
            </p>

            <div className="mt-5 grid gap-3">
              {Object.entries(levels).map(([key, level]) => {
                const Icon = level.icon;
                const isSelected = selectedLevel === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedLevel(key as Level)}
                    className={`pixel-card relative flex items-start gap-4 p-4 text-left transition ${
                      isSelected
                        ? `${level.color} ring-4 ring-yellow-400 scale-[1.01]`
                        : "bg-white hover:bg-violet-50"
                    }`}
                    data-testid={`level-card-${key}`}
                  >
                    <div className="rounded-lg border-2 border-violet-950 bg-white p-2.5 shadow-[2px_2px_0_#2e1065]">
                      <Icon className="h-6 w-6 text-violet-950" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="pixel-title text-sm text-violet-950">
                          {level.label} · {level.expansion}
                        </p>
                        {isSelected && (
                          <span className="rounded-md border-2 border-violet-950 bg-violet-950 px-2 py-0.5 font-mono text-[10px] font-black text-yellow-300">
                            TERPILIH
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-violet-900">
                        {level.description}
                      </p>
                      <p className="mt-2 text-xs italic text-violet-700">
                        “{level.tagline}”
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <img
              src={levelReference}
              alt="Referensi level Malas Belajar"
              className="mt-5 h-28 w-full rounded-2xl border-4 border-violet-950 object-cover opacity-85 shadow-[4px_4px_0_#2e1065]"
            />
          </section>

          {/* Sisi Kanan: Form Akun (Daftar / Login) */}
          <Card className="pixel-card self-start border-4 border-violet-950 bg-white">
            <CardHeader className="pb-3">
              {/* Tab Mode: Buat Akun vs Login */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border-2 border-violet-950 bg-violet-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-lg py-2 font-mono text-xs font-black uppercase transition ${
                    mode === "register"
                      ? "border-2 border-violet-950 bg-yellow-300 text-violet-950 shadow-[2px_2px_0_#2e1065]"
                      : "text-violet-700 hover:text-violet-950"
                  }`}
                  data-testid="tab-register-button"
                >
                  📝 BUAT AKUN (KODE)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-lg py-2 font-mono text-xs font-black uppercase transition ${
                    mode === "login"
                      ? "border-2 border-violet-950 bg-yellow-300 text-violet-950 shadow-[2px_2px_0_#2e1065]"
                      : "text-violet-700 hover:text-violet-950"
                  }`}
                  data-testid="tab-login-button"
                >
                  🔑 LOGIN SISWA
                </button>
              </div>

              <div className="mt-3">
                <CardTitle className="pixel-title text-xl text-violet-950">
                  {mode === "register"
                    ? "DAFTAR & AKTIFKAN AKUN"
                    : "MASUK AKUN SISWA"}
                </CardTitle>
                <p className="mt-1 text-xs text-slate-600">
                  {mode === "register"
                    ? "Daftar dengan kode unik siswa atau pilih level untuk coba gratis."
                    : "Pilih level belajarmu dan masukkan akun untuk melanjutkan."}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selector Level di dalam Form */}
              <div>
                <label className="pixel-label block mb-1">
                  Level Belajar yang Dipilih:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(levels) as Level[]).map((lvl) => {
                    const l = levels[lvl];
                    const Icon = l.icon;
                    const active = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-violet-950 p-2 text-center transition ${
                          active
                            ? `${l.color} shadow-[2px_2px_0_#2e1065] font-black scale-[1.02]`
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                        data-testid={`form-level-toggle-${lvl}`}
                      >
                        <Icon className="h-4 w-4 mb-1 text-violet-950" />
                        <span className="text-[11px] font-bold text-violet-950 leading-tight">
                          {l.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label className="pixel-label" htmlFor="register-name">
                    Nama Lengkap Siswa
                  </label>
                  <Input
                    id="register-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Rian Pratama"
                    data-testid="register-name-input"
                  />
                </div>
              )}

              <div>
                <label className="pixel-label" htmlFor="auth-email">
                  Alamat Email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="siswa@gmail.com"
                  data-testid="auth-email-input"
                />
              </div>

              <div>
                <label className="pixel-label" htmlFor="auth-password">
                  Kata Sandi
                </label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  data-testid="auth-password-input"
                />
              </div>

              {mode === "register" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="pixel-label" htmlFor="access-code">
                      Kode Unik Siswa (Opsional)
                    </label>
                    <span className="text-[10px] font-bold text-violet-600">
                      Auto-Deteksi Level
                    </span>
                  </div>
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(event) =>
                      setAccessCode(event.target.value.toUpperCase())
                    }
                    placeholder="MLS-NGU-2026 atau kosongkan"
                    className="font-mono text-sm tracking-wider uppercase"
                    data-testid="student-access-code-input"
                  />
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                    <span className="text-slate-500 font-semibold py-0.5">
                      Pilihan Kode Contoh:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAccessCode("MLS-NGU-2026");
                        setSelectedLevel("nguli");
                      }}
                      className="rounded border border-violet-950 bg-yellow-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-900 hover:bg-yellow-200"
                    >
                      MLS-NGU-2026 (Nguli)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccessCode("MLS-MAN-2026");
                        setSelectedLevel("mandor");
                      }}
                      className="rounded border border-violet-950 bg-cyan-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-900 hover:bg-cyan-200"
                    >
                      MLS-MAN-2026 (Mandor)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccessCode("MLS-SPV-2026");
                        setSelectedLevel("supervisor");
                      }}
                      className="rounded border border-violet-950 bg-pink-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-900 hover:bg-pink-200"
                    >
                      MLS-SPV-2026 (Supervisor)
                    </button>
                  </div>
                </div>
              )}

              <PixelButton
                onClick={() => authMutation.mutate()}
                disabled={authMutation.isPending}
                className="w-full bg-yellow-300 px-5 py-3 text-violet-950 font-black shadow-[3px_3px_0_#2e1065]"
                data-testid="auth-submit-button"
              >
                {authMutation.isPending
                  ? "MEMPROSES…"
                  : mode === "register"
                    ? `DAFTAR AKUN ${levels[selectedLevel].label.toUpperCase()}`
                    : `MASUK SEBAGAI ${levels[selectedLevel].label.toUpperCase()}`}
              </PixelButton>

              {/* Pembatas Masuk Cepat */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-slate-300" />
                </div>
                <span className="relative bg-white px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ATAU MASUK INSTAN (DEMO)
                </span>
              </div>

              {/* 3 Tombol Masuk Sekali Klik per Level */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("nguli")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-yellow-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-yellow-300"
                  data-testid="demo-login-nguli"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Kuli (Nguli)</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("mandor")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-cyan-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-cyan-300"
                  data-testid="demo-login-mandor"
                >
                  <HardHat className="h-3.5 w-3.5" />
                  <span>Mandor</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoMutation.mutate("supervisor")}
                  disabled={demoMutation.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-violet-950 bg-pink-200 p-2 font-mono text-xs font-bold text-violet-950 shadow-[2px_2px_0_#2e1065] hover:bg-pink-300"
                  data-testid="demo-login-spv"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Supervisor</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setMode(mode === "register" ? "login" : "register")
                  }
                  className="text-xs font-bold text-violet-700 underline hover:text-violet-950"
                  data-testid="toggle-auth-mode-button"
                >
                  {mode === "register"
                    ? "Sudah punya akun? Klik di sini untuk Login Siswa"
                    : "Belum punya akun? Buat akun baru dengan atau tanpa kode"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function AppHeader({
  user,
  view,
  onView,
  notifications,
  notificationOpen,
  setNotificationOpen,
}: {
  user: User;
  view: View;
  onView: (view: View) => void;
  notifications: Notification[];
  notificationOpen: boolean;
  setNotificationOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;
  const [floatingMascot, setFloatingMascot] = useState<
    (typeof mascots)[number] | null
  >(null);

  const switchLevelMutation = useMutation({
    mutationFn: (newLevel: Level) =>
      apiPatch<User>("/auth/level", { level: newLevel }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["session"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["subtests"] });
      queryClient.invalidateQueries({ queryKey: ["rodi-module"] });
      queryClient.invalidateQueries({ queryKey: ["wacawaci"] });
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      queryClient.invalidateQueries({ queryKey: ["utbaby-sessions"] });
      toast.success(
        `Level belajar aktif diganti ke ${levels[updatedUser.level].label}!`,
      );
      setLevelMenuOpen(false);
    },
    onError: () => toast.error("Gagal mengganti level belajar."),
  });

  useEffect(() => {
    let hideTimer: number | undefined;
    const showMascot = () => {
      setFloatingMascot(mascots[Math.floor(Math.random() * mascots.length)]);
      hideTimer = window.setTimeout(() => setFloatingMascot(null), 4200);
    };
    const firstTimer = window.setTimeout(showMascot, 2600);
    const interval = window.setInterval(showMascot, 11_000);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [user.id]);
  return (
    <header
      className="sticky top-0 z-50 border-b-4 border-violet-950 bg-yellow-300"
      data-testid="app-header"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {view !== "dashboard" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView("dashboard")}
              className="border-2 border-violet-950 bg-pink-300"
              data-testid="global-back-button"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Kembali
            </Button>
          )}
          <button
            type="button"
            onClick={() => onView("dashboard")}
            className="flex items-center gap-2"
            data-testid="home-brand-button"
          >
            <img
              src={mlsLogo}
              alt="Logo Malas Belajar"
              className="h-11 w-14 object-contain drop-shadow-sm"
            />
            <div className="hidden text-left sm:block">
              <p className="pixel-title text-sm text-violet-950">
                MALAS BELAJAR
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-violet-700">
                {levels[user.level].label}
              </p>
            </div>
          </button>

          {/* Tombol Interaktif Ganti Level */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLevelMenuOpen(!levelMenuOpen)}
              className={`flex items-center gap-1.5 rounded-lg border-2 border-violet-950 px-2 py-1 font-mono text-[11px] font-black uppercase shadow-[2px_2px_0_#2e1065] transition hover:brightness-95 ${levels[user.level].color} text-violet-950`}
              data-testid="header-level-badge"
              title="Klik untuk memilih atau mengganti level belajar"
            >
              <span>{levels[user.level].label}</span>
              <span className="text-[9px]">▼</span>
            </button>

            {levelMenuOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-56 rounded-xl border-4 border-violet-950 bg-white p-2 shadow-[4px_4px_0_#2e1065]">
                <p className="px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Ganti Level Belajar:
                </p>
                <div className="grid gap-1.5 mt-1">
                  {(Object.keys(levels) as Level[]).map((lvl) => {
                    const l = levels[lvl];
                    const Icon = l.icon;
                    const isCurrent = user.level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => switchLevelMutation.mutate(lvl)}
                        disabled={switchLevelMutation.isPending}
                        className={`flex items-center justify-between rounded-lg border-2 border-violet-950 p-2 text-left text-xs font-bold transition ${
                          isCurrent
                            ? "bg-violet-950 text-white"
                            : `${l.color} text-violet-950 hover:brightness-95`
                        }`}
                        data-testid={`switch-level-to-${lvl}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{l.label}</span>
                        </div>
                        {isCurrent && (
                          <Check className="h-3.5 w-3.5 text-yellow-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <nav className="hidden items-center gap-2 lg:flex">
          {(["rodi", "wacawaci", "live", "utbaby"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onView(item)}
              className={`rounded-md border-2 border-violet-950 px-3 py-2 font-mono text-xs font-black uppercase ${view === item ? "bg-violet-800 text-white" : "bg-white text-violet-950"}`}
              data-testid={`header-nav-${item}`}
            >
              {item === "live" ? "Live Class" : item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative border-2 border-violet-950 bg-white"
            data-testid="notification-button"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView("mentor")}
            className="border-2 border-violet-950 bg-white"
            data-testid="mentor-panel-button"
          >
            <UserRoundCog className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Mentor</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => endSession("/")}
            className="border-2 border-violet-950 bg-white"
            data-testid="logout-button"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {notificationOpen && (
        <div
          className="absolute right-4 top-[72px] z-50 max-h-[70vh] w-[min(390px,calc(100vw-32px))] overflow-y-auto border-4 border-violet-950 bg-white p-4 shadow-[8px_8px_0_#2e1065]"
          data-testid="notification-panel"
        >
          <div className="flex items-center justify-between">
            <p className="pixel-title text-sm text-violet-950">NOTIFIKASI</p>
            <Badge>{unread} baru</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {notifications.length ? (
              notifications.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border-2 border-violet-200 bg-violet-50 p-3"
                  data-testid={`notification-item-${item.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-violet-950">
                      {item.title}
                    </p>
                    <span className="font-mono text-[9px] uppercase text-pink-600">
                      {item.kind}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {item.message}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Belum ada notifikasi baru.
              </p>
            )}
          </div>
        </div>
      )}
      {floatingMascot && <FloatingMascot mascot={floatingMascot} />}
    </header>
  );
}

function Dashboard({
  user,
  onOpen,
  onMentor,
}: {
  user: User;
  onOpen: (view: View) => void;
  onMentor?: () => void;
}) {
  const queryClient = useQueryClient();
  const switchLevelMutation = useMutation({
    mutationFn: (newLevel: Level) =>
      apiPatch<User>("/auth/level", { level: newLevel }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["session"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["subtests"] });
      queryClient.invalidateQueries({ queryKey: ["rodi-module"] });
      queryClient.invalidateQueries({ queryKey: ["wacawaci"] });
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      queryClient.invalidateQueries({ queryKey: ["utbaby-sessions"] });
      toast.success(
        `Level belajar aktif diganti ke ${levels[updatedUser.level].label}!`,
      );
    },
    onError: () => toast.error("Gagal mengganti level belajar."),
  });

  const lockers = [
    {
      id: "rodi" as View,
      title: "RODI",
      subtitle: "Routine Drilling",
      description: "7 loker subtes, peta belajar, dan latihan bertingkat.",
      color: "bg-yellow-300",
      image: rodiLogo,
      icon: BookOpen,
    },
    {
      id: "wacawaci" as View,
      title: "WACAWACI",
      subtitle: "Video & Modul",
      description: "Loker materi pilihan mentor sesuai levelmu.",
      color: "bg-pink-300",
      image: ceceImage,
      icon: FileText,
    },
    {
      id: "live" as View,
      title: "LIVE CLASS",
      subtitle: "Belajar Bareng",
      description: "Jadwal live, pengingat 30 menit, dan rekaman kelas.",
      color: "bg-cyan-300",
      image: mlsLogo,
      icon: Video,
    },
    {
      id: "utbaby" as View,
      title: "UTBABY",
      subtitle: "Try Out IRT",
      description: "Simulasi 7 subtes, skor 1000, dan ranking global.",
      color: "bg-violet-300",
      image: ganeImage,
      icon: Trophy,
    },
  ];
  return (
    <main
      className="pixel-dashboard min-h-[calc(100vh-72px)] px-5 py-10"
      data-testid="student-dashboard"
    >
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-pink-500 text-white font-mono text-xs shadow-[2px_2px_0_#2e1065]">
                LEVEL {levels[user.level].label.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1.5 rounded-lg border-2 border-violet-950 bg-violet-900/60 p-1">
                <span className="px-1 text-[10px] font-bold uppercase text-yellow-300">
                  Ganti Level:
                </span>
                {(Object.keys(levels) as Level[]).map((lvl) => {
                  const isCurrent = user.level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => switchLevelMutation.mutate(lvl)}
                      disabled={switchLevelMutation.isPending}
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-black uppercase transition ${
                        isCurrent
                          ? "border border-violet-950 bg-yellow-300 text-violet-950 shadow-[1px_1px_0_#2e1065]"
                          : "text-violet-200 hover:bg-violet-800 hover:text-white"
                      }`}
                      data-testid={`dashboard-switch-${lvl}`}
                    >
                      {levels[lvl].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <h1
              className="pixel-title mt-4 max-w-4xl text-3xl leading-tight text-white sm:text-5xl"
              data-testid="dashboard-welcome-title"
            >
              HAI, {user.name.toUpperCase()}!<br />
              <span className="text-yellow-300">PILIH LOKER HARI INI.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-violet-100">
              Kontenmu dipersonalisasi untuk level{" "}
              <strong>{levels[user.level].expansion}</strong>. Sedikit demi
              sedikit, konsisten sampai PTN.
            </p>
          </div>
          <div className="relative hidden h-56 lg:block">
            <img
              src={aiyImage}
              alt="Aiy siap menemani belajar"
              className="mascot-hero absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 object-contain"
            />
            <span className="absolute right-10 top-4 rotate-6 rounded-lg border-2 border-violet-950 bg-yellow-300 px-3 py-2 font-mono text-xs font-black text-violet-950 shadow-[4px_4px_0_#2e1065]">
              GAINE SIAP!
            </span>
          </div>
        </section>

        {/* Portal Akun Siswa & Pemilih Level Terpadu (Menyatu dengan Dashboard) */}
        <div className="mt-8">
          <StudentAccountGateway
            user={user}
            onMentor={onMentor}
            defaultExpanded={true}
          />
        </div>

        <section
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="main-locker-grid"
        >
          {lockers.map((locker, index) => {
            const Icon = locker.icon;
            return (
              <button
                type="button"
                key={locker.id}
                onClick={() => onOpen(locker.id)}
                className={`locker-card ${locker.color}`}
                data-testid={`locker-${locker.id}-button`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-black text-violet-800">
                    0{index + 1}
                  </span>
                  <Icon className="h-6 w-6 text-violet-950" />
                </div>
                <img
                  src={locker.image}
                  alt={locker.title}
                  className="mx-auto my-4 h-28 w-full object-contain drop-shadow-md"
                />
                <p className="pixel-title text-xl text-violet-950">
                  {locker.title}
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-violet-700">
                  {locker.subtitle}
                </p>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-violet-950">
                  {locker.description}
                </p>
                <span className="mt-5 inline-flex items-center text-xs font-black uppercase text-violet-950">
                  Buka loker <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [splash, setSplash] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mascot, setMascot] = useState(mascots[0]);
  const [activeChapter, setActiveChapter] = useState("bab-1");
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [solutions, setSolutions] = useState<Record<string, boolean>>({});
  const [resourceKind, setResourceKind] = useState("video");
  const [selectedSession, setSelectedSession] = useState("utbaby-demo-2026");
  const [tryoutAnswers, setTryoutAnswers] = useState<Record<string, number>>(
    {},
  );
  const [tryoutResult, setTryoutResult] = useState<TryoutResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mentorCode, setMentorCode] = useState("");
  const [mentorUnlocked, setMentorUnlocked] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<AccessCode[]>([]);
  const [codeLevel, setCodeLevel] = useState<Level>("nguli");
  const [adminTab, setAdminTab] = useState("students");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionOptions, setQuestionOptions] = useState(
    "Opsi A\nOpsi B\nOpsi C\nOpsi D\nOpsi E",
  );
  const [tryoutTitle, setTryoutTitle] = useState("UTBABY Batch Baru");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [liveStarts, setLiveStarts] = useState("");
  const [mapSubtest, setMapSubtest] = useState("pu");
  const [mapDescription, setMapDescription] = useState("");
  const [explanationQuestionId, setExplanationQuestionId] =
    useState("utbaby-demo-1");
  const [explanationCorrect, setExplanationCorrect] = useState("1");
  const [explanationSteps, setExplanationSteps] = useState(
    "Identifikasi inti stimulus.\nEliminasi opsi yang tidak didukung.\nVerifikasi pilihan dengan informasi soal.",
  );
  const [explanationTrap, setExplanationTrap] = useState("");
  const [explanationVideo, setExplanationVideo] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiGet<User | null>("/auth/me"),
    retry: false,
  });
  const user = sessionQuery.data ?? undefined;
  const subtestsQuery = useQuery({
    queryKey: ["subtests", user?.level],
    queryFn: () => apiGet<SubtestResponse>("/subtests"),
    enabled: Boolean(user && view === "rodi"),
    retry: false,
  });
  const moduleQuery = useQuery({
    queryKey: ["rodi-module", user?.level],
    queryFn: () => apiGet<ModuleResponse>("/rodi/module"),
    enabled: Boolean(user && view === "rodi"),
    retry: false,
  });
  const resourcesQuery = useQuery({
    queryKey: ["wacawaci", user?.level],
    queryFn: () => apiGet<Resource[]>("/wacawaci/resources"),
    enabled: Boolean(user && view === "wacawaci"),
    retry: false,
  });
  const liveQuery = useQuery({
    queryKey: ["live-classes", user?.level],
    queryFn: () => apiGet<LiveClass[]>("/live-classes"),
    enabled: Boolean(user && view === "live"),
    retry: false,
  });
  const sessionsQuery = useQuery({
    queryKey: ["utbaby-sessions", user?.level],
    queryFn: () => apiGet<TryoutSummary[]>("/utbaby/sessions"),
    enabled: Boolean(user && view === "utbaby"),
    retry: false,
  });
  const tryoutQuery = useQuery({
    queryKey: ["utbaby-detail", selectedSession],
    queryFn: () => apiGet<TryoutDetail>(`/utbaby/sessions/${selectedSession}`),
    enabled: Boolean(user && view === "utbaby" && selectedSession),
    retry: false,
  });
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", selectedSession],
    queryFn: () =>
      apiGet<LeaderboardEntry[]>(
        `/utbaby/leaderboard?session_id=${selectedSession}`,
      ),
    enabled: Boolean(user && view === "utbaby"),
    retry: false,
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => apiGet<Notification[]>("/notifications"),
    enabled: Boolean(user),
    refetchInterval: 60_000,
    retry: false,
  });
  const studentsQuery = useQuery({
    queryKey: ["mentor-students", mentorCode],
    queryFn: () =>
      apiGet<User[]>(
        `/admin/students?mentor_code=${encodeURIComponent(mentorCode)}`,
      ),
    enabled: mentorUnlocked,
    retry: false,
  });

  const motivationMutation = useMutation({
    mutationFn: (payload: {
      mascot: string;
      context: string;
      subtest: string;
    }) => apiPost<Motivation>("/motivation", payload),
  });
  const submitTryoutMutation = useMutation({
    mutationFn: () =>
      apiPost<TryoutResult>(`/utbaby/sessions/${selectedSession}/submit`, {
        participant: user?.name ?? "Siswa MLS",
        answers: tryoutAnswers,
      }),
    onSuccess: (result) => {
      setTryoutResult(result);
      setReviewOpen(true);
      queryClient.invalidateQueries({
        queryKey: ["leaderboard", selectedSession],
      });
      toast.success(`Skor IRT-like kamu ${result.score}!`);
    },
  });
  const verifyMentorMutation = useMutation({
    mutationFn: () =>
      apiPost<{ verified: boolean }>("/mentor/verify", { code: mentorCode }),
    onSuccess: () => {
      setMentorUnlocked(true);
      toast.success("Panel mentor aktif.");
    },
    onError: () => toast.error("Kode mentor tidak cocok."),
  });
  const codeMutation = useMutation({
    mutationFn: () =>
      apiPost<AccessCode[]>("/admin/access-codes", {
        mentor_code: mentorCode,
        level: codeLevel,
        count: 3,
      }),
    onSuccess: (codes) => {
      setGeneratedCodes(codes);
      toast.success("Tiga kode unik berhasil dibuat.");
    },
  });
  const studentMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiPatch<User>(`/admin/students/${id}`, {
        mentor_code: mentorCode,
        active,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["mentor-students", mentorCode],
      }),
  });
  const questionMutation = useMutation({
    mutationFn: () =>
      apiPost<Question>("/admin/questions", {
        mentor_code: mentorCode,
        subtest: mapSubtest,
        prompt: questionPrompt,
        options: questionOptions.split("\n").filter(Boolean).slice(0, 5),
        correct_option: 0,
        steps: [
          "Pembahasan mentor: evaluasi stimulus dan pilih opsi paling tepat.",
        ],
        difficulty: "Aplikasi",
        irt_difficulty: 0,
        irt_discrimination: 1,
        level: codeLevel,
      }),
    onSuccess: () => {
      toast.success("Soal baru masuk ke RODI.");
      setQuestionPrompt("");
    },
  });
  const tryoutCreateMutation = useMutation({
    mutationFn: () =>
      apiPost<TryoutSummary>("/utbaby/sessions", {
        mentor_code: mentorCode,
        title: tryoutTitle,
        description: "Try out buatan mentor untuk kelas aktif.",
        duration_minutes: 195,
        question_ids: [],
        level: codeLevel,
      }),
    onSuccess: () => {
      toast.success("Try out UTBABY berhasil dibuat.");
      queryClient.invalidateQueries({ queryKey: ["utbaby-sessions"] });
    },
  });
  const resourceMutation = useMutation({
    mutationFn: async () => {
      if (resourceFile) {
        const form = new FormData();
        form.append("file", resourceFile);
        return apiUpload<Resource>(
          `/wacawaci/upload?mentor_code=${encodeURIComponent(mentorCode)}&kind=${resourceKind}&title=${encodeURIComponent(resourceTitle)}&description=${encodeURIComponent(resourceDescription)}&level=${codeLevel}`,
          form,
        );
      }
      return apiPost<Resource>("/wacawaci/resources", {
        mentor_code: mentorCode,
        kind: resourceKind,
        title: resourceTitle,
        description: resourceDescription,
        url: resourceUrl,
        is_public: true,
        level: codeLevel,
      });
    },
    onSuccess: () => {
      toast.success("Konten Wacawaci dipublikasikan dan notifikasi dibuat.");
      setResourceTitle("");
      setResourceFile(null);
    },
  });
  const liveMutation = useMutation({
    mutationFn: () =>
      apiPost<LiveClass>("/live-classes", {
        mentor_code: mentorCode,
        title: liveTitle,
        description: "Live Class bersama mentor Malas Belajar",
        youtube_url: liveUrl,
        starts_at: new Date(liveStarts).toISOString(),
        recording_url: liveUrl,
        level: codeLevel,
      }),
    onSuccess: () => {
      toast.success("Live Class dijadwalkan.");
      setLiveTitle("");
    },
  });
  const mapMutation = useMutation({
    mutationFn: () =>
      apiPut<{ ok: boolean }>(`/admin/subtests/${mapSubtest}`, {
        mentor_code: mentorCode,
        level: codeLevel,
        description: mapDescription,
      }),
    onSuccess: () => toast.success("Peta belajar diperbarui."),
  });
  const explanationMutation = useMutation({
    mutationFn: () =>
      apiPut<Question>(
        `/admin/questions/${explanationQuestionId}/explanation`,
        {
          mentor_code: mentorCode,
          correct_option: Number(explanationCorrect),
          steps: explanationSteps
            .split("\n")
            .map((step) => step.trim())
            .filter(Boolean),
          trap_tip: explanationTrap,
          video_url: explanationVideo,
        },
      ),
    onSuccess: () => {
      toast.success("Pembahasan UTBABY disimpan.");
      queryClient.invalidateQueries({ queryKey: ["utbaby-detail"] });
    },
  });

  const openView = (next: View) => {
    setView(next);
    setNotificationsOpen(false);
    if (next === "rodi" || next === "utbaby") {
      const nextMascot = mascots[Math.floor(Math.random() * mascots.length)];
      setMascot(nextMascot);
      motivationMutation.mutate({
        mascot: nextMascot.name,
        context: next === "rodi" ? "drill" : "try out",
        subtest: next,
      });
    }
  };
  const activeQuestions = useMemo(
    () =>
      (moduleQuery.data?.questions ?? []).filter(
        (item) => item.chapter === activeChapter || item.chapter === "mentor",
      ),
    [moduleQuery.data, activeChapter],
  );
  const displayedQuestions = showAllQuestions
    ? activeQuestions
    : activeQuestions.slice(0, 6);
  const filteredResources = (resourcesQuery.data ?? []).filter(
    (item) => item.kind === resourceKind,
  );
  const activeLive = liveQuery.data?.[0];
  useEffect(() => {
    if (!reviewOpen || !tryoutResult || !tryoutQuery.data) return;
    const host = document.createElement("div");
    host.id = "utbaby-review-root";
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(
      <TryoutReviewOverlay
        detail={tryoutQuery.data}
        answers={tryoutAnswers}
        result={tryoutResult}
        onClose={() => setReviewOpen(false)}
      />,
    );
    return () => {
      root.unmount();
      host.remove();
    };
  }, [reviewOpen, tryoutResult, tryoutQuery.data, tryoutAnswers]);

  if (splash) return <Splash onContinue={() => setSplash(false)} />;
  if (view === "mentor" && !mentorUnlocked)
    return (
      <main
        className="pixel-world flex min-h-screen items-center justify-center p-5"
        data-testid="mentor-login-screen"
      >
        <Card className="pixel-card w-full max-w-md border-0 bg-white">
          <CardHeader>
            <CardTitle className="pixel-title text-xl text-violet-950">
              MENTOR CONTROL ROOM
            </CardTitle>
            <p className="text-sm text-slate-600">
              Masukkan kode verifikasi khusus mentor Malas Belajar.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              value={mentorCode}
              onChange={(event) => setMentorCode(event.target.value)}
              placeholder="Kode mentor"
              data-testid="mentor-code-input"
            />
            <PixelButton
              className="w-full bg-yellow-300 px-4 py-3 text-violet-950"
              onClick={() => verifyMentorMutation.mutate()}
              data-testid="mentor-verify-button"
            >
              VERIFIKASI
            </PixelButton>
            <button
              type="button"
              onClick={() => setView(user ? "dashboard" : "dashboard")}
              className="w-full text-xs font-bold text-violet-700 underline"
              data-testid="mentor-back-button"
            >
              Kembali ke login siswa
            </button>
          </CardContent>
        </Card>
      </main>
    );

  if (view === "mentor" && mentorUnlocked)
    return (
      <main
        className="min-h-screen bg-violet-100"
        data-testid="mentor-dashboard"
      >
        <div className="border-b-4 border-violet-950 bg-yellow-300 px-5 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="pixel-title text-xl text-violet-950">
                MENTOR CONTROL ROOM
              </p>
              <p className="text-xs font-bold text-violet-700">
                Kelola siswa, konten, peta, Live Class, dan UTBABY
              </p>
            </div>
            <Button
              variant="outline"
              className="border-2 border-violet-950 bg-white"
              onClick={() => setView(user ? "dashboard" : "dashboard")}
              data-testid="mentor-exit-button"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              "students",
              "codes",
              "map",
              "questions",
              "explanations",
              "tryout",
              "wacawaci",
              "live",
            ].map((tab) => (
              <Button
                key={tab}
                variant={adminTab === tab ? "default" : "outline"}
                onClick={() => setAdminTab(tab)}
                data-testid={`mentor-tab-${tab}`}
              >
                {tab}
              </Button>
            ))}
          </div>
          {adminTab === "students" && (
            <section className="pixel-card bg-white p-5">
              <h2 className="pixel-title text-lg text-violet-950">
                SISWA AKTIF
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-violet-950">
                      <th className="p-2">Nama</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Level</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(studentsQuery.data ?? []).map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-violet-100"
                        data-testid={`student-row-${student.id}`}
                      >
                        <td className="p-2 font-bold">{student.name}</td>
                        <td className="p-2">{student.email}</td>
                        <td className="p-2">{levels[student.level].label}</td>
                        <td className="p-2">
                          {student.active ? "Aktif" : "Nonaktif"}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant={student.active ? "destructive" : "outline"}
                            onClick={() =>
                              studentMutation.mutate({
                                id: student.id,
                                active: !student.active,
                              })
                            }
                            data-testid={`student-toggle-${student.id}`}
                          >
                            {student.active ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {adminTab === "codes" && (
            <section className="grid gap-5 lg:grid-cols-2">
              <Card className="pixel-card border-0">
                <CardHeader>
                  <CardTitle className="pixel-title text-lg text-violet-950">
                    BUAT KODE SEKALI PAKAI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <select
                    value={codeLevel}
                    onChange={(event) =>
                      setCodeLevel(event.target.value as Level)
                    }
                    className="h-10 w-full rounded-md border-2 border-violet-950 bg-white px-3"
                    data-testid="code-level-select"
                  >
                    <option value="nguli">Nguli</option>
                    <option value="mandor">Mandor</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                  <PixelButton
                    onClick={() => codeMutation.mutate()}
                    className="w-full bg-yellow-300 px-4 py-3 text-violet-950"
                    data-testid="generate-access-codes-button"
                  >
                    GENERATE 3 KODE
                  </PixelButton>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {generatedCodes.map((code) => (
                  <div
                    key={code.id}
                    className="pixel-card flex items-center justify-between bg-white p-4"
                  >
                    <code
                      className="font-black text-violet-950"
                      data-testid={`generated-code-${code.id}`}
                    >
                      {code.code}
                    </code>
                    <Badge>{levels[code.level as Level].label}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
          {adminTab === "map" && (
            <AdminForm title="UPDATE PETA RODI">
              <select
                value={mapSubtest}
                onChange={(event) => setMapSubtest(event.target.value)}
                className="form-select"
                data-testid="map-subtest-select"
              >
                <option value="pu">PU</option>
                <option value="ppu">PPU</option>
                <option value="pbm">PBM</option>
                <option value="pk">PK</option>
                <option value="lbi">LBI</option>
                <option value="lbe">LBE</option>
                <option value="pm">PM</option>
              </select>
              <Textarea
                value={mapDescription}
                onChange={(event) => setMapDescription(event.target.value)}
                placeholder="Deskripsi peta belajar baru"
                data-testid="map-description-input"
              />
              <LevelSelect value={codeLevel} onChange={setCodeLevel} />
              <PixelButton
                className="bg-yellow-300 px-5 py-3 text-violet-950"
                onClick={() => mapMutation.mutate()}
                data-testid="update-map-button"
              >
                SIMPAN PETA
              </PixelButton>
            </AdminForm>
          )}
          {adminTab === "questions" && (
            <AdminForm title="TAMBAH SOAL RODI">
              <Input
                value={questionPrompt}
                onChange={(event) => setQuestionPrompt(event.target.value)}
                placeholder="Tulis pertanyaan"
                data-testid="admin-question-prompt-input"
              />
              <Textarea
                value={questionOptions}
                onChange={(event) => setQuestionOptions(event.target.value)}
                data-testid="admin-question-options-input"
              />
              <LevelSelect value={codeLevel} onChange={setCodeLevel} />
              <PixelButton
                className="bg-yellow-300 px-5 py-3 text-violet-950"
                onClick={() => questionMutation.mutate()}
                data-testid="admin-add-question-button"
              >
                TAMBAH SOAL
              </PixelButton>
            </AdminForm>
          )}
          {adminTab === "explanations" && (
            <AdminForm title="PEMBAHASAN SOAL UTBABY">
              <select
                value={explanationQuestionId}
                onChange={(event) =>
                  setExplanationQuestionId(event.target.value)
                }
                className="form-select"
                data-testid="explanation-question-select"
              >
                {Array.from({ length: 7 }, (_, index) => (
                  <option key={index} value={`utbaby-demo-${index + 1}`}>
                    UTBABY Demo #{index + 1}
                  </option>
                ))}
              </select>
              <select
                value={explanationCorrect}
                onChange={(event) => setExplanationCorrect(event.target.value)}
                className="form-select"
                data-testid="explanation-correct-select"
              >
                {["A", "B", "C", "D", "E"].map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <Textarea
                value={explanationSteps}
                onChange={(event) => setExplanationSteps(event.target.value)}
                placeholder="Satu langkah per baris"
                data-testid="explanation-steps-input"
              />
              <Textarea
                value={explanationTrap}
                onChange={(event) => setExplanationTrap(event.target.value)}
                placeholder="Tip jebakan UTBK"
                data-testid="explanation-trap-input"
              />
              <Input
                value={explanationVideo}
                onChange={(event) => setExplanationVideo(event.target.value)}
                placeholder="URL video pembahasan (opsional)"
                data-testid="explanation-video-input"
              />
              <PixelButton
                className="bg-pink-300 px-5 py-3 text-violet-950"
                onClick={() => explanationMutation.mutate()}
                data-testid="save-explanation-button"
              >
                SIMPAN PEMBAHASAN
              </PixelButton>
            </AdminForm>
          )}
          {adminTab === "tryout" && (
            <AdminForm title="TAMBAH TRY OUT UTBABY">
              <Input
                value={tryoutTitle}
                onChange={(event) => setTryoutTitle(event.target.value)}
                data-testid="admin-tryout-title-input"
              />
              <LevelSelect value={codeLevel} onChange={setCodeLevel} />
              <PixelButton
                className="bg-pink-300 px-5 py-3 text-violet-950"
                onClick={() => tryoutCreateMutation.mutate()}
                data-testid="admin-add-tryout-button"
              >
                BUAT TRY OUT
              </PixelButton>
            </AdminForm>
          )}
          {adminTab === "wacawaci" && (
            <AdminForm title="UPLOAD WACAWACI">
              <select
                value={resourceKind}
                onChange={(event) => setResourceKind(event.target.value)}
                className="form-select"
                data-testid="admin-resource-kind-select"
              >
                <option value="video">Video</option>
                <option value="module">Modul</option>
              </select>
              <Input
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                placeholder="Judul"
                data-testid="admin-resource-title-input"
              />
              <Textarea
                value={resourceDescription}
                onChange={(event) => setResourceDescription(event.target.value)}
                placeholder="Deskripsi"
                data-testid="admin-resource-description-input"
              />
              <Input
                value={resourceUrl}
                onChange={(event) => setResourceUrl(event.target.value)}
                placeholder="URL opsional"
                data-testid="admin-resource-url-input"
              />
              <Input
                type="file"
                onChange={(event) =>
                  setResourceFile(event.target.files?.[0] ?? null)
                }
                data-testid="admin-resource-file-input"
              />
              <LevelSelect value={codeLevel} onChange={setCodeLevel} />
              <PixelButton
                className="bg-pink-300 px-5 py-3 text-violet-950"
                onClick={() => resourceMutation.mutate()}
                data-testid="admin-upload-resource-button"
              >
                <Upload className="mr-2 inline h-4 w-4" />
                PUBLIKASIKAN
              </PixelButton>
            </AdminForm>
          )}
          {adminTab === "live" && (
            <AdminForm title="JADWALKAN LIVE CLASS">
              <Input
                value={liveTitle}
                onChange={(event) => setLiveTitle(event.target.value)}
                placeholder="Judul live"
                data-testid="admin-live-title-input"
              />
              <Input
                value={liveUrl}
                onChange={(event) => setLiveUrl(event.target.value)}
                placeholder="URL YouTube Live"
                data-testid="admin-live-url-input"
              />
              <Input
                type="datetime-local"
                value={liveStarts}
                onChange={(event) => setLiveStarts(event.target.value)}
                data-testid="admin-live-start-input"
              />
              <LevelSelect value={codeLevel} onChange={setCodeLevel} />
              <PixelButton
                className="bg-cyan-300 px-5 py-3 text-violet-950"
                onClick={() => liveMutation.mutate()}
                data-testid="admin-add-live-button"
              >
                JADWALKAN LIVE
              </PixelButton>
            </AdminForm>
          )}
        </div>
      </main>
    );

  const fallbackGuestUser: User = {
    id: "usr-demo-1",
    name: "Pejuang Belajar",
    email: "siswa@malasbelajar.id",
    level: "nguli",
    active: true,
  };
  const safeUser: User = (user || fallbackGuestUser) as User;
  return (
    <div className="min-h-screen bg-violet-50" data-testid="authenticated-app">
      <AppHeader
        user={safeUser}
        view={view}
        onView={openView}
        notifications={notificationsQuery.data ?? []}
        notificationOpen={notificationsOpen}
        setNotificationOpen={setNotificationsOpen}
      />
      {view === "dashboard" && (
        <Dashboard
          user={safeUser}
          onOpen={openView}
          onMentor={() => setView("mentor")}
        />
      )}
      {view === "rodi" && (
        <main
          className="min-h-screen bg-[#fffbe8] px-5 py-8"
          data-testid="rodi-locker"
        >
          <div className="mx-auto max-w-7xl">
            <LockerTitle
              color="bg-yellow-300"
              title="RODI"
              subtitle={`Peta belajar ${levels[safeUser.level].label} · 7 subtes UTBK 2026`}
            />
            <MascotMessage
              mascot={mascot}
              motivation={motivationMutation.data}
              loading={motivationMutation.isPending}
            />
            <section
              className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="subtest-locker-grid"
            >
              {(subtestsQuery.data?.subtests ?? []).map((subtest, index) => (
                <article
                  key={subtest.id}
                  className="pixel-card bg-white p-4"
                  data-testid={`subtest-locker-${subtest.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="pixel-title text-xl text-violet-950">
                      {subtest.short_label}
                    </span>
                    <span className="font-mono text-xs font-bold text-pink-600">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-violet-950">
                    {subtest.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {subtest.description}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Badge variant="outline">
                      {subtest.question_count} soal
                    </Badge>
                    <Badge variant="outline">
                      {subtest.duration_minutes} mnt
                    </Badge>
                  </div>
                </article>
              ))}
            </section>
            <section className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="pixel-label">DRILL INTI RODI</p>
                  <h2 className="pixel-title text-2xl text-violet-950">
                    110 SOAL MATEMATIKA
                  </h2>
                </div>
                <div className="flex gap-2">
                  <select
                    value={activeChapter}
                    onChange={(event) => setActiveChapter(event.target.value)}
                    className="form-select"
                    data-testid="rodi-chapter-select"
                  >
                    <option value="bab-1">Operasi Bilangan</option>
                    <option value="bab-2">Eksponen</option>
                    <option value="bab-3">Bentuk Akar</option>
                    <option value="final">Latihan Akhir</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    data-testid="print-rodi-button"
                  >
                    Cetak
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {displayedQuestions.map((question) => (
                  <Card
                    key={question.id}
                    className="pixel-card border-0 bg-white"
                    data-testid={`question-item-${question.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge>{question.difficulty}</Badge>
                        <span className="font-mono text-xs">
                          #{question.number}
                        </span>
                      </div>
                      <CardTitle
                        className="text-base leading-relaxed text-violet-950"
                        data-testid={`question-prompt-${question.id}`}
                      >
                        {question.prompt}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input
                          value={answers[question.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Jawabanmu"
                          data-testid={`question-input-${question.id}`}
                        />
                        <Button
                          onClick={() => {
                            const correct =
                              normalize(answers[question.id] ?? "") ===
                              normalize(question.answer);
                            toast[correct ? "success" : "error"](
                              correct ? "Tepat!" : "Coba cek pembahasannya.",
                            );
                          }}
                          data-testid={`question-check-btn-${question.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSolutions((current) => ({
                            ...current,
                            [question.id]: !current[question.id],
                          }))
                        }
                        className="mt-3 text-xs font-black text-violet-700 underline"
                        data-testid={`toggle-solution-btn-${question.id}`}
                      >
                        {solutions[question.id]
                          ? "Tutup pembahasan"
                          : "Lihat pembahasan"}
                      </button>
                      {solutions[question.id] && (
                        <div
                          className="mt-3 rounded-lg bg-yellow-100 p-3 text-xs leading-relaxed text-violet-950"
                          data-testid={`solution-panel-${question.id}`}
                        >
                          <p className="font-black">
                            Jawaban: {question.answer}
                          </p>
                          {question.steps.map((step) => (
                            <p key={step} className="mt-1">
                              • {step}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {activeQuestions.length > 6 && (
                <Button
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                  className="mt-5"
                  data-testid="toggle-all-questions-button"
                >
                  {showAllQuestions
                    ? "Tampilkan lebih sedikit"
                    : `Tampilkan semua ${activeQuestions.length} soal`}
                </Button>
              )}
            </section>
          </div>
        </main>
      )}
      {view === "wacawaci" && (
        <main
          className="min-h-screen bg-pink-50 px-5 py-8"
          data-testid="wacawaci-locker"
        >
          <div className="mx-auto max-w-7xl">
            <LockerTitle
              color="bg-pink-300"
              title="WACAWACI"
              subtitle={`Loker materi ${levels[safeUser.level].label}`}
            />
            <div className="mt-6 flex gap-3">
              <PixelButton
                onClick={() => setResourceKind("video")}
                className={`px-6 py-3 ${resourceKind === "video" ? "bg-pink-300" : "bg-white"}`}
                data-testid="wacawaci-video-tab"
              >
                <Video className="mr-2 inline h-4 w-4" />
                VIDEO
              </PixelButton>
              <PixelButton
                onClick={() => setResourceKind("module")}
                className={`px-6 py-3 ${resourceKind === "module" ? "bg-yellow-300" : "bg-white"}`}
                data-testid="wacawaci-module-tab"
              >
                <FileText className="mr-2 inline h-4 w-4" />
                MODUL
              </PixelButton>
            </div>
            <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((resource) => (
                <article
                  key={resource.id}
                  className="pixel-card flex flex-col bg-white p-5"
                  data-testid={`resource-card-${resource.id}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge>{resource.kind}</Badge>
                    <span className="font-mono text-[10px] uppercase text-violet-600">
                      {resource.level}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-black text-violet-950">
                    {resource.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {resource.description}
                  </p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center font-mono text-xs font-black text-pink-600 underline"
                    data-testid={`resource-open-${resource.id}`}
                  >
                    BUKA LOKER <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </article>
              ))}
            </section>
          </div>
        </main>
      )}
      {view === "live" && (
        <main
          className="min-h-screen bg-cyan-50 px-5 py-8"
          data-testid="live-class-locker"
        >
          <div className="mx-auto max-w-7xl">
            <LockerTitle
              color="bg-cyan-300"
              title="LIVE CLASS"
              subtitle={`Kelas YouTube untuk ${levels[safeUser.level].label}`}
            />
            {activeLive ? (
              <section className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
                <div className="pixel-card overflow-hidden bg-violet-950 p-2">
                  <div className="aspect-video">
                    <iframe
                      src={embedYoutube(activeLive.youtube_url)}
                      title={activeLive.title}
                      className="h-full w-full"
                      allowFullScreen
                      data-testid="youtube-live-embed"
                    />
                  </div>
                </div>
                <div className="pixel-card bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        activeLive.status === "LIVE"
                          ? "bg-red-600 text-white"
                          : "bg-violet-700 text-white"
                      }
                    >
                      {activeLive.status}
                    </Badge>
                    <span className="font-mono text-xs text-slate-500">
                      {new Date(activeLive.starts_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-violet-950">
                    {activeLive.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {activeLive.description}
                  </p>
                  <p className="mt-5 rounded-lg bg-yellow-100 p-3 text-xs font-bold text-violet-950">
                    Notifikasi in-app muncul 30 menit sebelum kelas. Setelah
                    selesai, tautan YouTube yang sama menjadi rekaman.
                  </p>
                  <a
                    href={activeLive.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-xs font-black text-violet-700 underline"
                  >
                    Buka di YouTube
                  </a>
                </div>
              </section>
            ) : (
              <div className="pixel-card mt-7 bg-white p-10 text-center">
                <Clock className="mx-auto h-10 w-10 text-violet-500" />
                <p className="mt-4 font-black text-violet-950">
                  Belum ada jadwal Live Class untuk levelmu.
                </p>
              </div>
            )}
            <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(liveQuery.data ?? []).map((live) => (
                <article key={live.id} className="pixel-card bg-white p-4">
                  <Badge>{live.status}</Badge>
                  <p className="mt-3 font-black text-violet-950">
                    {live.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(live.starts_at).toLocaleString("id-ID")}
                  </p>
                </article>
              ))}
            </section>
          </div>
        </main>
      )}
      {view === "utbaby" && (
        <main
          className="min-h-screen bg-violet-100 px-5 py-8"
          data-testid="utbaby-locker"
        >
          <div className="mx-auto max-w-7xl">
            <LockerTitle
              color="bg-violet-300"
              title="UTBABY"
              subtitle="Try out 7 subtes · IRT-like · skor maksimal 1000"
            />
            <MascotMessage
              mascot={mascot}
              motivation={motivationMutation.data}
              loading={motivationMutation.isPending}
            />
            <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_340px]">
              <section>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(sessionsQuery.data ?? []).map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session.id);
                        setTryoutResult(null);
                        setTryoutAnswers({});
                      }}
                      className={`pixel-card p-4 text-left ${selectedSession === session.id ? "bg-yellow-300" : "bg-white"}`}
                      data-testid={`tryout-session-${session.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge>{session.status}</Badge>
                        <span className="font-mono text-xs">
                          {session.max_score} MAX
                        </span>
                      </div>
                      <p className="mt-3 font-black text-violet-950">
                        {session.title}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        {session.description}
                      </p>
                      <p className="mt-3 font-mono text-[10px] font-bold text-violet-700">
                        {session.question_count} soal ·{" "}
                        {session.duration_minutes} menit
                      </p>
                    </button>
                  ))}
                </div>
                {tryoutQuery.data && (
                  <div className="mt-6 space-y-4">
                    {tryoutQuery.data.questions.map((question) => (
                      <Card
                        key={question.id}
                        className="pixel-card border-0 bg-white"
                        data-testid={`tryout-question-${question.id}`}
                      >
                        <CardHeader>
                          <Badge className="w-fit">
                            {question.chapter_label}
                          </Badge>
                          <CardTitle className="text-base leading-relaxed text-violet-950">
                            {question.number}. {question.prompt}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {question.options.map((option, index) => (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm font-semibold ${tryoutAnswers[question.id] === index ? "border-violet-700 bg-violet-100" : "border-violet-100"}`}
                              data-testid={`tryout-option-${question.id}-${index}`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                checked={tryoutAnswers[question.id] === index}
                                onChange={() =>
                                  setTryoutAnswers((current) => ({
                                    ...current,
                                    [question.id]: index,
                                  }))
                                }
                              />
                              {String.fromCharCode(65 + index)}. {option}
                            </label>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {tryoutQuery.data && !tryoutResult && (
                  <PixelButton
                    onClick={() => submitTryoutMutation.mutate()}
                    className="mt-6 w-full bg-pink-300 px-6 py-4 text-violet-950"
                    data-testid="submit-tryout-button"
                  >
                    KUMPULKAN & HITUNG IRT
                  </PixelButton>
                )}
                {tryoutResult && (
                  <div
                    className="pixel-card mt-6 bg-yellow-300 p-6 text-center"
                    data-testid="tryout-result-card"
                  >
                    <p className="pixel-label">SKOR IRT-LIKE</p>
                    <p className="pixel-title mt-2 text-6xl text-violet-950">
                      {tryoutResult.score}
                    </p>
                    <p className="mt-2 font-black text-violet-900">
                      Peringkat #{tryoutResult.rank} · {tryoutResult.correct}/
                      {tryoutResult.total} benar
                    </p>
                    <p className="mt-3 text-xs text-violet-800">
                      {tryoutResult.irt_note}
                    </p>
                  </div>
                )}
              </section>
              <aside
                className="pixel-card self-start bg-white p-5"
                data-testid="public-leaderboard"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <p className="pixel-title text-base text-violet-950">
                    GLOBAL RANK
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {(leaderboardQuery.data ?? []).map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.participant}`}
                      className="flex items-center gap-3 rounded-lg border-2 border-violet-100 p-3"
                      data-testid={`leaderboard-row-${entry.rank}`}
                    >
                      <span className="pixel-title w-8 text-lg text-violet-700">
                        #{entry.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-violet-950">
                          {entry.participant}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {entry.correct}/{entry.total} benar
                        </p>
                      </div>
                      <span className="font-mono text-lg font-black text-pink-600">
                        {entry.score}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
                  Leaderboard dapat dilihat semua siswa aktif. Skor maksimal
                  1000 dan bersifat simulasi, bukan skor resmi SNPMB.
                </p>
              </aside>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function LockerTitle({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section
      className={`pixel-card ${color} flex flex-wrap items-center justify-between gap-4 p-5`}
      data-testid={`${title.toLowerCase().replaceAll(" ", "-")}-title-card`}
    >
      <div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-violet-700">
          Malas Belajar · Member Locker
        </p>
        <h1 className="pixel-title mt-1 text-3xl text-violet-950">{title}</h1>
        <p className="mt-2 text-sm font-bold text-violet-900">{subtitle}</p>
      </div>
      <Gamepad2 className="h-12 w-12 text-violet-950" />
    </section>
  );
}

function LevelSelect({
  value,
  onChange,
}: {
  value: Level;
  onChange: (level: Level) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Level)}
      className="form-select"
      data-testid="admin-content-level-select"
    >
      <option value="nguli">Nguli</option>
      <option value="mandor">Mandor</option>
      <option value="supervisor">Supervisor</option>
    </select>
  );
}

function AdminForm({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pixel-card mx-auto max-w-2xl bg-white p-5">
      <h2 className="pixel-title text-lg text-violet-950">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
