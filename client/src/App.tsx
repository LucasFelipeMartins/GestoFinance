import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SyncProvider } from '@/context/SyncContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, GuestRoute } from '@/components/layout/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Clients from '@/pages/Clients';
import ClientDetails from '@/pages/ClientDetails';
import Tasks from '@/pages/Tasks';
import TaskDetails from '@/pages/TaskDetails';
import Income from '@/pages/Income';
import Expenses from '@/pages/Expenses';
import Investments from '@/pages/Investments';
import Goals from '@/pages/Goals';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import { runSync } from '@/db/sync';

const queryClient = new QueryClient({
  // Every mutation writes to the local outbox first and only reaches the
  // server on the next sync pass. Without this, a plain online edit would
  // just sit queued until the 2-minute timer or a connectivity flip fired
  // — kick a sync right after each one instead (runSync no-ops while
  // another sync is already in flight, so firing it often is harmless).
  mutationCache: new MutationCache({
    onSuccess: () => {
      runSync();
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
      // Queries and mutations read/write the local Dexie DB, not the
      // network — React Query's default 'online' mode pauses them while
      // navigator.onLine is false, which would break the whole point of
      // being local-first. The actual sync engine does its own connectivity
      // checks around the real network calls.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <SyncProvider>
              <ToastProvider>
                <Routes>
                  <Route element={<GuestRoute />}>
                    <Route path="/entrar" element={<Login />} />
                    <Route path="/criar-conta" element={<Register />} />
                    <Route path="/esqueci-senha" element={<ForgotPassword />} />
                  </Route>

                  {/* Reachable signed in or out: the link in the e-mail must
                      work whatever the state of this browser's session. */}
                  <Route path="/redefinir-senha" element={<ResetPassword />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/clientes" element={<Clients />} />
                      <Route path="/clientes/:id" element={<ClientDetails />} />
                      <Route path="/tarefas" element={<Tasks />} />
                      <Route path="/tarefas/:id" element={<TaskDetails />} />
                      <Route path="/receitas" element={<Income />} />
                      {/* The page used to be called "Lucros" — keep old links alive. */}
                      <Route path="/lucros" element={<Navigate to="/receitas" replace />} />
                      <Route path="/despesas" element={<Expenses />} />
                      <Route path="/investimentos" element={<Investments />} />
                      <Route path="/metas" element={<Goals />} />
                      <Route path="/configuracoes" element={<Settings />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ToastProvider>
            </SyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
