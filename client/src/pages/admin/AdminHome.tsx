import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Button, Card, EmptyState, FullPageLoader, Input, Label, Modal, Textarea } from "../../components/ui";

interface Program {
  id: number;
  name: string;
  description: string;
}

export default function AdminHome() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const toast = useToast();

  function load() {
    api.get<Program[]>("/api/admin/programs").then(setPrograms);
  }

  useEffect(load, []);

  async function createProgram() {
    if (!name.trim()) return;
    try {
      await api.post("/api/admin/programs", { name, description });
      setModalOpen(false);
      setName("");
      setDescription("");
      toast("Programa criado com sucesso");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao criar programa", "error");
    }
  }

  async function removeProgram(id: number) {
    if (!confirm("Remover este programa e todos os treinamentos vinculados?")) return;
    await api.delete(`/api/admin/programs/${id}`);
    toast("Programa removido");
    load();
  }

  if (!programs) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">📚 Programas</h1>
          <p className="text-slate-500 text-sm mt-1">Estrutura: Programa → Treinamento → Turma → Encontro → Atividades</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo Programa</Button>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          title="Nenhum programa cadastrado"
          description="Crie um programa (ex: Academia de Líderes) para organizar seus treinamentos."
          action={<Button onClick={() => setModalOpen(true)}>Criar primeiro programa</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div>
                <div className="font-bold text-ink-950">{p.name}</div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.description || "Sem descrição"}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <Link to={`/admin/programs/${p.id}`} className="text-sm font-semibold text-brand-600">
                  Ver treinamentos →
                </Link>
                <button onClick={() => removeProgram(p.id)} className="text-xs text-slate-400 hover:text-rose-600">
                  Remover
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Programa">
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Academia de Líderes" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" onClick={createProgram}>
            Criar programa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
