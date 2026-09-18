import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useToast } from "../../lib/toast";
import { Badge, Button, Card, FullPageLoader, Input, Textarea } from "../../components/ui";

interface ActivityBase {
  id: number;
  session_id: number;
  type: "checkin" | "checkout" | "quiz" | "wordcloud" | "dynamic" | "survey";
  name: string;
  description: string;
  status: "draft" | "open" | "closed";
  config: any;
  points_config: any;
}

export default function ActivityRunner() {
  const { token } = useParams<{ token: string }>();
  const [activity, setActivity] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get<ActivityBase>(`/api/activity/${token}`)
      .then(setActivity)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar atividade"));
  }, [token]);

  useEffect(() => {
    if (!activity?.id) return;
    const socket = getSocket();
    socket.emit("join:activity", activity.id);
    return () => {
      socket.emit("leave:activity", activity.id);
    };
  }, [activity?.id]);

  if (error) {
    return (
      <Card className="max-w-md mx-auto text-center py-10">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="font-semibold text-rose-600">{error}</p>
        <Link to="/app" className="text-brand-600 text-sm font-semibold mt-4 inline-block">
          Voltar ao início
        </Link>
      </Card>
    );
  }

  if (!activity) return <FullPageLoader />;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="text-center">
        <Badge color={activity.status === "open" ? "green" : "slate"}>{activity.status === "open" ? "Ao vivo" : activity.status}</Badge>
        <h1 className="text-2xl font-extrabold text-ink-950 mt-2">{activity.name}</h1>
        {activity.description && <p className="text-slate-500 text-sm mt-1">{activity.description}</p>}
      </div>

      {activity.status === "draft" && (
        <Card className="text-center py-8 text-slate-400">
          Esta atividade ainda não foi liberada pelo facilitador. Aguarde...
        </Card>
      )}

      {activity.status !== "draft" && activity.type === "checkin" && <CheckinView token={token!} activity={activity} />}
      {activity.status !== "draft" && activity.type === "checkout" && <CheckoutView token={token!} activity={activity} />}
      {activity.type === "quiz" && <QuizView token={token!} activity={activity} />}
      {activity.status !== "draft" && activity.type === "wordcloud" && <WordcloudView token={token!} activity={activity} />}
      {activity.status !== "draft" && activity.type === "dynamic" && <DynamicView token={token!} activity={activity} />}
      {activity.status !== "draft" && activity.type === "survey" && <SurveyView token={token!} activity={activity} />}
    </div>
  );
}

const statusLabel: Record<string, string> = { early: "adiantado", on_time: "no horário", late: "atrasado" };

function CheckinView({ token, activity }: { token: string; activity: any }) {
  const [result, setResult] = useState<any>(activity.already);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function doCheckin() {
    setLoading(true);
    try {
      const res = await api.post<any>(`/api/checkin/${token}`);
      setResult({ status: res.status, points_earned: res.points });
      toast(`Check-in realizado! +${res.points} pontos`, "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao fazer check-in", "error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Card className="text-center py-8 animate-pop">
        <div className="text-4xl mb-3">✅</div>
        <div className="font-bold text-lg text-ink-950">Check-in confirmado!</div>
        <p className="text-slate-500 text-sm mt-1">
          Você chegou {statusLabel[result.status] || result.status}
        </p>
        <div className="text-2xl font-extrabold text-emerald-600 mt-3">+{result.points_earned} pontos</div>
      </Card>
    );
  }

  return (
    <Card className="text-center py-8">
      <div className="text-4xl mb-3">🎯</div>
      <p className="text-slate-500 text-sm mb-5">Confirme sua presença neste encontro</p>
      <Button onClick={doCheckin} disabled={loading} size="lg" className="w-full">
        {loading ? "Confirmando..." : "Fazer Check-in"}
      </Button>
    </Card>
  );
}

function CheckoutView({ token, activity }: { token: string; activity: any }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const already = activity.already;

  async function doCheckout() {
    setLoading(true);
    try {
      const res = await api.post<any>(`/api/checkout/${token}`);
      setResult(res);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao fazer check-out", "error");
    } finally {
      setLoading(false);
    }
  }

  if (result || already) {
    return (
      <Card className="text-center py-8 animate-pop">
        <div className="text-4xl mb-2">🎉</div>
        <div className="font-bold text-lg text-ink-950">Treinamento concluído!</div>
        {result && (
          <>
            <p className="text-slate-500 text-sm mt-2">Você ganhou:</p>
            <div className="text-2xl font-extrabold text-emerald-600">+{result.points} pontos</div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center gap-8 text-sm">
              <div>
                <div className="text-slate-400 text-xs">Sua pontuação total</div>
                <div className="font-bold text-ink-950">{result.totalPoints}</div>
              </div>
              {result.position && (
                <div>
                  <div className="text-slate-400 text-xs">Sua posição</div>
                  <div className="font-bold text-ink-950">{result.position}º lugar</div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="text-center py-8">
      <div className="text-4xl mb-3">👋</div>
      <p className="text-slate-500 text-sm mb-5">Finalize sua participação no encontro de hoje</p>
      <Button onClick={doCheckout} disabled={loading} size="lg" className="w-full" variant="accent">
        {loading ? "Finalizando..." : "Finalizar treinamento"}
      </Button>
    </Card>
  );
}

function QuizView({ token, activity }: { token: string; activity: any }) {
  const [question, setQuestion] = useState<any>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set(activity.answeredQuestionIds || []));
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<"waiting" | "question" | "answered" | "reveal" | "closed">(
    activity.status === "closed" ? "closed" : "waiting"
  );
  const [reveal, setReveal] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const startRef = useRef<number>(0);
  const toast = useToast();

  useEffect(() => {
    const socket = getSocket();
    function onStart(payload: any) {
      setQuestion(payload);
      setSelected(null);
      setReveal(null);
      startRef.current = Date.now();
      setTimeLeft(payload.timeLimitSeconds);
      setPhase(answeredIds.has(payload.questionId) ? "answered" : "question");
    }
    function onReveal(payload: any) {
      setReveal(payload);
      setPhase("reveal");
    }
    function onStatus(payload: any) {
      if (payload.status === "closed") setPhase("closed");
    }
    socket.on("quiz:question:start", onStart);
    socket.on("quiz:question:reveal", onReveal);
    socket.on("activity:status", onStatus);
    return () => {
      socket.off("quiz:question:start", onStart);
      socket.off("quiz:question:reveal", onReveal);
      socket.off("activity:status", onStatus);
    };
  }, [answeredIds]);

  useEffect(() => {
    if (phase !== "question") return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, question.timeLimitSeconds - elapsed);
      setTimeLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [phase, question]);

  async function submitAnswer(index: number) {
    if (!question) return;
    setSelected(index);
    setPhase("answered");
    const responseTimeMs = Date.now() - startRef.current;
    try {
      const res = await api.post<any>(`/api/activity/${token}/quiz-answer`, {
        question_id: question.questionId,
        selected_index: index,
        response_time_ms: responseTimeMs,
      });
      setAnsweredIds((prev) => new Set(prev).add(question.questionId));
      toast(res.correct ? `Correto! +${res.points} pontos` : "Resposta registrada", res.correct ? "success" : "error");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao enviar resposta", "error");
    }
  }

  if (phase === "closed") {
    return (
      <Card className="text-center py-8 text-slate-400">
        <div className="text-3xl mb-2">🏁</div>
        Quiz encerrado. Confira o ranking!
      </Card>
    );
  }

  if (phase === "waiting" || !question) {
    return (
      <Card className="text-center py-10">
        <div className="text-3xl mb-3 animate-pulse-ring inline-block rounded-full p-2">⏳</div>
        <p className="text-slate-500 text-sm mt-2">Aguardando o facilitador iniciar a próxima pergunta...</p>
      </Card>
    );
  }

  const pct = question.timeLimitSeconds > 0 ? (timeLeft / question.timeLimitSeconds) * 100 : 0;
  const colors = ["bg-brand-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500"];

  return (
    <Card className="animate-pop">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase">Pergunta</span>
        <span className="text-sm font-bold text-brand-600">{Math.ceil(timeLeft)}s</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
        <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-bold text-lg text-ink-950 mb-5">{question.question}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt: string, idx: number) => {
          const isSelected = selected === idx;
          const isCorrect = reveal && idx === reveal.correctIndex;
          const isWrongSelected = reveal && isSelected && idx !== reveal.correctIndex;
          return (
            <button
              key={idx}
              disabled={phase !== "question"}
              onClick={() => submitAnswer(idx)}
              className={`px-4 py-4 rounded-xl font-semibold text-white text-left transition disabled:opacity-90 ${
                isCorrect ? "bg-emerald-500 ring-4 ring-emerald-200" : isWrongSelected ? "bg-rose-500" : isSelected ? "bg-brand-700" : colors[idx % colors.length]
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {phase === "answered" && !reveal && (
        <p className="text-center text-sm text-slate-400 mt-4">Resposta enviada! Aguardando os demais participantes...</p>
      )}
      {reveal && (
        <div className="text-center mt-5 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">{reveal.totalResponses} participantes responderam</p>
        </div>
      )}
    </Card>
  );
}

function WordcloudView({ token, activity }: { token: string; activity: any }) {
  const [words, setWords] = useState<Array<{ w: string; count: number }>>(activity.words || []);
  const [input, setInput] = useState("");
  const [sent, setSent] = useState((activity.myWords || []).length > 0 && !activity.config.allow_multiple);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const socket = getSocket();
    function onUpdate(payload: any) {
      setWords(payload.words);
    }
    socket.on("wordcloud:update", onUpdate);
    return () => {
      socket.off("wordcloud:update", onUpdate);
    };
  }, [activity.id]);

  const maxCount = Math.max(1, ...words.map((w) => w.count));

  async function submit() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<any>(`/api/activity/${token}/wordcloud`, { word: input.trim() });
      setInput("");
      if (res.points > 0) toast(`Palavra enviada! +${res.points} pontos`, "success");
      if (!activity.config.allow_multiple) setSent(true);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao enviar palavra", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!sent && (
        <Card className="flex gap-2">
          <Input
            value={input}
            maxLength={activity.config.max_chars || 30}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma palavra..."
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button onClick={submit} disabled={loading}>
            Enviar
          </Button>
        </Card>
      )}
      {sent && <Card className="text-center text-sm text-emerald-600 font-semibold py-4">Palavra enviada! Veja a nuvem em tempo real abaixo ✨</Card>}

      <Card className="min-h-[220px] flex flex-wrap items-center justify-center gap-3 py-8 !bg-ink-950">
        {words.length === 0 && <p className="text-white/30 text-sm">Aguardando as primeiras respostas...</p>}
        {words.map((w, i) => (
          <span
            key={w.w}
            className="font-extrabold text-brand-300 animate-float"
            style={{
              fontSize: `${14 + (w.count / maxCount) * 34}px`,
              animationDelay: `${i * 0.15}s`,
              color: ["#818cf8", "#f97316", "#22c55e", "#ec4899", "#06b6d4"][i % 5],
            }}
          >
            {w.w}
          </span>
        ))}
      </Card>
    </div>
  );
}

function DynamicView({ token, activity }: { token: string; activity: any }) {
  const [done, setDone] = useState<any>(activity.already);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function complete() {
    setLoading(true);
    try {
      const res = await api.post<any>(`/api/activity/${token}/dynamic-complete`);
      setDone({ points_earned: res.points });
      toast(`Concluído! +${res.points} pontos`, "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao concluir", "error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="text-center py-8 animate-pop">
        <div className="text-4xl mb-2">🙌</div>
        <div className="font-bold text-ink-950">Dinâmica concluída!</div>
        <div className="text-2xl font-extrabold text-emerald-600 mt-2">+{done.points_earned} pontos</div>
      </Card>
    );
  }

  return (
    <Card className="text-center py-8">
      <div className="text-4xl mb-3">🧩</div>
      {activity.config?.time_minutes && (
        <Badge color="orange" className="mb-3">
          ⏱️ {activity.config.time_minutes} minutos
        </Badge>
      )}
      <Button onClick={complete} disabled={loading} size="lg" className="w-full">
        {loading ? "Enviando..." : "Marcar como concluído"}
      </Button>
    </Card>
  );
}

function SurveyView({ token, activity }: { token: string; activity: any }) {
  const [answers, setAnswers] = useState<Record<number, { answer_text?: string; answer_rating?: number }>>({});
  const [submitted, setSubmitted] = useState((activity.answeredQuestionIds || []).length >= (activity.questions || []).length && activity.questions?.length > 0);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const questions = useMemo(() => activity.questions || [], [activity.questions]);

  function setAnswer(id: number, value: { answer_text?: string; answer_rating?: number }) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function submit() {
    setLoading(true);
    try {
      const payload = questions.map((q: any) => ({ question_id: q.id, ...answers[q.id] }));
      const res = await api.post<any>(`/api/activity/${token}/survey`, { answers: payload });
      setSubmitted(true);
      if (res.points > 0) toast(`Obrigado pelo feedback! +${res.points} pontos`, "success");
      else toast("Obrigado pelo feedback!", "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao enviar pesquisa", "error");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card className="text-center py-8 animate-pop">
        <div className="text-4xl mb-2">🙏</div>
        <div className="font-bold text-ink-950">Obrigado por responder!</div>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      {questions.map((q: any) => (
        <div key={q.id}>
          <p className="font-semibold text-sm text-slate-800 mb-2">{q.question}</p>
          {q.type === "rating" && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setAnswer(q.id, { answer_rating: star })}
                  className={`text-2xl transition ${(answers[q.id]?.answer_rating || 0) >= star ? "" : "grayscale opacity-40"}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          )}
          {q.type === "choice" && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(q.id, { answer_text: opt })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    answers[q.id]?.answer_text === opt ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-brand-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.type === "open" && (
            <Textarea rows={3} value={answers[q.id]?.answer_text || ""} onChange={(e) => setAnswer(q.id, { answer_text: e.target.value })} />
          )}
        </div>
      ))}
      <Button onClick={submit} disabled={loading} className="w-full" size="lg">
        {loading ? "Enviando..." : "Enviar respostas"}
      </Button>
    </Card>
  );
}
