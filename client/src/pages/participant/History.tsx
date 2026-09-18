import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge, Card, FullPageLoader } from "../../components/ui";

interface LedgerRow {
  id: number;
  source: string;
  points: number;
  description: string;
  created_at: string;
  session_name?: string;
}

interface SessionRow {
  id: number;
  name: string;
  date: string;
  checkin_time: string | null;
  checkin_status: string | null;
  checkout_time: string | null;
}

const sourceLabels: Record<string, string> = {
  checkin: "Check-in",
  checkout: "Check-out",
  quiz: "Quiz",
  wordcloud: "Chuva de palavras",
  dynamic: "Dinâmica",
  survey: "Pesquisa",
};

export default function History() {
  const [data, setData] = useState<{ ledger: LedgerRow[]; sessions: SessionRow[] } | null>(null);

  useEffect(() => {
    api.get<{ ledger: LedgerRow[]; sessions: SessionRow[] }>("/api/me/history").then(setData);
  }, []);

  if (!data) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">📜 Histórico de Participação</h1>
        <p className="text-slate-500 text-sm mt-1">Seus encontros e pontos ao longo do tempo</p>
      </div>

      <Card>
        <div className="font-bold text-ink-950 mb-3">Encontros</div>
        {data.sessions.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum encontro encontrado.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {data.sessions.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-400">{new Date(s.date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="flex gap-2">
                  {s.checkin_time ? (
                    <Badge color={s.checkin_status === "late" ? "orange" : "green"}>
                      Check-in {s.checkin_status === "early" ? "antecipado" : s.checkin_status === "late" ? "atrasado" : "no horário"}
                    </Badge>
                  ) : (
                    <Badge color="slate">Sem check-in</Badge>
                  )}
                  {s.checkout_time && <Badge color="brand">Check-out feito</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="font-bold text-ink-950 mb-3">Extrato de pontos</div>
        {data.ledger.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma pontuação registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {data.ledger.map((l) => (
              <li key={l.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{sourceLabels[l.source] || l.source}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {l.description} {l.session_name ? `· ${l.session_name}` : ""}
                  </div>
                </div>
                <div className={`text-sm font-extrabold shrink-0 ${l.points >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {l.points >= 0 ? "+" : ""}
                  {l.points}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
