# Prompt para o Lovable — GamyUp

Copie e cole o texto abaixo (do "---" até o final) na caixa de prompt do Lovable.

---

Crie um aplicativo web responsivo chamado **GamyUp**, uma plataforma de gamificação para cursos, treinamentos, workshops, palestras e programas de desenvolvimento corporativo. A lógica de interação é inspirada no Kahoot (perguntas ao vivo, ranking em tempo real, projeção em tela cheia), mas o foco do produto é medir e recompensar **presença, participação e evolução** dos participantes ao longo de vários encontros — não é um app de quiz avulso.

Use **React + Tailwind CSS** no front-end e **Supabase** (Postgres + Auth + Realtime) como backend, com Row Level Security ativada em todas as tabelas.

## Identidade visual

- Nome da marca: **GamyUp** (sempre essa grafia — "Gamy" + "Up", nunca "GAMYUP" tudo maiúsculo nem "Gamy Up" com espaço).
- Tagline oficial: **"Aprender. Engajar. Evoluir."**
- Paleta: indigo/roxo (#6366F1) como cor primária de ação, laranja/amarelo em gradiente (#FF4D2E → #FF6B00 → #FFB000) como cor de destaque/gamificação, fundo neutro claro (#F4F5FB) nas telas internas e um gradiente escuro (navy → roxo → toques de laranja) na landing page e no modo apresentação.
- Estilo: corporativo, moderno, dinâmico — cards arredondados (rounded-2xl), sombras suaves, micro-animações discretas (fade/scale ao aparecer, barra de progresso animada). Evite qualquer estética infantil ou "cara de videogame".
- Mobile-first, mas com layout adaptado para desktop (a tela do participante e do admin mudam de navegação inferior para navegação lateral/superior conforme o tamanho da tela).

## Papéis de usuário

Dois papéis, controlados via Supabase Auth + uma coluna `role` (`admin` | `participant`) na tabela de usuários:

### Participante
- Cria conta / faz login.
- Vê um dashboard com: pontuação total, posição no ranking, % de participação, nível atual com barra de progresso, próximo encontro agendado, conquistas recentes, lista de treinamentos em que está matriculado.
- Escaneia QR Codes (ou digita um código manualmente) para acessar cada atividade de um encontro.
- Participa de: check-in, quiz ao vivo, chuva de palavras, dinâmicas, pesquisas rápidas, check-out.
- Consulta ranking (geral, por turma, por encontro), conquistas (badges) e histórico completo de participação e pontos.

### Administrador / Facilitador
- Cria e gerencia a estrutura hierárquica: **Programa → Treinamento → Turma → Encontro → Atividades**.
- Matricula participantes em turmas (por e-mail).
- Cria atividades dentro de cada encontro, gera QR Code de cada uma, abre/fecha atividades e encontros.
- Conduz o encontro em tempo real: acompanha check-ins, participação por atividade, ranking ao vivo.
- No caso do quiz, lança cada pergunta ao vivo para os participantes conectados e revela o resultado quando quiser.
- Tem um **Modo Apresentação** em tela cheia (pensado para projetor/TV) com QR Code, ranking, chuva de palavras e quiz ao vivo, navegável por botões grandes.
- Configura os valores de pontuação padrão do sistema.
- Consulta relatório de participação por turma (check-ins e pontos por participante).

## Estrutura de dados (hierarquia)

```
programs (id, name, description)
trainings (id, program_id, name, description)
classes (id, training_id, name, ranking_visibility: public|private)
enrollments (class_id, user_id) — matrícula do participante na turma
sessions (id, class_id, name, date, start_time, end_time, location, checkin_tolerance_minutes, status: scheduled|open|closed)
activities (id, session_id, type: checkin|checkout|quiz|wordcloud|dynamic|survey, name, description, status: draft|open|closed, qr_token único, points_config jsonb, config jsonb, order_index)
```

Cada tipo de atividade tem tabelas de apoio:
- `quiz_questions` (question, type: multiple_choice|true_false, options jsonb, correct_index, time_limit_seconds, points, speed_bonus_max) e `quiz_responses` (question_id, user_id, selected_index, correct, response_time_ms, points_earned — único por pergunta+usuário).
- `wordcloud_entries` (activity_id, user_id opcional/anônimo, word).
- `dynamic_completions` (activity_id, user_id, points_earned — único por atividade+usuário).
- `survey_questions` (question, type: rating|choice|open, options jsonb) e `survey_responses` (survey_question_id, user_id, answer_text, answer_rating).
- `checkins` e `checkouts` (session_id, activity_id, user_id, horário, status: early|on_time|late para check-in, pontos ganhos — únicos por encontro+usuário).

Pontuação centralizada em um **ledger** (`points_ledger`: user_id, class_id, session_id, activity_id, source, points, description, created_at) — todo ponto ganho gera uma linha aqui, e o total do usuário é a soma dessa tabela. Isso alimenta ranking, histórico e níveis.

Gamificação:
- `levels` (name, min_points, order_index) — seed com 5 níveis: Explorador (0), Participante (300), Engajado (800), Destaque (1500), Líder (2500).
- `achievements` (code, name, description, icon, criteria_type, criteria_value) e `user_achievements` (user_id, achievement_id, unlocked_at). Seed com pelo menos: Primeiro Passo (1º check-in), Pontualidade (5 check-ins no horário/adiantados), Participante Ativo (10 atividades concluídas), Alta Performance (1000 pontos), Conhecimento em Ação (90% de acerto em quiz, mínimo 5 respostas).

## Regras de pontuação (valores padrão, configuráveis pelo admin)

- Check-in adiantado: +20 · no horário: +15 · atrasado: +5 (comparando o horário do check-in com `start_time` do encontro + `checkin_tolerance_minutes` de tolerância).
- Check-out: +10.
- Quiz: pontos da pergunta (padrão 100) ao acertar, mais bônus de velocidade proporcional ao tempo restante (padrão até +20).
- Chuva de palavras: +30 na primeira palavra enviada por atividade (não pontua respostas repetidas da mesma pessoa).
- Dinâmica: +50 ao marcar como concluída.
- Pesquisa rápida: +20 ao responder (não precisa gerar pontos se o admin preferir).

## QR Code

Cada atividade tem um token único. O admin gera/visualiza o QR Code (que aponta para uma URL tipo `/a/:token`) a partir da tela de gerenciamento do encontro. O participante escaneia (câmera) ou digita o código manualmente, e é levado direto para a tela daquela atividade específica — sem passos extras.

## Tempo real (Supabase Realtime)

Use canais do Supabase Realtime (ou broadcast) para:
- Atualizar a contagem de check-ins e o ranking ao vivo no painel do admin e no modo apresentação assim que alguém faz check-in.
- Lançar uma pergunta de quiz para todos os participantes conectados simultaneamente, com cronômetro sincronizado, e revelar o resultado (gabarito + contagem de respostas por alternativa) para todos ao mesmo tempo.
- Atualizar a nuvem de palavras em tempo real conforme novas respostas chegam (tamanho da palavra proporcional à frequência).

## Telas necessárias

**Públicas:** Landing page (com o nome, tagline, CTA para entrar/criar conta/acessar treinamento), Login, Cadastro.

**Participante:** Dashboard, Escanear QR Code (com entrada manual como alternativa), tela de atividade (renderiza o componente certo conforme o tipo: check-in, check-out, quiz, chuva de palavras, dinâmica ou pesquisa), Ranking, Conquistas, Histórico (extrato de pontos + lista de encontros com status de check-in/check-out).

**Admin:** lista de Programas → Treinamentos → Turmas (com abas de Encontros / Participantes / Ranking / Relatório) → tela de gerenciamento do Encontro (lista de atividades com abrir/fechar/QR Code/editar, estatísticas ao vivo, gerenciador de perguntas do quiz com botão de "lançar" e "revelar"), Modo Apresentação em tela cheia, lista de Participantes, tela de configuração dos valores de pontuação padrão.

## Fluxo principal do participante

Login → Dashboard → escaneia QR do check-in → confirma presença e ganha pontos → participa das atividades abertas (quiz / chuva de palavras / dinâmica / pesquisa) conforme o facilitador libera → acompanha o ranking → faz check-out ao final → vê resumo (pontos ganhos, total, posição) → conquistas/nível atualizados automaticamente.

## Escopo do MVP (priorize isso primeiro)

1. Autenticação (login/cadastro com papéis participante/admin).
2. Estrutura Programa → Treinamento → Turma → Encontro → Atividades (CRUD do admin).
3. Check-in com pontuação por pontualidade + geração/leitura de QR Code.
4. Quiz ao vivo com lançamento de pergunta, cronômetro e revelação em tempo real.
5. Chuva de palavras com nuvem em tempo real.
6. Ranking (geral / turma / encontro).
7. Dashboard do admin com visão da turma/encontro em tempo real.
8. Histórico do participante.

Depois do MVP: dinâmicas, pesquisas, check-out com resumo final, conquistas, níveis, modo apresentação, relatórios exportáveis e emissão de certificado.

## Dados de demonstração (seed)

Crie ao menos: 1 conta admin (facilitador), 5 contas de participantes, 1 programa, 1 treinamento, 1 turma com os 5 participantes matriculados, e 1 encontro "de hoje" já com todas as atividades criadas (check-in, chuva de palavras com uma pergunta, quiz com 3 perguntas, dinâmica, pesquisa com 3 perguntas, check-out) para que o app já possa ser demonstrado assim que gerado.
