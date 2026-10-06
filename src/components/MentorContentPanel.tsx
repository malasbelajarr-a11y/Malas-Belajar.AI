import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Level = "nguli" | "mandor" | "supervisor";
type Question = {
  id: string;
  chapter_label?: string;
  topic?: string;
  prompt?: string;
  level?: string;
  options?: string[];
};
type Resource = {
  id: string;
  kind: string;
  title: string;
  description?: string;
  url: string;
  level?: string;
  subtest?: string;
};

const levels: Level[] = ["nguli", "mandor", "supervisor"];

export default function MentorContentPanel() {
  const [level, setLevel] = useState<Level>("nguli");
  const [tab, setTab] = useState<"wacawaci" | "questions">("wacawaci");
  const [resources, setResources] = useState<Resource[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [w, q] = await Promise.all([
        fetch(`/api/mentor-content-v2?action=wacawaci&level=${level}`, { cache: "no-store" }),
        fetch(`/api/mentor-content-v2?action=student-questions&level=${level}`, { cache: "no-store" }),
      ]);
      const wData = await w.json().catch(() => []);
      const qData = await q.json().catch(() => []);
      if (!w.ok) throw new Error(wData?.detail || "Wacawaci gagal dimuat.");
      if (!q.ok) throw new Error(qData?.detail || "Soal mentor gagal dimuat.");
      setResources(Array.isArray(wData) ? wData : (Array.isArray(wData?.items) ? wData.items : []));
      setQuestions(Array.isArray(qData) ? qData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat konten.");
      setResources([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [level]);

  return (
    <div className="mt-5 rounded-xl border-2 border-violet-700 bg-white p-4 text-violet-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">KONTEN WACAWACI + SOAL MENTOR</h3>
          <p className="text-xs text-slate-500">Konten yang masuk ke siswa, dipisah berdasarkan level.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {levels.map((item) => (
            <Button key={item} size="sm" variant={level === item ? "default" : "outline"} onClick={() => setLevel(item)}>
              {item.toUpperCase()}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "MEMUAT..." : "REFRESH"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={tab === "wacawaci" ? "default" : "outline"} onClick={() => setTab("wacawaci")}>
          WACAWACI ({resources.length})
        </Button>
        <Button size="sm" variant={tab === "questions" ? "default" : "outline"} onClick={() => setTab("questions")}>
          SOAL MENTOR ({questions.length})
        </Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      {tab === "wacawaci" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {resources.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border-2 border-violet-100 p-4 hover:bg-violet-50">
              <div className="flex items-center justify-between gap-2">
                <strong>{item.title}</strong>
                <Badge>{item.kind}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.subtest || "—"} · {item.level || "all"}</p>
              {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
            </a>
          ))}
          {!loading && !resources.length && !error && <p className="py-8 text-center text-sm text-slate-500 md:col-span-2">Belum ada Wacawaci untuk level ini.</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {questions.map((item, index) => (
            <div key={item.id || index} className="rounded-xl border-2 border-violet-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.chapter_label || "Soal Mentor"}</Badge>
                <span className="text-xs text-slate-500">{item.topic || "Tanpa topik"}</span>
              </div>
              <p className="mt-2 font-bold">{item.prompt || "—"}</p>
              {Array.isArray(item.options) && item.options.length > 0 && (
                <ol className="mt-2 list-[upper-alpha] pl-6 text-sm text-slate-600">
                  {item.options.map((option, i) => <li key={i}>{option}</li>)}
                </ol>
              )}
            </div>
          ))}
          {!loading && !questions.length && !error && <p className="py-8 text-center text-sm text-slate-500">Belum ada soal mentor untuk level ini.</p>}
        </div>
      )}
    </div>
  );
}
