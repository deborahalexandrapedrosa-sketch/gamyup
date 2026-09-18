import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Button, Card, FullPageLoader, Input, Label } from "../../components/ui";

const fields: Array<{ key: string; label: string }> = [
  { key: "checkin_early", label: "Check-in antecipado" },
  { key: "checkin_on_time", label: "Check-in no horário" },
  { key: "checkin_late", label: "Check-in com atraso" },
  { key: "checkout", label: "Check-out" },
  { key: "quiz_correct", label: "Quiz — resposta correta" },
  { key: "quiz_speed_bonus_max", label: "Quiz — bônus máximo de velocidade" },
  { key: "wordcloud_participation", label: "Chuva de palavras — participação" },
  { key: "dynamic_completion", label: "Dinâmica — conclusão" },
  { key: "survey_response", label: "Pesquisa — resposta" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, number> | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<Record<string, number>>("/api/admin/settings").then(setSettings);
  }, []);

  async function save() {
    if (!settings) return;
    await api.put("/api/admin/settings", settings);
    toast("Configurações de pontuação salvas");
  }

  if (!settings) return <FullPageLoader />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">⚙️ Pontuação Padrão</h1>
        <p className="text-slate-500 text-sm mt-1">
          Valores usados como padrão para novas atividades. Cada atividade pode sobrescrever esses valores individualmente.
        </p>
      </div>

      <Card className="space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4">
            <Label>{f.label}</Label>
            <Input
              type="number"
              className="max-w-[120px]"
              value={settings[f.key] ?? 0}
              onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })}
            />
          </div>
        ))}
        <Button onClick={save} className="w-full">
          Salvar configurações
        </Button>
      </Card>
    </div>
  );
}
