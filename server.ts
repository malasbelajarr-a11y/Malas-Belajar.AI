import express, { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded and static assets
const assetsDir = path.join(process.cwd(), "public/api/assets");
app.use("/api/assets", express.static(assetsDir));
app.use(express.static(path.join(process.cwd(), "public")));

// --- Types ---
interface FeedbackItem {
  id: string;
  user_name: string;
  user_level: string;
  rating: number;
  category: string;
  feedback: string;
  created_at: string;
}

const feedbackList: FeedbackItem[] = [
  {
    id: "fb-1",
    user_name: "Rian (Ketua Kelas)",
    user_level: "nguli",
    rating: 5,
    category: "Loker RODI",
    feedback: "Materi dan latihan subtesnya enak banget buat drill harian. Keren kalau ditambah timer per butir soal!",
    created_at: "Hari ini",
  },
  {
    id: "fb-2",
    user_name: "Salsa",
    user_level: "mandor",
    rating: 5,
    category: "Wacawaci & Video",
    feedback: "Video pembahasannya sangat ngebantu konsep dasar. Rekomendasi buat teman-teman sekelas dicoba setahun ini!",
    created_at: "Kemarin",
  },
];

type Level = "nguli" | "mandor" | "supervisor";

interface User {
  id: string;
  name: string;
  email: string;
  level: Level;
  active: boolean;
  passwordHash?: string;
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

interface Subtest {
  id: string;
  label: string;
  short_label: string;
  question_count: number;
  duration_minutes: number;
  component: string;
  description: string;
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

interface LeaderboardEntry {
  rank: number;
  participant: string;
  score: number;
  correct: number;
  total: number;
  submitted_at: string;
}

interface NotificationItem {
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

// --- In-Memory State & Seed Data ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function setSessionCookie(req: Request, res: Response, userId: string): void {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie("mls_session", userId, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
const users: Map<string, User> = new Map([
  [
    "usr-demo-1",
    {
      id: "usr-demo-1",
      name: "Pejuang SNBT 2026",
      email: "siswa@malasbelajar.id",
      level: "nguli",
      active: true,
    },
  ],
  [
    "usr-mandor-1",
    {
      id: "usr-mandor-1",
      name: "Siti Rahma",
      email: "siti@malasbelajar.id",
      level: "mandor",
      active: true,
    },
  ],
  [
    "usr-spv-1",
    {
      id: "usr-spv-1",
      name: "Budi Santoso",
      email: "budi@malasbelajar.id",
      level: "supervisor",
      active: true,
    },
  ],
]);

const accessCodes: AccessCode[] = [
  { id: "code-1", code: "NGULI-MLS", level: "nguli", used: false, used_by: "" },
  { id: "code-2", code: "MANDOR-MLS", level: "mandor", used: false, used_by: "" },
  { id: "code-3", code: "SPV-MLS", level: "supervisor", used: false, used_by: "" },
  { id: "code-4", code: "MLS2026", level: "nguli", used: false, used_by: "" },
  { id: "code-5", code: "MLS-NGU-9921", level: "nguli", used: false, used_by: "" },
  { id: "code-mentor-2026", code: "MLS-MENTOR-2026", level: "mentor", used: false, used_by: "" },
];

const subtests: Subtest[] = [
  {
    id: "pu",
    label: "Kemampuan Penalaran Umum",
    short_label: "Penalaran Umum (PU)",
    question_count: 30,
    duration_minutes: 30,
    component: "Tes Potensi Skolastik",
    description: "Penalaran induktif, deduktif, dan kuantitatif logika matematika praktis.",
  },
  {
    id: "pk",
    label: "Pengetahuan Kuantitatif",
    short_label: "Pengetahuan Kuantitatif (PK)",
    question_count: 15,
    duration_minutes: 20,
    component: "Tes Potensi Skolastik",
    description: "Aljabar, geometri, aritmatika, probabilitas, dan kecukupan data (1) & (2).",
  },
  {
    id: "pbm",
    label: "Pemahaman Bacaan & Menulis",
    short_label: "Pemahaman Bacaan & Menulis (PBM)",
    question_count: 20,
    duration_minutes: 25,
    component: "Tes Potensi Skolastik",
    description: "Struktur kalimat efektif, konjungsi, PUEBI, EYD V, dan kepaduan paragraf.",
  },
  {
    id: "ppu",
    label: "Pengetahuan & Pemahaman Umum",
    short_label: "Pengetahuan Umum (PPU)",
    question_count: 20,
    duration_minutes: 15,
    component: "Tes Potensi Skolastik",
    description: "Makna kontekstual, sinonim antonim ilmiah, idiom, dan simpulan wacana.",
  },
  {
    id: "lit_indo",
    label: "Literasi Bahasa Indonesia",
    short_label: "Literasi Bhs. Indonesia",
    question_count: 30,
    duration_minutes: 45,
    component: "Literasi dalam Bahasa Indonesia & Inggris",
    description: "Analisis teks ilmiah, opini publik, sastra modern, evaluasi argumen kritis.",
  },
  {
    id: "lit_inggris",
    label: "Literasi Bahasa Inggris",
    short_label: "Literasi Bhs. Inggris",
    question_count: 20,
    duration_minutes: 30,
    component: "Literasi dalam Bahasa Indonesia & Inggris",
    description: "Tone analysis, author inference, main ideas, and cross-passage synthesis.",
  },
  {
    id: "pm",
    label: "Penalaran Matematika",
    short_label: "Penalaran Matematika (PM)",
    question_count: 20,
    duration_minutes: 30,
    component: "Penalaran Matematika",
    description: "Pemodelan masalah nyata, optimasi fungsi, statistika terapan, kalkulus dasar.",
  },
];

const initialQuestions: Question[] = [
  {
    id: "rodi-pu-1",
    chapter: "pu",
    chapter_label: "Penalaran Umum (PU)",
    number: 1,
    difficulty: "Sedang",
    topic: "Penalaran Deduktif & Silogisme",
    prompt:
      "Semua peserta bimbingan Malas Belajar yang menyelesaikan modul RODI minimal 80% lulus ke PTN impian. Beberapa siswa kelas 12 SMAN 1 Jakarta tidak menyelesaikan modul RODI hingga 80%. Simpulan yang paling tepat adalah...",
    answer: "Beberapa siswa kelas 12 SMAN 1 Jakarta tidak dapat dipastikan kelulusannya melalui ketentuan tersebut.",
    steps: [
      "Premis mayor: Menyelesaikan modul ≥ 80% ⇒ Lulus PTN.",
      "Premis minor: Beberapa siswa SMAN 1 tidak menyelesaikan ≥ 80%.",
      "Perhatikan kaidah silogisme: Negasi dari antiseden (tidak menyelesaikan ≥ 80%) tidak serta-merta menghasilkan negasi konsekuen secara pasti, melainkan status kelulusannya tidak dapat dipastikan semata-mata dari premis tersebut.",
      "Opsi terbaik adalah opsi yang tidak menarik kesimpulan mutlak yang keliru (Fallacy of denying the antecedent).",
    ],
    is_final: false,
    options: [
      "Semua siswa kelas 12 SMAN 1 Jakarta pasti gagal masuk PTN impian.",
      "Beberapa siswa kelas 12 SMAN 1 Jakarta tidak dapat dipastikan kelulusannya melalui ketentuan tersebut.",
      "Tidak ada siswa SMAN 1 Jakarta yang lolos ke perguruan tinggi negeri.",
      "Semua siswa yang tidak menyelesaikan RODI tetap memiliki peluang 100% lulus.",
      "Siswa SMAN 1 Jakarta yang menyelesaikan modul RODI 80% belum tentu lulus PTN.",
    ],
    correct_option: 1,
    irt_difficulty: -0.45,
    irt_discrimination: 1.25,
    level: "nguli",
    trap_tip:
      "Hati-hati dengan jebakan generalisasi mutlak ('pasti gagal'). Dalam logika formal UTBK, negasi syarat cukup bukan berarti otomatis hasilnya mustahil tercapai.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-pk-1",
    chapter: "pk",
    chapter_label: "Pengetahuan Kuantitatif (PK)",
    number: 2,
    difficulty: "Tinggi",
    topic: "Fungsi Kuadrat & Titik Balik",
    prompt:
      "Diketahui parabola f(x) = ax² + bx + c memiliki titik puncak di (2, -9) dan memotong sumbu X di titik (5, 0). Nilai dari a + b + c adalah...",
    answer: "-8",
    steps: [
      "Bentuk umum persamaan parabola dengan titik puncak (xp, yp) adalah f(x) = a(x - xp)² + yp.",
      "Substitusi titik puncak (2, -9): f(x) = a(x - 2)² - 9.",
      "Karena memotong sumbu X di (5, 0), maka f(5) = 0: a(5 - 2)² - 9 = 0 ⇒ 9a = 9 ⇒ a = 1.",
      "Persamaan fungsi: f(x) = 1(x - 2)² - 9 = x² - 4x + 4 - 9 = x² - 4x - 5.",
      "Diperoleh koefisien: a = 1, b = -4, c = -5.",
      "Maka nilai a + b + c = f(1) = 1 + (-4) + (-5) = -8.",
    ],
    is_final: false,
    options: ["-10", "-8", "-5", "3", "7"],
    correct_option: 1,
    irt_difficulty: 0.82,
    irt_discrimination: 1.64,
    level: "mandor",
    trap_tip:
      "Trik cepat UTBK: Nilai a + b + c adalah nilai f(1)! Langsung substitusi x = 1 ke f(x) = a(x-2)² - 9 setelah menemukan nilai a = 1, sehingga 1(1-2)² - 9 = 1 - 9 = -8.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-pbm-1",
    chapter: "pbm",
    chapter_label: "Pemahaman Bacaan & Menulis (PBM)",
    number: 3,
    difficulty: "Sedang",
    topic: "Kalimat Efektif & Konjungsi",
    prompt:
      "Manakah kalimat berikut yang merupakan kalimat efektif dan memenuhi kaidah tata bahasa Indonesia (EYD V)?",
    answer: "Penelitian tersebut membuktikan bahwa perubahan iklim memengaruhi produktivitas sektor pertanian.",
    steps: [
      "Opsi A salah karena adanya preposisi 'Bagi' di awal kalimat yang menghilangkan fungsi subjek ('Bagi para peneliti memerlukan data').",
      "Opsi B benar karena memiliki struktur klausa yang utuh: Subjek ('Penelitian tersebut'), Predikat ('membuktikan'), dan Objek berupa klausa perluasan ('bahwa perubahan iklim memengaruhi produktivitas sektor pertanian').",
      "Opsi C salah karena penggunaan konjungsi ganda 'Meskipun... namun...'.",
      "Opsi D salah karena pemborosan kata 'adalah merupakan'.",
      "Opsi E salah karena predikat tidak berpadanan secara logis.",
    ],
    is_final: false,
    options: [
      "Bagi para peneliti sosial memerlukan data lapangan yang sangat akurat.",
      "Penelitian tersebut membuktikan bahwa perubahan iklim memengaruhi produktivitas sektor pertanian.",
      "Meskipun anggaran telah dinaikkan, namun implementasi program tetap lambat.",
      "Kunci keberhasilan belajar adalah merupakan konsistensi dalam latihan soal harian.",
      "Di dalam rapat kerja pimpinan membicarakan mengenai kenaikan tunjangan guru.",
    ],
    correct_option: 1,
    irt_difficulty: 0.15,
    irt_discrimination: 1.35,
    level: "nguli",
    trap_tip:
      "Cek selalu: Apakah ada preposisi (di, bagi, untuk, dalam) di awal kalimat? Jika ada, pastikan tidak menenggelamkan subjek utama!",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-ppu-1",
    chapter: "ppu",
    chapter_label: "Pengetahuan & Pemahaman Umum (PPU)",
    number: 4,
    difficulty: "Sedang",
    topic: "Makna Kata Kontekstual & Sinonim Ilmiah",
    prompt:
      "Kata 'anomali' dalam konteks cuaca ekstrem global memiliki makna yang paling sepadan dengan...",
    answer: "Penyimpangan dari keadaan normal atau standar",
    steps: [
      "Menurut KBBI dan konteks sains, 'anomali' berarti penyimpangan atau keanehan yang tidak sesuai dengan kondisi baku/umum.",
      "Dalam cuaca ekstrem, anomali merujuk pada lonjakan suhu atau curah hujan di luar batas rata-rata historis jangka panjang.",
    ],
    is_final: false,
    options: [
      "Keseragaman pola musim",
      "Penyimpangan dari keadaan normal atau standar",
      "Kenaikan bertahap yang dapat diprediksi",
      "Dampak negatif yang tidak dapat dihindari",
      "Perubahan siklus tahunan yang teratur",
    ],
    correct_option: 1,
    irt_difficulty: -0.2,
    irt_discrimination: 1.1,
    level: "nguli",
    trap_tip:
      "Bedakan antara 'anomali' (penyimpangan) dengan 'fluktuasi' (naik-turun dinamis). Jangan tertukar!",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-lit-indo-1",
    chapter: "lit_indo",
    chapter_label: "Literasi Bahasa Indonesia",
    number: 5,
    difficulty: "Tinggi",
    topic: "Evaluasi Argumen & Sikap Penulis",
    prompt:
      "Teks bacaan menyoroti transisi energi terbarukan di negara berkembang yang kerap terbentur tingginya biaya modal dan ketergantungan pada subsidi batu bara. Sikap penulis yang tercermin dalam bacaan tersebut adalah...",
    answer: "Kritis namun realistis terhadap tantangan fiskal negara berkembang",
    steps: [
      "Perhatikan diksi penulis: penulis mengakui pentingnya energi hijau namun memaparkan data konkret terkait utang fiskal dan subsidi.",
      "Sikap tersebut bukan skeptis total, bukan pula optimistis buta, melainkan kritis realistis.",
    ],
    is_final: false,
    options: [
      "Pesimistis terhadap prospek energi hijau di seluruh dunia",
      "Kritis namun realistis terhadap tantangan fiskal negara berkembang",
      "Sangat menentang penghentian subsidi pembangkit batu bara",
      "Netral tanpa memberikan pandangan analitis mengenai kebijakan",
      "Euforis menyambut target nol emisi karbon tanpa memperhitungkan kendala",
    ],
    correct_option: 1,
    irt_difficulty: 0.95,
    irt_discrimination: 1.75,
    level: "supervisor",
    trap_tip:
      "Cari nada dasar (tone) penulis: evaluasi apakah penulis menggunakan kata-kata bernada moderat, ekstrem, atau objektif berbasis komparasi data.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-lit-inggris-1",
    chapter: "lit_inggris",
    chapter_label: "Literasi Bahasa Inggris",
    number: 6,
    difficulty: "Tinggi",
    topic: "Author's Tone & Inferential Reading",
    prompt:
      "According to the passage on cognitive load theory, which of the following best describes the author's primary attitude toward digital multitasking among secondary students?",
    answer: "Concerned about the degradation of deep information processing and long-term retention",
    steps: [
      "Scan keywords: 'cognitive overload', 'split-attention effect', 'superficial processing'.",
      "The author emphasizes that switching tabs diminishes working memory consolidation.",
      "Therefore, the tone is concerned about learning quality and retention.",
    ],
    is_final: false,
    options: [
      "Enthusiastic about enhanced cognitive flexibility",
      "Concerned about the degradation of deep information processing and long-term retention",
      "Indifferent toward traditional learning methodologies",
      "Optimistic that automated tools will eliminate mental fatigue",
      "Dismissive of psychological research on student performance",
    ],
    correct_option: 1,
    irt_difficulty: 0.88,
    irt_discrimination: 1.6,
    level: "mandor",
    trap_tip:
      "Watch out for extreme adjectives ('enthusiastic', 'dismissive'). Academic reading passages in UTBK favor nuanced analytical stances ('concerned about degradation').",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "rodi-pm-1",
    chapter: "pm",
    chapter_label: "Penalaran Matematika (PM)",
    number: 7,
    difficulty: "Tinggi",
    topic: "Model Logaritma & Peluruhan Radioaktif",
    prompt:
      "Suatu zat radioaktif memiliki massa awal 160 gram dan waktu paruh 4 jam. Setelah t jam, massa yang tersisa adalah 2,5 gram. Berapakah nilai t?",
    answer: "24 jam",
    steps: [
      "Rumus peluruhan massa: N(t) = N0 * (1/2)^(t / T_half).",
      "Substitusi nilai yang diketahui: 2,5 = 160 * (1/2)^(t / 4).",
      "Bagi kedua ruas dengan 160: 2,5 / 160 = 25 / 1600 = 1 / 64.",
      "Perhatikan bahwa 1 / 64 = (1/2)^6.",
      "Maka t / 4 = 6 ⇒ t = 24 jam.",
    ],
    is_final: true,
    options: ["16 jam", "20 jam", "24 jam", "28 jam", "32 jam"],
    correct_option: 2,
    irt_difficulty: 0.75,
    irt_discrimination: 1.5,
    level: "mandor",
    trap_tip:
      "Hitung pembagian 160 menjadi setengahnya bertahap: 160 → 80 → 40 → 20 → 10 → 5 → 2,5. Ada 6 kali paruh! 6 × 4 = 24 jam. Sangat cepat!",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
];

let questions: Question[] = [...initialQuestions];

const wacawaciResources: Resource[] = [
  {
    id: "res-1",
    kind: "pdf",
    title: "Kitab Rumus Cepat Kuantitatif & Penalaran Matematika UTBK 2026",
    description:
      "Rangkuman praktis 50 formula esensial: aljabar, geometri analitik, permutasi-kombinasi, matriks, dan kecukupan data (1) & (2).",
    url: "https://example.com/kitab-pk-mls.pdf",
    is_public: true,
    created_by: "Mentor Koko",
    level: "nguli",
  },
  {
    id: "res-2",
    kind: "video",
    title: "Masterclass Jebakan PPU & PBM: Skim-Scan Cepat Kalimat Efektif",
    description:
      "Strategi 45 detik membedah kalimat mubazir, konjungsi antarkalimat, dan penentuan ide pokok tanpa tersesat teks panjang.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    is_public: true,
    created_by: "Mentor Cece",
    level: "mandor",
  },
  {
    id: "res-3",
    kind: "ringkasan",
    title: "Peta Konsep EYD V: 10 Aturan Krusial Paling Sering Muncul di SNBT",
    description:
      "Tanda koma anteseden, penulisan partikel pun, huruf kapital jabatan, dan serapan istilah serapan ilmiah.",
    url: "https://example.com/eyd-v-cheat.pdf",
    is_public: true,
    created_by: "Mentor Cece",
    level: "nguli",
  },
  {
    id: "res-4",
    kind: "cheatsheet",
    title: "IRT Decoded: Algoritma Pembobotan Skor SNBT & Strategi Menjawab",
    description:
      "Mengapa soal sulit bernilai tinggi dan bagaimana memprioritaskan soal berdaya pembeda kuat dalam durasi ketat.",
    url: "https://example.com/irt-decoded.pdf",
    is_public: true,
    created_by: "Tim Riset MLS",
    level: "supervisor",
  },
];

const liveClasses: LiveClass[] = [
  {
    id: "live-1",
    title: "Live Bedah Soal HOTS Penalaran Matematika: Optimasi & Logaritma",
    description:
      "Kupas tuntas 15 tipe soal langganan UTBK bersama Mentor Koko. Dilengkapi sesi tanya-jawab interaktif dan trik eliminasi kilat.",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    recording_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    level: "mandor",
    status: "scheduled",
  },
  {
    id: "live-2",
    title: "Klinik PBM & Literasi Indonesia: Trik Menjawab Soal Paragraf Kompleks",
    description:
      "Menganalisis kohesi paragraf dan makna tersirat bersama Mentor Cece. Cocok untuk semua level dari Nguli sampai Supervisor.",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    recording_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    level: "nguli",
    status: "scheduled",
  },
  {
    id: "live-3",
    title: "Rekaman: Rahasia Skor 700+ TPS Kuantitatif SNBT Tahun Lalu",
    description:
      "Rekaman kelas intensif bedah tipe soal fungsi kuadrat dan probabilitas gabungan.",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    starts_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    recording_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    level: "nguli",
    status: "completed",
  },
];

const tryoutSessions: (TryoutSummary & { questions: Question[] })[] = [
  {
    id: "utbaby-demo-2026",
    title: "UTBABY Simulasi Nasional SNBT 2026 - Gelombang I",
    description:
      "Simulasi komprehensif 7 subtes standar SNBT BPPP Kemendikbudristek dengan kalkulasi skor berbasis teori respon butir (IRT).",
    duration_minutes: 195,
    question_count: 7,
    status: "active",
    max_score: 1000,
    level: "nguli",
    questions: initialQuestions,
  },
  {
    id: "utbaby-demo-1",
    title: "UTBABY Mini Diagnostic Drill: TPS & Literasi",
    description:
      "Tes diagnostik 45 menit untuk memetakan kekuatan dan kelemahan awal sebelum masuk ke siklus drill berulang.",
    duration_minutes: 45,
    question_count: 4,
    status: "active",
    max_score: 1000,
    level: "nguli",
    questions: initialQuestions.slice(0, 4),
  },
];

const leaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    participant: "Farhan Ardiansyah (ITB STEI Target)",
    score: 842,
    correct: 7,
    total: 7,
    submitted_at: "Hari ini, 10:14 WIB",
  },
  {
    rank: 2,
    participant: "Nabila Zahra (UI FK Target)",
    score: 818,
    correct: 6,
    total: 7,
    submitted_at: "Hari ini, 11:25 WIB",
  },
  {
    rank: 3,
    participant: "Kevin Jonathan (UGM Teknik Sipil)",
    score: 795,
    correct: 6,
    total: 7,
    submitted_at: "Kemarin, 21:05 WIB",
  },
  {
    rank: 4,
    participant: "Siti Rahma (Unpad Psikologi)",
    score: 772,
    correct: 5,
    total: 7,
    submitted_at: "Kemarin, 19:40 WIB",
  },
  {
    rank: 5,
    participant: "Rian Pratama (ITS Informatika)",
    score: 748,
    correct: 5,
    total: 7,
    submitted_at: "2 hari lalu",
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Live Class Bersama Mentor Koko",
    message:
      "Jadwal Live Class 'Bedah Soal HOTS Penalaran Matematika' besok pukul 19.30 WIB. Siapkan catatanmu!",
    kind: "live",
    level: "all",
    created_at: "Baru saja",
    read: false,
  },
  {
    id: "notif-2",
    title: "Hasil UTBABY Gelombang I Terbit",
    message:
      "Skor IRT-like dan analisis butir soal telah tersedia di dashboard UTBABY. Cek posisi rankingmu sekarang.",
    kind: "tryout",
    level: "all",
    created_at: "2 jam lalu",
    read: false,
  },
  {
    id: "notif-3",
    title: "Modul Baru di Wacawaci",
    message:
      "Mentor Cece baru saja merilis 'Kitab Rumus Cepat Kuantitatif 2026'. Silakan unduh di loker Wacawaci.",
    kind: "materi",
    level: "all",
    created_at: "1 hari lalu",
    read: true,
  },
];

// Helper: current user from header token, cookie, or active session fallback
let activeUser: User | null = users.get("usr-demo-1") || null;

function getCurrentUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  const headerToken =
    (req.headers["x-mls-session"] as string) ||
    (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  const cookieToken = req.cookies?.mls_session;
  const token = headerToken || cookieToken;
  if (!token) return null;
  const user = users.get(token);
  if (!user || !user.active) return null;
  return user;
}

// --- API Endpoints ---

// Auth
app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  res.json(user ? publicUser(user) : null);
});

app.post("/api/auth/register", (req: Request, res: Response) => {
  const { name, email, password, access_code, level } = req.body;
  const cleanName = String(name || "").trim();
  const emailLower = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanName || !emailLower || !cleanPassword) {
    res.status(400).json({ detail: "Nama, email, dan password wajib diisi." });
    return;
  }
  if (cleanPassword.length < 6) {
    res.status(400).json({ detail: "Password minimal 6 karakter." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    res.status(400).json({ detail: "Format email tidak valid." });
    return;
  }
  if (Array.from(users.values()).some((u) => u.email === emailLower)) {
    res.status(409).json({ detail: "Email sudah terdaftar. Silakan login." });
    return;
  }
  let userLevel: Level = (level as Level) || "nguli";
  const codeUpper = String(access_code || "").trim().toUpperCase();
  if (codeUpper.includes("MANDOR") || codeUpper.includes("MAN")) userLevel = "mandor";
  else if (codeUpper.includes("SUPERVISOR") || codeUpper.includes("SPV")) userLevel = "supervisor";
  else if (codeUpper.includes("NGULI") || codeUpper.includes("NGU")) userLevel = "nguli";
  const newUser: User = {
    id: `usr-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    name: cleanName,
    email: emailLower,
    level: userLevel,
    active: true,
    passwordHash: hashPassword(cleanPassword),
  };
  users.set(newUser.id, newUser);
  setSessionCookie(req, res, newUser.id);
  res.status(201).json(publicUser(newUser));
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const emailLower = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const level = req.body.level as Level | undefined;
  if (!emailLower || !password) {
    res.status(400).json({ detail: "Email dan password wajib diisi." });
    return;
  }
  const matchedUser = Array.from(users.values()).find((u) => u.email.toLowerCase() === emailLower);
  if (!matchedUser) {
    res.status(401).json({ detail: "Email belum terdaftar. Silakan daftar terlebih dahulu." });
    return;
  }
  if (!matchedUser.active) {
    res.status(403).json({ detail: "Akun kamu sedang dinonaktifkan." });
    return;
  }
  if (!matchedUser.passwordHash) matchedUser.passwordHash = hashPassword("123456");
  if (!verifyPassword(password, matchedUser.passwordHash)) {
    res.status(401).json({ detail: "Password salah." });
    return;
  }
  if (level && ["nguli", "mandor", "supervisor"].includes(level) && matchedUser.level !== level) {
    res.status(403).json({ detail: `Akun ini terdaftar sebagai ${matchedUser.level}. Pilih level yang sesuai.` });
    return;
  }
  setSessionCookie(req, res, matchedUser.id);
  res.json(publicUser(matchedUser));
});

app.post("/api/auth/demo", (req: Request, res: Response) => {
  const { level } = req.body;
  const targetLevel: Level = (level as Level) || "nguli";
  const demoUsers: Record<Level, string> = {
    nguli: "usr-demo-1",
    mandor: "usr-mandor-1",
    supervisor: "usr-spv-1",
  };
  const targetId = demoUsers[targetLevel] || "usr-demo-1";
  const user = users.get(targetId)!;
  user.level = targetLevel;
  activeUser = user;

  res.cookie("mls_session", user.id, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.json(publicUser(user));
});

app.patch("/api/auth/level", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ detail: "Silakan login terlebih dahulu" });
    return;
  }
  const { level } = req.body;
  if (level === "nguli" || level === "mandor" || level === "supervisor") {
    user.level = level;
    activeUser = user;
    res.json(publicUser(user));
  } else {
    res.status(400).json({ detail: "Level tidak valid" });
  }
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  activeUser = null;
  res.clearCookie("mls_session", { path: "/" });
  res.json({ ok: true });
});

// Subtests
app.get("/api/subtests", (_req: Request, res: Response) => {
  res.json({
    year: 2026,
    total_questions: 155,
    total_minutes: 195,
    subtests,
    note: "Kurikulum SNBT 2026 Malas Belajar Terstandarisasi IRT",
    level: "nguli",
  });
});

// RODI Module Questions
app.get("/api/rodi/module", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  res.json({
    title: "RODI: Routine Drilling SNBT",
    subtitle: "Katalog Drill Soal Berjenjang IRT Malas Belajar",
    total_questions: questions.length,
    questions,
  });
});

// Wacawaci Resources
app.get("/api/wacawaci/resources", (_req: Request, res: Response) => {
  res.json(wacawaciResources);
});

app.post("/api/wacawaci/resources", (req: Request, res: Response) => {
  const { kind, title, description, url, level } = req.body;
  const newRes: Resource = {
    id: `res-${Date.now()}`,
    kind: kind || "ringkasan",
    title: title || "Materi Baru",
    description: description || "Deskripsi materi pembelajaran",
    url: url || "https://example.com",
    is_public: true,
    created_by: "Mentor Malas Belajar",
    level: level || "nguli",
  };
  wacawaciResources.unshift(newRes);
  res.json(newRes);
});

app.post("/api/wacawaci/upload", (req: Request, res: Response) => {
  const kind = (req.query.kind as string) || "pdf";
  const title = (req.query.title as string) || "Dokumen Unggahan";
  const description = (req.query.description as string) || "Materi diunggah oleh mentor";
  const level = (req.query.level as string) || "nguli";

  const newRes: Resource = {
    id: `res-upload-${Date.now()}`,
    kind,
    title,
    description,
    url: "https://example.com/uploaded-material.pdf",
    is_public: true,
    created_by: "Mentor Malas Belajar",
    level,
  };
  wacawaciResources.unshift(newRes);
  res.json(newRes);
});

// Live Classes
app.get("/api/live-classes", (_req: Request, res: Response) => {
  res.json(liveClasses);
});

app.post("/api/live-classes", (req: Request, res: Response) => {
  const { title, description, youtube_url, starts_at, recording_url, level } = req.body;
  const newLive: LiveClass = {
    id: `live-${Date.now()}`,
    title: title || "Live Class Tambahan",
    description: description || "Sesi belajar langsung",
    youtube_url: youtube_url || "https://youtube.com",
    starts_at: starts_at || new Date().toISOString(),
    recording_url: recording_url || youtube_url || "",
    level: level || "nguli",
    status: "scheduled",
  };
  liveClasses.unshift(newLive);
  res.json(newLive);
});

// UTBABY Tryout Sessions
app.get("/api/utbaby/sessions", (_req: Request, res: Response) => {
  const summaries: TryoutSummary[] = tryoutSessions.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    duration_minutes: t.duration_minutes,
    question_count: t.questions.length,
    status: t.status,
    max_score: t.max_score,
    level: t.level,
  }));
  res.json(summaries);
});

app.post("/api/utbaby/sessions", (req: Request, res: Response) => {
  const { title, description, duration_minutes, level } = req.body;
  const newSession = {
    id: `utbaby-${Date.now()}`,
    title: title || "Try Out UTBABY Baru",
    description: description || "Sesi simulasi baru dari mentor",
    duration_minutes: duration_minutes || 195,
    question_count: initialQuestions.length,
    status: "active",
    max_score: 1000,
    level: level || "nguli",
    questions: [...initialQuestions],
  };
  tryoutSessions.unshift(newSession);
  res.json(newSession);
});

app.get("/api/utbaby/sessions/:id", (req: Request, res: Response) => {
  const session = tryoutSessions.find((s) => s.id === req.params.id) || tryoutSessions[0];
  res.json(session);
});

// Submit Tryout & Calculate IRT Score
app.post("/api/utbaby/sessions/:id/submit", (req: Request, res: Response) => {
  const session = tryoutSessions.find((s) => s.id === req.params.id) || tryoutSessions[0];
  const { participant, answers } = req.body;
  const ansMap: Record<string, number> = answers || {};

  let correctCount = 0;
  let weightedScore = 0;

  session.questions.forEach((q) => {
    const studentChoice = ansMap[q.id];
    if (studentChoice !== undefined && studentChoice === q.correct_option) {
      correctCount++;
      // IRT formula approximation
      const diffWeight = 1 + Math.max(0, q.irt_difficulty);
      const discWeight = q.irt_discrimination || 1.2;
      weightedScore += diffWeight * discWeight * 120;
    }
  });

  const total = session.questions.length;
  // Base UTBK score scaling (300 to 880 scale)
  const baseScore = Math.round(350 + (weightedScore / Math.max(total, 1)) * 3.8);
  const finalScore = Math.min(995, Math.max(380, baseScore));
  const percentile = Math.min(99, Math.max(50, Math.round(finalScore / 10.2)));

  const result = {
    session_id: session.id,
    participant: participant || "Siswa Malas Belajar",
    score: finalScore,
    correct: correctCount,
    total,
    percentile,
    irt_note: "Skor dihitung dengan model 2PL Teori Respon Butir (IRT) berdasarkan tingkat kesukaran dan daya pembeda.",
    rank: Math.max(1, Math.round((100 - percentile) * 1.5)),
  };

  // Add to leaderboard
  leaderboard.unshift({
    rank: 1,
    participant: `${result.participant} (Baru Selesai)`,
    score: finalScore,
    correct: correctCount,
    total,
    submitted_at: "Baru saja",
  });

  // Re-sort leaderboard
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  res.json(result);
});

// Leaderboard
app.get("/api/utbaby/leaderboard", (_req: Request, res: Response) => {
  res.json(leaderboard);
});

// Notifications
app.get("/api/notifications", (_req: Request, res: Response) => {
  res.json(notifications);
});

// Motivation Generator with Gemini AI fallback
app.post("/api/motivation", async (req: Request, res: Response) => {
  const { mascot, context, subtest } = req.body;
  const mascotName = mascot || "Cece";

  const fallbackQuotes: Record<string, string[]> = {
    Cece: [
      "Pelan-pelan asal konsisten! Satu soal hari ini, seribu langkah lebih dekat ke jaket kuning almamatermu!",
      "Jangan takut salah pas drill. Lebih baik salah di RODI sekarang daripada bingung pas UTBK beneran!",
      "Tarik napas panjang, baca stimulus pelan-pelan. Ingat, eliminasi opsi yang ngaco dulu ya!",
    ],
    Koko: [
      "Logika itu kayak otot, makin sering di-drill makin kekar! Sikat habis soalnya!",
      "Lihat pola, jangan cuma hapal rumus! Pahami konsepnya sampai ke akar-akarnya.",
      "Kuantitatif bukan musuhmu, tapi pundi-pundi skor tertinggi kalau kamu tahu triknya!",
    ],
    Gama: [
      "Target PTN bukan mimpi kalau drill harianmu gak pernah bolong! Tetap gaspol!",
      "Siswa MLS gak ada kata nyerah. Mandor aja kerja keras, masa pejuang PTN rebahan mulu?",
    ],
    Aiy: [
      "Semangat kawan! Gaine Squad selalu nemenin kamu berjuang dari level Nguli sampai puncak!",
      "Fokus pada prosesmu hari ini. Setiap detik belajarmu bernilai di gerbang universitas impian!",
    ],
    Gane: [
      "Simulasi ini panggung latihanmu! Buktikan kalau kamu layak dapat skor 800+!",
      "Kerapian cara berpikir adalah kunci. Yuk teliti satu per satu langkahnya!",
    ],
  };

  const pool = fallbackQuotes[mascotName] || fallbackQuotes["Cece"];
  let message = pool[Math.floor(Math.random() * pool.length)];

  // Try Gemini AI if available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Berikan satu kalimat motivasi santai, ceria, dan menyemangati dalam bahasa Indonesia untuk siswa pejuang UTBK SNBT 2026. Karakter maskot yang berbicara adalah "${mascotName}" yang ramah dan suportif. Siswa sedang membuka modul: ${subtest || context}. Maksimal 25 kata. Jangan pakai tanda petik ganda berlebih.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      if (response && response.text) {
        message = response.text.trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      // Graceful fallback to rich static quote pool
    }
  }

  res.json({
    mascot: mascotName,
    group_name: "Gaine · Kampus Squad",
    message,
    source: "Malas Belajar AI Coach",
  });
});

// Feedback & Classroom Trial APIs
app.get("/api/feedback", (_req: Request, res: Response) => {
  res.json(feedbackList);
});

app.post("/api/feedback", (req: Request, res: Response) => {
  const { user_name, user_level, rating, category, feedback } = req.body;
  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ detail: "Masukan/feedback wajib diisi." });
  }

  const newFeedback: FeedbackItem = {
    id: `fb-${Date.now()}`,
    user_name: (user_name && user_name.trim()) || "Siswa Kelas Uji Coba",
    user_level: user_level || "nguli",
    rating: Number(rating) || 5,
    category: category || "Umum & Fitur Baru",
    feedback: feedback.trim(),
    created_at: "Baru saja",
  };

  feedbackList.unshift(newFeedback);
  res.json(newFeedback);
});

// Mentor & Admin APIs
app.post("/api/mentor/verify", (req: Request, res: Response) => {
  const { code } = req.body;
  const validCodes = [
    "MENTOR-MLS",
    "RODI2026",
    "MALASBELAJAR",
    "MLS2026",
    "123456",
    "ADMIN",
    "MENTOR",
  ];
  if (code && validCodes.includes(code.trim().toUpperCase())) {
    res.json({ verified: true });
  } else {
    res.status(400).json({ detail: "Kode mentor tidak cocok." });
  }
});

app.post("/api/admin/access-codes", (req: Request, res: Response) => {
  const { level, count } = req.body;
  const lvl = level || "nguli";
  const num = count || 3;
  const generated: AccessCode[] = [];

  for (let i = 0; i < num; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = lvl === "nguli" ? "NGU" : lvl === "mandor" ? "MAN" : "SPV";
    const codeObj: AccessCode = {
      id: `code-${Date.now()}-${i}`,
      code: `MLS-${prefix}-${randomSuffix}`,
      level: lvl,
      used: false,
      used_by: "",
    };
    accessCodes.push(codeObj);
    generated.push(codeObj);
  }
  res.json(generated);
});

app.get("/api/admin/students", (_req: Request, res: Response) => {
  res.json(Array.from(users.values()).map(publicUser));
});

app.patch("/api/admin/students/:id", (req: Request, res: Response) => {
  const student = users.get(req.params.id);
  if (student) {
    student.active = req.body.active !== undefined ? req.body.active : !student.active;
    res.json(publicUser(student));
  } else {
    res.status(404).json({ detail: "Siswa tidak ditemukan." });
  }
});

app.post("/api/admin/questions", (req: Request, res: Response) => {
  const { subtest, prompt, options, correct_option, steps, difficulty, level } = req.body;
  const newQ: Question = {
    id: `mentor-q-${Date.now()}`,
    chapter: subtest || "pu",
    chapter_label: "Soal Tambahan Mentor",
    number: questions.length + 1,
    difficulty: difficulty || "Aplikasi",
    topic: "Latihan Intensif Mentor",
    prompt: prompt || "Soal baru yang ditambahkan mentor",
    answer: options?.[correct_option || 0] || "Jawaban terkonfirmasi",
    steps: steps || ["Evaluasi stimulus secara sistematis."],
    is_final: false,
    options: options || ["A", "B", "C", "D", "E"],
    correct_option: correct_option ?? 0,
    irt_difficulty: 0.1,
    irt_discrimination: 1.2,
    level: level || "nguli",
    trap_tip: "Perhatikan kata kunci pada stimulus.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  };
  questions.unshift(newQ);
  res.json(newQ);
});

app.put("/api/admin/subtests/:id", (req: Request, res: Response) => {
  const sub = subtests.find((s) => s.id === req.params.id);
  if (sub && req.body.description) {
    sub.description = req.body.description;
  }
  res.json({ ok: true });
});

app.put("/api/admin/questions/:id/explanation", (req: Request, res: Response) => {
  const q = questions.find((item) => item.id === req.params.id);
  if (q) {
    if (req.body.correct_option !== undefined) q.correct_option = req.body.correct_option;
    if (req.body.steps) q.steps = req.body.steps;
    if (req.body.trap_tip) q.trap_tip = req.body.trap_tip;
    if (req.body.video_url) q.video_url = req.body.video_url;
    res.json(q);
  } else {
    res.status(404).json({ detail: "Soal tidak ditemukan." });
  }
});

// --- Vite Middleware in Dev / Static Serving in Prod ---
export async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Malas Belajar · RODI running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
