import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "./db";

function hash(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

function run() {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) {
    console.log("Banco já possui dados. Seed abortado (apague server/data/app.db para recriar).");
    return;
  }

  console.log("Criando dados de demonstração...");

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)"
  );
  const adminId = insertUser.run("Ana Facilitadora", "admin@demo.com", hash("admin123"), "admin", "#6366f1")
    .lastInsertRowid as number;

  const colors = ["#6366f1", "#22c55e", "#f97316", "#ec4899", "#06b6d4", "#eab308"];
  const participantNames = [
    ["Carlos Silva", "carlos@demo.com"],
    ["Beatriz Souza", "beatriz@demo.com"],
    ["Diego Santos", "diego@demo.com"],
    ["Fernanda Lima", "fernanda@demo.com"],
    ["Gabriel Rocha", "gabriel@demo.com"],
  ];
  const participantIds = participantNames.map(([name, email], i) =>
    insertUser.run(name, email, hash("123456"), "participant", colors[i % colors.length]).lastInsertRowid as number
  );

  const programId = db
    .prepare("INSERT INTO programs (name, description) VALUES (?, ?)")
    .run("Academia de Líderes", "Programa corporativo de desenvolvimento de lideranças").lastInsertRowid as number;

  const trainingId = db
    .prepare("INSERT INTO trainings (program_id, name, description) VALUES (?, ?, ?)")
    .run(programId, "Liderança & Confiança", "Treinamento sobre liderança baseada em confiança e escuta ativa")
    .lastInsertRowid as number;

  const classId = db
    .prepare("INSERT INTO classes (training_id, name, ranking_visibility) VALUES (?, ?, ?)")
    .run(trainingId, "Turma A - 2026", "public").lastInsertRowid as number;

  const enroll = db.prepare("INSERT INTO enrollments (class_id, user_id) VALUES (?, ?)");
  for (const pid of participantIds) enroll.run(classId, pid);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  const sessionId = db
    .prepare(
      `INSERT INTO sessions (class_id, name, date, start_time, end_time, location, checkin_tolerance_minutes, status, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 1)`
    )
    .run(classId, "Encontro 1 - Fundamentos da Confiança", dateStr, "09:00", "12:00", "Sala Multiuso 2", 10)
    .lastInsertRowid as number;

  const insertActivity = db.prepare(
    `INSERT INTO activities (session_id, type, name, description, status, qr_token, points_config, config, order_index, required)
     VALUES (@session_id, @type, @name, @description, @status, @qr_token, @points_config, @config, @order_index, @required)`
  );

  const checkinActId = insertActivity.run({
    session_id: sessionId,
    type: "checkin",
    name: "Check-in do Encontro",
    description: "Confirme sua presença escaneando o QR Code",
    status: "open",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ early: 20, on_time: 15, late: 5 }),
    config: "{}",
    order_index: 0,
    required: 1,
  }).lastInsertRowid as number;

  const wordcloudActId = insertActivity.run({
    session_id: sessionId,
    type: "wordcloud",
    name: "Chuva de Palavras: Liderança",
    description: "Qual palavra representa uma liderança de confiança para você?",
    status: "open",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ per_word: 30 }),
    config: JSON.stringify({ allow_multiple: false, anonymous: false, max_chars: 30 }),
    order_index: 1,
    required: 0,
  }).lastInsertRowid as number;

  const quizActId = insertActivity.run({
    session_id: sessionId,
    type: "quiz",
    name: "Quiz: Liderança na Prática",
    description: "Teste seus conhecimentos sobre liderança e confiança",
    status: "draft",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ speed_bonus_max: 20 }),
    config: "{}",
    order_index: 2,
    required: 0,
  }).lastInsertRowid as number;

  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions (activity_id, question, type, options, correct_index, time_limit_seconds, points, speed_bonus_max, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertQuestion.run(
    quizActId,
    "Qual característica é essencial para uma liderança de confiança?",
    "multiple_choice",
    JSON.stringify(["Escuta ativa", "Autoritarismo", "Microgerenciamento", "Distância emocional"]),
    0,
    20,
    100,
    20,
    0
  );
  insertQuestion.run(
    quizActId,
    "Feedback contínuo fortalece a confiança da equipe.",
    "true_false",
    JSON.stringify(["Verdadeiro", "Falso"]),
    0,
    15,
    100,
    20,
    1
  );
  insertQuestion.run(
    quizActId,
    "O que MAIS contribui para a credibilidade de um líder?",
    "multiple_choice",
    JSON.stringify(["Coerência entre discurso e ação", "Falar mais que os outros", "Nunca admitir erros", "Centralizar decisões"]),
    0,
    20,
    100,
    20,
    2
  );

  const dynamicActId = insertActivity.run({
    session_id: sessionId,
    type: "dynamic",
    name: "Desafio em Grupo: Estudo de Caso",
    description: "Em grupos de 4, discutam o case e apresentem 3 aprendizados.",
    status: "open",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ completion: 50 }),
    config: JSON.stringify({ time_minutes: 20 }),
    order_index: 3,
    required: 0,
  }).lastInsertRowid as number;

  const surveyActId = insertActivity.run({
    session_id: sessionId,
    type: "survey",
    name: "Pesquisa Rápida",
    description: "Sua opinião sobre o encontro de hoje",
    status: "open",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ per_response: 20 }),
    config: "{}",
    order_index: 4,
    required: 0,
  }).lastInsertRowid as number;

  const insertSurveyQ = db.prepare(
    "INSERT INTO survey_questions (activity_id, question, type, options, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  insertSurveyQ.run(surveyActId, "Como você avalia este encontro?", "rating", "[]", 0);
  insertSurveyQ.run(
    surveyActId,
    "O conteúdo foi útil para sua rotina?",
    "choice",
    JSON.stringify(["Sim", "Parcialmente", "Não"]),
    1
  );
  insertSurveyQ.run(surveyActId, "Deixe um comentário ou sugestão (opcional)", "open", "[]", 2);

  insertActivity.run({
    session_id: sessionId,
    type: "checkout",
    name: "Check-out do Encontro",
    description: "Finalize sua participação no encontro de hoje",
    status: "open",
    qr_token: nanoid(10),
    points_config: JSON.stringify({ points: 10 }),
    config: "{}",
    order_index: 5,
    required: 1,
  });

  const levels = [
    ["Explorador", 0],
    ["Participante", 300],
    ["Engajado", 800],
    ["Destaque", 1500],
    ["Líder", 2500],
  ];
  const insertLevel = db.prepare("INSERT INTO levels (name, min_points, order_index) VALUES (?, ?, ?)");
  levels.forEach(([name, min], i) => insertLevel.run(name, min, i));

  const achievements = [
    ["first_checkin", "Primeiro Passo", "Fez seu primeiro check-in.", "🏆", "first_checkin", 1],
    ["ontime_5", "Pontualidade", "Chegou no horário em 5 encontros.", "⚡", "ontime_streak", 5],
    ["active_10", "Participante Ativo", "Participou de 10 atividades.", "🎯", "activities_count", 10],
    ["points_1000", "Alta Performance", "Alcançou 1.000 pontos.", "🔥", "points_threshold", 1000],
    ["quiz_90", "Conhecimento em Ação", "Acertou 90% dos quizzes.", "🧠", "quiz_accuracy", 90],
  ];
  const insertAch = db.prepare(
    "INSERT INTO achievements (code, name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const a of achievements) insertAch.run(...(a as [string, string, string, string, string, number]));

  console.log("Seed concluído!");
  console.log("Admin: admin@demo.com / admin123");
  console.log("Participantes: carlos@demo.com, beatriz@demo.com, diego@demo.com, fernanda@demo.com, gabriel@demo.com / 123456");
}

run();
