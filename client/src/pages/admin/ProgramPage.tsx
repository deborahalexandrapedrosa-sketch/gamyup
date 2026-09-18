import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Button, Card, EmptyState, FullPageLoader, Input, Label, Modal, Textarea } from "../../components/ui";

interface Training {
  id: number;
  name: string;
  description: string;
}

export default function ProgramPage() {
  const { id } = useParams();
  const [trainings, setTrainings] = useState<Training[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const toast = useToast();

  function load() {
    api.get<Training[]>(`/api/admin/trainings?program_id=${id}`).then(setTrainings);
  }

  useEffect(load, [id]);

  async function createTraining() {
    if (!name.trim()) return;
    try {
      await api.post("/api/admin/trainings", { program_id: Number(id), name, description });
      setModalOpen(false);
      setName("");
      setDescription("");
      toast("Treinamento criado");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar treinamento", "error");
    }
  }

  async function removeTraining(tid: number) {
    if (!confirm("Remover este treinamento e todas as turmas vinculadas?")) return;
    await api.delete(`/api/admin/trainings/${tid}`);
    toast("Treinamento removido");
    load();
  }

  if (!trainings) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-slate-400 hover:text-brand-600">
        ← Programas
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Treinamentos</h1>
          <p className="text-slate-500 text-sm mt-1">Ex: Liderança &amp; Confiança, Comunicação Assertiva...</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo Treinamento</Button>
      </div>

      {trainings.length === 0 ? (
        <EmptyState title="Nenhum treinamento neste programa" action={<Button onClick={() => setModalOpen(true)}>Criar treinamento</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainings.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div>
                <div className="font-bold text-ink-950">{t.name}</div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.description || "Sem descrição"}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <Link to={`/admin/trainings/${t.id}`} className="text-sm font-semibold text-brand-600">
                  Ver turmas →
                </Link>
                <button onClick={() => removeTraining(t.id)} className="text-xs text-slate-400 hover:text-rose-600">
                  Remover
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Treinamento">
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Liderança & Confiança" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" onClick={createTraining}>
            Criar treinamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
