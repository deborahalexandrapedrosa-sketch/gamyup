import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";

type View = "overview" | "ranking" | "wordcloud" | "quiz";

export default function PresentationPage() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [view, setView] = useState<View>("overview");
  const [activeQr, setActiveQr] = useState<{ name: string; dataUrl: string } | null>(null);
  const [words, setWords] = useState<Array<{ w: string; count: number }>>([]);
  const [wordcloudActivityId, setWordcloudActivityId] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<any>(null);

  function load() {
    api.get<any>(`/api/admin/sessions/${id}`).then(setSession);
    api.get<any>(`/api/admin/sessions/${id}/live`).then(setLive);
  }
  useEffect(load, [id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("join:session", Number(id));
    const wc = session?.activities?.find((a: any) => a.type === "wordcloud");
    if (wc) {
      socket.emit("join:activity", wc.id);
      setWordcloudActivityId(wc.id);
    }
    const quiz = session?.activities?.find((a: any) => a.type === "quiz");
    if (quiz) socket.emit("join:activity", quiz.id);

    function refreshLive() {
      api.get<any>(`/api/admin/sessions/${id}/live`).then(setLive);
    }
    function onWordcloud(p: any) {
      setWords(p.words);
      setView("wordcloud");
    }
    function onQuizStart(p: any) {
      setQuizState({ phase: "question", ...p });
      setView("quiz");
    }
    function onQuizReveal(p: any) {
      setQuizState((prev: any) => ({ ...prev, phase: "reveal", reveal: p }));
    }
    socket.on("checkin:new", refreshLive);
    socket.on("ranking:update", refreshLive);
    socket.on("wordcloud:update", onWordcloud);
    socket.on("quiz:question:start", onQuizStart);
    socket.on("quiz:question:reveal", onQuizReveal);

    return () => {
      socket.off("checkin:new", refreshLive);
      socket.off("ranking:update", refreshLive);
      socket.off("wordcloud:update", onWordcloud);
      socket.off("quiz:question:start", onQuizStart);
      socket.off("quiz:question:reveal", onQuizReveal);
    };
  }, [id, session?.id]);

  async function loadQr() {
    const checkin = session.activities.find((a: any) => a.type === "checkin");
    if (!checkin) return;
    const data = await api.get<any>(`/api/admin/activities/${checkin.id}/qrcode`);
    setActiveQr({ name: checkin.name, dataUrl: data.dataUrl });
    setView("overview");
  }

  if (!session || !live) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  const maxCount = Math.max(1, ...words.map((w) => w.count));

  return (
    <div className="min-h-screen bg-hero text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to={`/admin/sessions/${id}`} className="text-white/50 hover:text-white text-sm font-semibold">
          ← Sair do modo apresentação
        </Link>
        <div className="font-bold">{session.name}</div>
        <div className="text-sm text-white/50">{live.checkins} check-ins · {live.enrolled} matriculados</div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        {view === "overview" && !activeQr && (
          <div className="text-center animate-pop">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{session.name}</h1>
            <p className="text-xl text-white/60">Bem-vindos! Selecione uma visualização abaixo para começar 👇</p>
          </div>
        )}

        {view === "overview" && activeQr && (
          <div className="text-center animate-pop">
            <h2 className="text-2xl font-bold mb-2">ESCANEIE O QR CODE</h2>
            <p className="text-white/60 mb-6">{activeQr.name}</p>
            <img src={activeQr.dataUrl} className="mx-auto rounded-2xl shadow-2xl" width={360} height={360} />
          </div>
        )}

        {view === "ranking" && (
          <div className="w-full max-w-2xl animate-pop">
            <h2 className="text-3xl font-extrabold text-center mb-8">🏆 Ranking</h2>
            <div className="space-y-3">
              {live.ranking.slice(0, 8).map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-3.5">
                  <div className="text-2xl font-extrabold w-10">{["🥇", "🥈", "🥉"][i] || `${i + 1}º`}</div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold" style={{ background: r.avatar_color }}>
                    {r.name[0]}
                  </div>
                  <div className="flex-1 text-lg font-semibold">{r.name}</div>
                  <div className="text-xl font-extrabold text-brand-300">{r.total} pts</div>
                </div>
              ))}
              {live.ranking.length === 0 && <p className="text-center text-white/40">Aguardando pontuações...</p>}
            </div>
          </div>
        )}

        {view === "wordcloud" && (
          <div className="w-full max-w-4xl text-center animate-pop">
            <h2 className="text-2xl font-bold mb-8 text-white/70">Chuva de Palavras</h2>
            <div className="flex flex-wrap items-center justify-center gap-5">
              {words.length === 0 && <p className="text-white/40">Aguardando respostas...</p>}
              {words.map((w, i) => (
                <span
                  key={w.w}
                  className="font-extrabold animate-float"
                  style={{
                    fontSize: `${18 + (w.count / maxCount) * 60}px`,
                    animationDelay: `${i * 0.15}s`,
                    color: ["#818cf8", "#f97316", "#22c55e", "#ec4899", "#06b6d4", "#eab308"][i % 6],
                  }}
                >
                  {w.w}
                </span>
              ))}
            </div>
          </div>
        )}

        {view === "quiz" && quizState && (
          <div className="w-full max-w-3xl text-center animate-pop">
            <p className="text-lg text-white/50 mb-2">Você tem {quizState.timeLimitSeconds} segundos!</p>
            <h2 className="text-3xl font-extrabold mb-8">{quizState.question}</h2>
            <div className="grid grid-cols-2 gap-4">
              {quizState.options.map((opt: string, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-2xl px-6 py-8 text-xl font-bold ${
                    quizState.phase === "reveal" && idx === quizState.reveal?.correctIndex
                      ? "bg-emerald-500"
                      : ["bg-brand-500", "bg-orange-500", "bg-rose-500", "bg-cyan-600"][idx % 4]
                  }`}
                >
                  {opt}
                  {quizState.phase === "reveal" && (
                    <div className="text-sm font-normal mt-2 opacity-80">{quizState.reveal?.optionCounts?.[idx] ?? 0} respostas</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center gap-2 flex-wrap pb-8 px-4">
        <button onClick={loadQr} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">
          📱 QR Check-in
        </button>
        <button onClick={() => setView("ranking")} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">
          🏆 Ranking
        </button>
        {wordcloudActivityId && (
          <button onClick={() => setView("wordcloud")} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">
            ☁️ Chuva de Palavras
          </button>
        )}
        {quizState && (
          <button onClick={() => setView("quiz")} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">
            🧠 Quiz
          </button>
        )}
      </footer>
    </div>
  );
}
