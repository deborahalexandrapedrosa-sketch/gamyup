import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, FullPageLoader } from "../../components/ui";

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export default function Achievements() {
  const [items, setItems] = useState<Achievement[] | null>(null);

  useEffect(() => {
    api.get<Achievement[]>("/api/achievements").then(setItems);
  }, []);

  if (!items) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">🎖️ Conquistas</h1>
        <p className="text-slate-500 text-sm mt-1">
          {items.filter((i) => i.unlocked).length} de {items.length} desbloqueadas
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((a) => (
          <Card
            key={a.id}
            className={`flex items-start gap-3 ${a.unlocked ? "" : "opacity-50 grayscale"}`}
          >
            <div className="text-3xl">{a.icon}</div>
            <div>
              <div className="font-bold text-ink-950">{a.name}</div>
              <div className="text-sm text-slate-500 mt-0.5">{a.description}</div>
              {a.unlocked && <div className="text-xs text-emerald-600 font-semibold mt-1.5">Desbloqueada ✓</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
