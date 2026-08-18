import { connectDatabase } from './config/db';
import { User } from './models/User';
import { Client } from './models/Client';
import { Task } from './models/Task';
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

  const clientsData = [
    { name: 'Maria Silva', phone: '(32) 99876-5432', service: 'Manutenção de notebook', price: 150, priority: 'critical', status: 'completed' },
    { name: 'João Santos', phone: '(32) 98765-4321', service: 'Instalação de sistema', price: 120, priority: 'high', status: 'in-progress' },
    { name: 'Carlos Oliveira', phone: '(32) 97654-3210', service: 'Formatação e backup', price: 200, priority: 'low', status: 'completed' },
    { name: 'Ana Costa', phone: '(32) 98888-1111', service: 'Desenvolvimento de site', price: 350, priority: 'very-low', status: 'pending' },
  ] as const;

  const clients = await Client.insertMany(
    clientsData.map((c) => ({ ...c, userId: user!._id, initials: getInitials(c.name) }))
  );

  const findClient = (name: string) => clients.find((c) => c.name === name)!._id;

  const today = new Date();
  const inDays = (days: number) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  await Task.insertMany([
    {
      userId: user._id,
      title: 'Backup dos arquivos do cliente',
      description: 'Fazer backup completo dos arquivos e enviar para o drive.',
      clientId: findClient('Carlos Oliveira'),
      dueDate: today,
      priority: 'critical',
      status: 'pending',
    },
    {
      userId: user._id,
      title: 'Instalar impressora',
      clientId: findClient('Maria Silva'),
      dueDate: inDays(1),
      priority: 'high',
      status: 'pending',
    },
    {
      userId: user._id,
      title: 'Atualizar antivírus',
      clientId: findClient('João Santos'),
      dueDate: inDays(3),
      priority: 'medium',
      status: 'in-progress',
    },
    {
      userId: user._id,
      title: 'Configurar e-mail',
      clientId: findClient('Ana Costa'),
      dueDate: inDays(5),
      priority: 'low',
      status: 'pending',
    },
    {
      userId: user._id,
      title: 'Reunião de alinhamento',
      clientId: findClient('Carlos Oliveira'),
      dueDate: inDays(-2),
      priority: 'very-low',
      status: 'completed',
      completedAt: inDays(-2),
    },
  ]);

  console.log('[seed] done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
