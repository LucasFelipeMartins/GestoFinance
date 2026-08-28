import crypto from 'crypto';
import { connectDatabase } from './config/db';
import { User } from './models/User';
import { Client } from './models/Client';
import { Task } from './models/Task';
import { FinanceEntry } from './models/FinanceEntry';
import { Goal, GoalContribution } from './models/Goal';
import { hashPassword } from './utils/password';
import { getInitials } from './utils/initials';
import mongoose from 'mongoose';

const DEMO_EMAIL = 'demo@gestorpro.com';
const DEMO_PASSWORD = 'demo1234';

async function seed() {
  await connectDatabase();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Lucas Felipe',
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
    });
    console.log(`[seed] created demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`[seed] demo user already exists, resetting their data`);
  }

  await Client.deleteMany({ userId: user._id });
  await Task.deleteMany({ userId: user._id });
  await FinanceEntry.deleteMany({ userId: user._id });
  await Goal.deleteMany({ userId: user._id });
  await GoalContribution.deleteMany({ userId: user._id });

  const now = new Date();

  const daysFromNow = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

  // Delivery dates span overdue / today / soon / distant so every countdown
  // state is visible in the demo data.
  // Maria was completed days ago — demonstrates the Home 24h auto-hide
  // (still fully visible/manageable on the Clientes page). Carlos was
  // completed minutes ago, so it still shows up on Home.
  const clientsData = [
    { name: 'Maria Silva', phone: '(32) 99876-5432', service: 'Manutenção de notebook', price: 150, priority: 'critical', status: 'completed', deliveryDate: daysFromNow(-5), completedAt: hoursAgo(50) },
    { name: 'João Santos', phone: '(32) 98765-4321', service: 'Instalação de sistema', price: 120, priority: 'high', status: 'in-progress', deliveryDate: daysFromNow(-2) },
    { name: 'Carlos Oliveira', phone: '(32) 97654-3210', service: 'Formatação e backup', price: 200, priority: 'low', status: 'completed', deliveryDate: daysFromNow(3), completedAt: hoursAgo(1) },
    { name: 'Ana Costa', phone: '(32) 98888-1111', service: 'Desenvolvimento de site', price: 350, priority: 'very-low', status: 'pending', deliveryDate: daysFromNow(20) },
  ] as const;

  const clients = await Client.insertMany(
    clientsData.map((c) => ({
      ...c,
      userId: user!._id,
      localId: crypto.randomUUID(),
      initials: getInitials(c.name),
      createdAt: now,
      updatedAt: now,
    }))
  );

  const findClient = (name: string) => clients.find((c) => c.name === name)!.localId;

  // Demonstrates the optional due-time + reminder opt-in: a real time of
  // day (not local midnight) is what makes the "sininho" eligible at all.
  // Every other seeded dueDate below uses daysFromNow (local midnight) so it
  // reads as "date only" — the same shape a real user gets from leaving the
  // Horário field blank.
  const atTime = (date: Date, hours: number, minutes: number) => {
    const withTime = new Date(date);
    withTime.setHours(hours, minutes, 0, 0);
    return withTime;
  };

  const tasksData = [
    {
      title: 'Backup dos arquivos do cliente',
      description: 'Fazer backup completo dos arquivos e enviar para o drive.',
      clientId: findClient('Carlos Oliveira'),
      dueDate: daysFromNow(0),
      priority: 'critical',
      status: 'pending',
    },
    {
      title: 'Instalar impressora',
      clientId: findClient('Maria Silva'),
      dueDate: atTime(daysFromNow(1), 14, 30),
      priority: 'high',
      status: 'pending',
      reminderEnabled: true,
    },
    {
      title: 'Atualizar antivírus',
      clientId: findClient('João Santos'),
      dueDate: daysFromNow(3),
      priority: 'medium',
      status: 'in-progress',
    },
    {
      title: 'Configurar e-mail',
      clientId: findClient('Ana Costa'),
      dueDate: daysFromNow(5),
      priority: 'low',
      status: 'pending',
    },
    {
      // Completed 20h ago — near the end of the 24h stay a finished task
      // gets on the Tarefas page before it is deleted for good.
      title: 'Reunião de alinhamento',
      clientId: findClient('Carlos Oliveira'),
      dueDate: daysFromNow(-2),
      priority: 'very-low',
      status: 'completed',
      completedAt: hoursAgo(20),
    },
    {
      // Completed an hour ago. Like every completed task it is already off
      // Home — Home only carries what is still open.
      title: 'Enviar orçamento revisado',
      clientId: findClient('Ana Costa'),
      dueDate: daysFromNow(0),
      priority: 'medium',
      status: 'completed',
      completedAt: hoursAgo(1),
    },
  ] as const;

  await Task.insertMany(
    tasksData.map((t) => ({
      ...t,
      userId: user!._id,
      localId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
  );

  // ---------------------------------------------------------------
  // Finanças: five months of history so the Home chart has a real
  // curve to draw, plus every despesa state (em aberto, vencida, paga)
  // and a parcelled card purchase that spreads across months.
  // ---------------------------------------------------------------
  const monthsAgo = (months: number, day: number) =>
    new Date(now.getFullYear(), now.getMonth() - months, day);

  const financeData = [
    // Lucros lançados à mão — só o que NÃO vem de cliente. O valor dos
    // clientes concluídos (Maria Silva e Carlos Oliveira, acima) entra nos
    // lucros sozinho, derivado do preço deles, e por isso não aparece aqui:
    // repetir seria contar o mesmo dinheiro duas vezes.
    { kind: 'income', description: 'Venda de peças usadas', amount: 480, date: monthsAgo(4, 22), category: 'Venda' },
    { kind: 'income', description: 'Salário', amount: 3200, date: monthsAgo(4, 5), category: 'Outros' },
    { kind: 'income', description: 'Consultoria avulsa', amount: 1800, date: monthsAgo(3, 27), category: 'Consultoria' },
    { kind: 'income', description: 'Salário', amount: 3200, date: monthsAgo(3, 5), category: 'Outros' },
    { kind: 'income', description: 'Venda de notebook recondicionado', amount: 1450, date: monthsAgo(2, 9), category: 'Venda' },
    { kind: 'income', description: 'Salário', amount: 3200, date: monthsAgo(2, 5), category: 'Outros' },
    { kind: 'income', description: 'Suporte mensal — contrato', amount: 900, date: monthsAgo(1, 28), category: 'Recorrência' },
    { kind: 'income', description: 'Salário', amount: 3200, date: monthsAgo(1, 5), category: 'Outros' },
    { kind: 'income', description: 'Suporte mensal — contrato', amount: 900, date: monthsAgo(0, 10), category: 'Recorrência' },
    { kind: 'income', description: 'Salário', amount: 3200, date: monthsAgo(0, 5), category: 'Outros' },

    // Despesas — a 10x notebook started 3 months ago still bills every month.
    { kind: 'expense', description: 'Notebook novo', amount: 6000, date: monthsAgo(3, 5), category: 'Ferramentas', paymentMethod: 'card', installments: 10, paid: true, paidAt: monthsAgo(3, 5) },
    { kind: 'expense', description: 'Assinaturas de software', amount: 189, date: monthsAgo(2, 12), category: 'Assinaturas', paymentMethod: 'pix', installments: 1, paid: true, paidAt: monthsAgo(2, 12) },
    { kind: 'expense', description: 'Cadeira de escritório', amount: 1200, date: monthsAgo(1, 3), category: 'Ferramentas', paymentMethod: 'card', installments: 6, paid: true, paidAt: monthsAgo(1, 3) },
    { kind: 'expense', description: 'Internet do escritório', amount: 149, date: monthsAgo(0, 5), category: 'Assinaturas', paymentMethod: 'pix', installments: 1, paid: true, paidAt: monthsAgo(0, 5) },
    // Vencida: due date already behind us, still unpaid.
    { kind: 'expense', description: 'Conta de luz', amount: 320, date: daysFromNow(-4), category: 'Moradia', paymentMethod: 'pix', installments: 1, paid: false },
    // Vence em breve — feeds the "vence(m) em 7 dias" badge.
    { kind: 'expense', description: 'Fornecedor de peças', amount: 780, date: daysFromNow(3), category: 'Fornecedor', paymentMethod: 'card', installments: 3, paid: false },
    { kind: 'expense', description: 'Contador', amount: 250, date: daysFromNow(6), category: 'Impostos', paymentMethod: 'pix', installments: 1, paid: false },
    { kind: 'expense', description: 'Combustível e deslocamentos', amount: 400, date: daysFromNow(18), category: 'Transporte', paymentMethod: 'pix', installments: 1, paid: false },

    // Investimentos — different percentuais do CDI, so the simulator and the
    // portfolio estimate both have something real to work with.
    { kind: 'investment', description: 'CDB Banco X', amount: 5000, date: monthsAgo(4, 15), category: 'CDB', cdiPercent: 110 },
    { kind: 'investment', description: 'Tesouro Selic', amount: 2000, date: monthsAgo(2, 20), category: 'Tesouro Direto', cdiPercent: 100 },
    { kind: 'investment', description: 'LCI isenta de IR', amount: 3000, date: monthsAgo(0, 8), category: 'LCI/LCA', cdiPercent: 95 },
  ] as const;

  await FinanceEntry.insertMany(
    financeData.map((f) => ({
      ...f,
      userId: user!._id,
      localId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
  );

  console.log(`[seed] inserted ${financeData.length} lançamentos financeiros`);

  // ---------------------------------------------------------------
  // Metas: one well underway, one just started and one already
  // reached, so every state of the progress bar is visible at once.
  // ---------------------------------------------------------------
  const goalsData = [
    { title: 'Viajar', targetAmount: 1200, targetDate: monthsAgo(-5, 10) },
    { title: 'Notebook novo', targetAmount: 6000, targetDate: monthsAgo(-12, 1) },
    { title: 'Reserva de emergência', targetAmount: 2000, targetDate: monthsAgo(-1, 20) },
  ] as const;

  const goals = await Goal.insertMany(
    goalsData.map((g) => ({
      ...g,
      userId: user!._id,
      localId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
  );

  const findGoal = (title: string) => goals.find((g) => g.title === title)!.localId;

  const contributionsData = [
    // 'Viajar' is 45% of the way there.
    { goalId: findGoal('Viajar'), amount: 300, date: monthsAgo(2, 12), note: 'Primeiro depósito' },
    { goalId: findGoal('Viajar'), amount: 240, date: monthsAgo(1, 12) },
    // 'Notebook novo' has barely started.
    { goalId: findGoal('Notebook novo'), amount: 500, date: monthsAgo(0, 6) },
    // 'Reserva de emergência' is already complete.
    { goalId: findGoal('Reserva de emergência'), amount: 1200, date: monthsAgo(3, 8) },
    { goalId: findGoal('Reserva de emergência'), amount: 800, date: monthsAgo(1, 8) },
  ] as const;

  await GoalContribution.insertMany(
    contributionsData.map((c) => ({
      ...c,
      userId: user!._id,
      localId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
  );

  // The reserve goal is already funded, so it starts life marked done —
  // the same thing the clients do when a deposit crosses the target.
  await Goal.updateOne(
    { userId: user._id, localId: findGoal('Reserva de emergência') },
    { completedAt: monthsAgo(1, 8) }
  );

  console.log(`[seed] inserted ${goalsData.length} metas`);

  console.log('[seed] done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
