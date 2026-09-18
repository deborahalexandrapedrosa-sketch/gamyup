import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Badge, Button, Card, EmptyState, FullPageLoader, Input, Label, Modal } from "../../components/ui";

interface Session {
  id: number;
  name: string;
  date: string;
  start_time: string;
  status: string;
}
interface Participant {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
}

const tabs = ["Encontros", "Participantes", "Ranking", "Relatório"] as const;

export default function ClassPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Encontros");
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [ranking, setRanking] = useState<any[] | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const toast = useToast();

  const [sName, setSName] = useState("");
  const [sDate, setSDate] = useState(new Date().toISOString().slice(0, 10));
  const [sStart, setSStart] = useState("09:00");
  const [sEnd, setSEnd] = useState("12:00");
  const [sLocation, setSLocation] = useState("");
  const [sTolerance, setSTolerance] = useState(10);
  const [enrollEmail, setEnrollEmail] = useState("");

  function loadSessions() {
    api.get<Session[]>(`/api/admin/sessions?class_id=${id}`).then(setSessions);
  }
  function loadParticipants() {
    api.get<Participant[]>(`/api/admin/classes/${id}/participants`).then(setParticipants);
  }
  function loadRanking() {
    api.get<any[]>(`/api/ranking?scope=class&id=${id}`).then(setRanking);
  }
  function loadReport() {
    api.get<any>(`/api/admin/reports/class/${id}`).then(setReport);
  }

  useEffect(() => {
    loadSessions();
    loadParticipants();
  }, [id]);

  useEffect(() => {
    if (tab === "Ranking") loadRanking();
    if (tab === "Relatório") loadReport();
  }, [tab, id]);

  async function createSession() {
    if (!sName.trim()) return;
    try {
      await api.post("/api/admin/sessions", {
        class_id: Number(id),
        name: sName,
        date: sDate,
        start_time: sStart,
        end_time: sEnd,
        location: sLocation,
        checkin_tolerance_minutes: sTolerance,
      });
      setSessionModal(false);
      setSName("");
      toast("Encontro criado");
      loadSessions();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar encontro", "error");
    }
  }

  async function enrollParticipant() {
    if (!enrollEmail.trim()) return;
    try {
      await api.post(`/api/admin/classes/${id}/enroll`, { email: enrollEmail });
      setEnrollEmail("");
      setEnrollModal(false);
      toast("Participante matriculado");
      loadParticipants();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao matricular participante", "error");
    }
  }

  async function removeParticipant(uid: number) {
    if (!confirm("Remover este participante da turma?")) return;
    await api.delete(`/api/admin/classes/${id}/enroll/${uid}`);
    loadParticipants();
  }

  if (!sessions || !participants) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-slate-400 hover:text-brand-600">
        ← Programas
      </Link>
      <h1 className="text-2xl font-extrabold text-ink-950">Turma</h1>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Encontros" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSessionModal(true)}>+ Novo Encontro</Button>
          </div>
          {sessions.length === 0 ? (
            <EmptyState title="Nenhum encontro cadastrado" action={<Button onClick={() => setSessionModal(true)}>Criar encontro</Button>} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {sessions.map((s) => (
                <Card key={s.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink-950">{s.name}</div>
                    <div className="text-sm text-slate-500">
                      {new Date(s.date + "T00:00:00").toLocaleDateString("pt-BR")} às {s.start_time}
                    </div>
                    <Badge color={s.status === "open" ? "green" : s.status === "closed" ? "slate" : "orange"} className="mt-2">
                      {s.status === "open" ? "Em andamento" : s.status === "closed" ? "Encerrado" : "Agendado"}
                    </Badge>
                  </div>
                  <Link to={`/admin/sessions/${s.id}`}>
                    <Button size="sm" variant="secondary">
                      Gerenciar →
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Participantes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setEnrollModal(true)}>+ Matricular participante</Button>
          </div>
          <Card className="p-0 overflow-hidden">
            {participants.length === 0 ? (
              <p className="text-sm text-slate-400 p-6">Nenhum participante matriculado.</p>
            ) : (
              <ul>
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: p.avatar_color }}>
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </div>
                    <button onClick={() => removeParticipant(p.id)} className="text-xs text-slate-400 hover:text-rose-600">
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "Ranking" && (
        <Card className="p-0 overflow-hidden">
          {!ranking ? (
            <div className="p-6">
              <FullPageLoader />
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-slate-400 p-6">Sem pontuações ainda.</p>
          ) : (
            <ul>
              {ranking.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                  <div className="w-7 text-center text-sm font-bold text-slate-400">{r.position}º</div>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: r.avatar_color }}>
                    {r.name[0]}
                  </div>
                  <div className="flex-1 text-sm font-semibold text-slate-800">{r.name}</div>
                  <div className="text-sm font-extrabold text-brand-600">{r.total} pts</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Relatório" && (
        <div className="space-y-4">
          {!report ? (
            <FullPageLoader />
          ) : (
            <Card className="p-0 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Participante</th>
                    <th className="text-left px-4 py-3">E-mail</th>
                    <th className="text-right px-4 py-3">Check-ins</th>
                    <th className="text-right px-4 py-3">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {report.participants.map((p: any) => (
                    <tr key={p.id} className="border-t border-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{p.name}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.email}</td>
                      <td className="px-4 py-2.5 text-right">
                        {p.checkins_count} / {report.sessionsCount}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-600">{p.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      <Modal open={sessionModal} onClose={() => setSessionModal(false)} title="Novo Encontro">
        <div className="space-y-4">
          <div>
            <Label>Nome do encontro</Label>
            <Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ex: Encontro 1 - Fundamentos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
            </div>
            <div>
              <Label>Local</Label>
              <Input value={sLocation} onChange={(e) => setSLocation(e.target.value)} placeholder="Sala / Link online" />
            </div>
            <div>
              <Label>Horário de início</Label>
              <Input type="time" value={sStart} onChange={(e) => setSStart(e.target.value)} />
            </div>
            <div>
              <Label>Horário de término</Label>
              <Input type="time" value={sEnd} onChange={(e) => setSEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Tolerância de atraso (minutos)</Label>
            <Input type="number" min={0} value={sTolerance} onChange={(e) => setSTolerance(Number(e.target.value))} />
          </div>
          <Button className="w-full" onClick={createSession}>
            Criar encontro
          </Button>
        </div>
      </Modal>

      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Matricular Participante">
        <div className="space-y-4">
          <div>
            <Label>E-mail do participante</Label>
            <Input type="email" value={enrollEmail} onChange={(e) => setEnrollEmail(e.target.value)} placeholder="participante@empresa.com" />
            <p className="text-xs text-slate-400 mt-1.5">O participante precisa já ter criado uma conta.</p>
          </div>
          <Button className="w-full" onClick={enrollParticipant}>
            Matricular
          </Button>
        </div>
      </Modal>
    </div>
  );
}
