import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useToast } from "../../lib/toast";
import { Badge, Button, Card, FullPageLoader, Input, Label, Modal, Select, StatTile, Textarea } from "../../components/ui";

const typeIcons: Record<string, string> = {
  checkin: "🎯",
  checkout: "👋",
  quiz: "🧠",
  wordcloud: "☁️",
  dynamic: "🧩",
  survey: "📊",
};
const typeLabels: Record<string, string> = {
  checkin: "Check-in",
  checkout: "Check-out",
  quiz: "Quiz",
  wordcloud: "Chuva de Palavras",
  dynamic: "Dinâmica",
  survey: "Pesquisa",
};

export default function SessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [qrModal, setQrModal] = useState<{ open: boolean; data?: any; name?: string }>({ open: false });
  const [newActivityModal, setNewActivityModal] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const toast = useToast();

  function load() {
    api.get<any>(`/api/admin/sessions/${id}`).then(setSession);
    api.get<any>(`/api/admin/sessions/${id}/live`).then(setLive);
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("join:session", Number(id));
    function refreshLive() {
      api.get<any>(`/api/admin/sessions/${id}/live`).then(setLive);
    }
    socket.on("checkin:new", refreshLive);
    socket.on("ranking:update", refreshLive);
    socket.on("dynamic:update", refreshLive);
    socket.on("activity:status", () => {
      load();
      refreshLive();
    });
    return () => {
      socket.emit("leave:session", Number(id));
      socket.off("checkin:new", refreshLive);
      socket.off("ranking:update", refreshLive);
      socket.off("dynamic:update", refreshLive);
      socket.off("activity:status");
    };
  }, [id]);

  async function toggleSession(action: "open" | "close") {
    await api.post(`/api/admin/sessions/${id}/${action}`);
    toast(action === "open" ? "Encontro aberto" : "Encontro encerrado");
    load();
  }

  async function toggleActivity(activityId: number, action: "open" | "close") {
    await api.post(`/api/admin/activities/${activityId}/${action}`);
    load();
  }

  async function deleteActivity(activityId: number) {
    if (!confirm("Remover esta atividade?")) return;
    await api.delete(`/api/admin/activities/${activityId}`);
    load();
  }

  async function showQr(activityId: number, name: string) {
    const data = await api.get<any>(`/api/admin/activities/${activityId}/qrcode`);
    setQrModal({ open: true, data, name });
  }

  if (!session || !live) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <Link to={`/admin/classes/${session.class_id}`} className="text-sm text-slate-400 hover:text-brand-600">
        ← Voltar à turma
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-ink-950">{session.name}</h1>
            <Badge color={session.status === "open" ? "green" : session.status === "closed" ? "slate" : "orange"}>
              {session.status === "open" ? "Em andamento" : session.status === "closed" ? "Encerrado" : "Agendado"}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {new Date(session.date + "T00:00:00").toLocaleDateString("pt-BR")} às {session.start_time}
            {session.location ? ` · 📍 ${session.location}` : ""} · Tolerância: {session.checkin_tolerance_minutes} min
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/sessions/${id}/present`}>
            <Button variant="secondary">🖥️ Modo Apresentação</Button>
          </Link>
          {session.status !== "open" ? (
            <Button onClick={() => toggleSession("open")}>Abrir encontro</Button>
          ) : (
            <Button variant="danger" onClick={() => toggleSession("close")}>
              Encerrar encontro
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Matriculados" value={live.enrolled} icon="👥" accent="brand" />
        <StatTile label="Check-ins" value={live.checkins} icon="🎯" accent="green" />
        <StatTile label="Check-outs" value={live.checkouts} icon="👋" accent="orange" />
        <StatTile label="Pontos médios" value={live.mostActive[0]?.total ?? 0} icon="⭐" accent="rose" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-950">Atividades do encontro</h2>
        <Button size="sm" onClick={() => setNewActivityModal(true)}>
          + Nova atividade
        </Button>
      </div>

      <div className="space-y-3">
        {session.activities.map((a: any) => (
          <ActivityCard
            key={a.id}
            activity={a}
            stat={live.activities.find((s: any) => s.id === a.id)}
            expanded={expanded === a.id}
            onToggleExpand={() => setExpanded(expanded === a.id ? null : a.id)}
            onOpen={() => toggleActivity(a.id, "open")}
            onClose={() => toggleActivity(a.id, "close")}
            onDelete={() => deleteActivity(a.id)}
            onShowQr={() => showQr(a.id, a.name)}
            onChanged={load}
          />
        ))}
      </div>

      <Modal open={qrModal.open} onClose={() => setQrModal({ open: false })} title={`QR Code — ${qrModal.name}`}>
        {qrModal.data && (
          <div className="text-center">
            <img src={qrModal.data.dataUrl} alt="QR Code" className="mx-auto rounded-xl border border-slate-100" />
            <p className="text-xs text-slate-400 mt-3 break-all">{qrModal.data.url}</p>
          </div>
        )}
      </Modal>

      <NewActivityModal
        open={newActivityModal}
        onClose={() => setNewActivityModal(false)}
        sessionId={Number(id)}
        onCreated={() => {
          setNewActivityModal(false);
          load();
        }}
      />
    </div>
  );
}

function ActivityCard({ activity, stat, expanded, onToggleExpand, onOpen, onClose, onDelete, onShowQr, onChanged }: any) {
  return (
    <Card>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-2xl">{typeIcons[activity.type]}</div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-bold text-ink-950">{activity.name}</div>
          <div className="text-xs text-slate-400">
            {typeLabels[activity.type]} {stat ? `· ${stat.count} participações` : ""}
          </div>
        </div>
        <Badge color={activity.status === "open" ? "green" : activity.status === "closed" ? "slate" : "orange"}>
          {activity.status === "open" ? "Aberta" : activity.status === "closed" ? "Fechada" : "Rascunho"}
        </Badge>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={onShowQr}>
            QR
          </Button>
          {activity.status === "open" ? (
            <Button size="sm" variant="danger" onClick={onClose}>
              Fechar
            </Button>
          ) : (
            <Button size="sm" onClick={onOpen}>
              Abrir
            </Button>
          )}
          {(activity.type === "quiz" || activity.type === "survey") && (
            <Button size="sm" variant="ghost" onClick={onToggleExpand}>
              {expanded ? "Ocultar" : "Gerenciar"}
            </Button>
          )}
          {activity.type !== "checkin" && activity.type !== "checkout" && (
            <Button size="sm" variant="ghost" onClick={onDelete}>
              🗑️
            </Button>
          )}
        </div>
      </div>

      {expanded && activity.type === "quiz" && <QuizManager activityId={activity.id} onChanged={onChanged} />}
      {expanded && activity.type === "survey" && <SurveyManager activityId={activity.id} onChanged={onChanged} />}
    </Card>
  );
}

function NewActivityModal({ open, onClose, sessionId, onCreated }: any) {
  const [type, setType] = useState("wordcloud");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const toast = useToast();

  async function create() {
    if (!name.trim()) return;
    try {
      const pointsDefaults: Record<string, any> = {
        wordcloud: { per_word: 30 },
        dynamic: { completion: 50 },
        survey: { per_response: 20 },
        quiz: { speed_bonus_max: 20 },
      };
      const configDefaults: Record<string, any> = {
        wordcloud: { allow_multiple: false, anonymous: false, max_chars: 30 },
        dynamic: { time_minutes: 15 },
      };
      await api.post(`/api/admin/sessions/${sessionId}/activities`, {
        type,
        name,
        description,
        points_config: pointsDefaults[type] || {},
        config: configDefaults[type] || {},
      });
      setName("");
      setDescription("");
      onCreated();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar atividade", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Atividade">
      <div className="space-y-4">
        <div>
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="wordcloud">☁️ Chuva de Palavras</option>
            <option value="quiz">🧠 Quiz</option>
            <option value="dynamic">🧩 Dinâmica</option>
            <option value="survey">📊 Pesquisa Rápida</option>
          </Select>
        </div>
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da atividade" />
        </div>
        <div>
          <Label>Descrição / Pergunta</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button className="w-full" onClick={create}>
          Criar atividade
        </Button>
      </div>
    </Modal>
  );
}

function QuizManager({ activityId, onChanged }: { activityId: number; onChanged: () => void }) {
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [live, setLive] = useState<Record<number, { count: number; reveal?: any }>>({});
  const toast = useToast();

  function load() {
    api.get<any>(`/api/admin/activities/${activityId}`).then((a) => setQuestions(a.questions));
  }
  useEffect(load, [activityId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:activity", activityId);
    function onCount(p: any) {
      setLive((prev) => ({ ...prev, [p.questionId]: { ...prev[p.questionId], count: p.count } }));
    }
    function onReveal(p: any) {
      setLive((prev) => ({ ...prev, [p.questionId]: { ...prev[p.questionId], reveal: p } }));
    }
    socket.on("quiz:answer:count", onCount);
    socket.on("quiz:question:reveal", onReveal);
    return () => {
      socket.emit("leave:activity", activityId);
      socket.off("quiz:answer:count", onCount);
      socket.off("quiz:question:reveal", onReveal);
    };
  }, [activityId]);

  async function launch(qid: number) {
    await api.post(`/api/admin/questions/${qid}/launch`);
    toast("Pergunta lançada aos participantes");
  }
  async function reveal(qid: number) {
    await api.post(`/api/admin/questions/${qid}/reveal`);
  }
  async function remove(qid: number) {
    if (!confirm("Remover esta pergunta?")) return;
    await api.delete(`/api/admin/questions/${qid}`);
    load();
    onChanged();
  }

  if (!questions) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">
              {idx + 1}. {q.question}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => launch(q.id)}>
                ▶ Lançar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => reveal(q.id)}>
                👁 Revelar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(q.id)}>
                🗑️
              </Button>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {JSON.parse(q.options).length} alternativas · {q.time_limit_seconds}s · {q.points} pts
            {live[q.id]?.count !== undefined && ` · ${live[q.id].count} respostas`}
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
        + Adicionar pergunta
      </Button>
      <QuestionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        activityId={activityId}
        onCreated={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

function QuestionModal({ open, onClose, activityId, onCreated }: any) {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState("multiple_choice");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [points, setPoints] = useState(100);
  const toast = useToast();

  async function create() {
    const opts = type === "true_false" ? ["Verdadeiro", "Falso"] : options.filter((o) => o.trim());
    if (!question.trim() || opts.length < 2) {
      toast("Preencha a pergunta e ao menos 2 alternativas", "error");
      return;
    }
    try {
      await api.post(`/api/admin/activities/${activityId}/questions`, {
        question,
        type,
        options: opts,
        correct_index: correctIndex,
        time_limit_seconds: timeLimit,
        points,
        speed_bonus_max: 20,
      });
      setQuestion("");
      setOptions(["", "", "", ""]);
      onCreated();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar pergunta", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Pergunta">
      <div className="space-y-4">
        <div>
          <Label>Pergunta</Label>
          <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="multiple_choice">Múltipla escolha</option>
            <option value="true_false">Verdadeiro ou Falso</option>
          </Select>
        </div>
        {type === "multiple_choice" && (
          <div className="space-y-2">
            <Label>Alternativas (marque a correta)</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="radio" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Alternativa ${idx + 1}`}
                />
              </div>
            ))}
          </div>
        )}
        {type === "true_false" && (
          <div>
            <Label>Resposta correta</Label>
            <Select value={correctIndex} onChange={(e) => setCorrectIndex(Number(e.target.value))}>
              <option value={0}>Verdadeiro</option>
              <option value={1}>Falso</option>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tempo (segundos)</Label>
            <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
          </div>
          <div>
            <Label>Pontos por acerto</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </div>
        </div>
        <Button className="w-full" onClick={create}>
          Adicionar pergunta
        </Button>
      </div>
    </Modal>
  );
}

function SurveyManager({ activityId, onChanged }: { activityId: number; onChanged: () => void }) {
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState("rating");
  const [options, setOptions] = useState("");
  const toast = useToast();

  function load() {
    api.get<any>(`/api/admin/activities/${activityId}`).then((a) => setQuestions(a.questions));
  }
  useEffect(load, [activityId]);

  async function add() {
    if (!question.trim()) return;
    try {
      await api.post(`/api/admin/activities/${activityId}/survey-questions`, {
        question,
        type,
        options: type === "choice" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [],
      });
      setQuestion("");
      setOptions("");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao adicionar pergunta", "error");
    }
  }

  async function remove(qid: number) {
    await api.delete(`/api/admin/survey-questions/${qid}`);
    load();
    onChanged();
  }

  if (!questions) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-800">
            {idx + 1}. {q.question} <span className="text-xs text-slate-400 font-normal">({q.type})</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => remove(q.id)}>
            🗑️
          </Button>
        </div>
      ))}
      <div className="grid sm:grid-cols-[1fr_auto] gap-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Nova pergunta" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-40">
          <option value="rating">Avaliação (estrelas)</option>
          <option value="choice">Múltipla escolha</option>
          <option value="open">Resposta aberta</option>
        </Select>
      </div>
      {type === "choice" && <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Opções separadas por vírgula" />}
      <Button size="sm" variant="secondary" onClick={add}>
        + Adicionar pergunta
      </Button>
    </div>
  );
}
