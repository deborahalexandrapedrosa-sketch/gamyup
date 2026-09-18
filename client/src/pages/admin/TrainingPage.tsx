import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Badge, Button, Card, EmptyState, FullPageLoader, Input, Label, Modal, Select } from "../../components/ui";

interface ClassRow {
  id: number;
  name: string;
  ranking_visibility: string;
}

export default function TrainingPage() {
  const { id } = useParams();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("public");
  const toast = useToast();

  function load() {
    api.get<ClassRow[]>(`/api/admin/classes?training_id=${id}`).then(setClasses);
  }

  useEffect(load, [id]);

  async function createClass() {
    if (!name.trim()) return;
    try {
      await api.post("/api/admin/classes", { training_id: Number(id), name, ranking_visibility: visibility });
      setModalOpen(false);
      setName("");
      toast("Turma criada");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar turma", "error");
    }
  }

  async function removeClass(cid: number) {
    if (!confirm("Remover esta turma e todos os encontros vinculados?")) return;
    await api.delete(`/api/admin/classes/${cid}`);
    toast("Turma removida");
    load();
  }

  if (!classes) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-slate-400 hover:text-brand-600">
        ← Programas
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Turmas</h1>
          <p className="text-slate-500 text-sm mt-1">Cada turma agrupa participantes e encontros</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nova Turma</Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState title="Nenhuma turma neste treinamento" action={<Button onClick={() => setModalOpen(true)}>Criar turma</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-ink-950">{c.name}</div>
                <Badge color={c.ranking_visibility === "public" ? "green" : "slate"}>
                  {c.ranking_visibility === "public" ? "Ranking público" : "Ranking privado"}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <Link to={`/admin/classes/${c.id}`} className="text-sm font-semibold text-brand-600">
                  Abrir turma →
                </Link>
                <button onClick={() => removeClass(c.id)} className="text-xs text-slate-400 hover:text-rose-600">
                  Remover
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Turma">
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Turma A - 2026" />
          </div>
          <div>
            <Label>Visibilidade do ranking</Label>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="public">Público</option>
              <option value="private">Privado</option>
            </Select>
          </div>
          <Button className="w-full" onClick={createClass}>
            Criar turma
          </Button>
        </div>
      </Modal>
    </div>
  );
}
