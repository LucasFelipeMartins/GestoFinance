import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SyncProvider } from '@/context/SyncContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, GuestRoute } from '@/components/layout/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import Clients from '@/pages/Clients';
import ClientDetails from '@/pages/ClientDetails';
import Tasks from '@/pages/Tasks';
import TaskDetails from '@/pages/TaskDetails';
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
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              <Routes>
                <Route element={<GuestRoute />}>
                  <Route path="/entrar" element={<Login />} />
                  <Route path="/criar-conta" element={<Register />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/:id" element={<ClientDetails />} />
                    <Route path="/tarefas" element={<Tasks />} />
                    <Route path="/tarefas/:id" element={<TaskDetails />} />
                    <Route path="/configuracoes" element={<Settings />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ToastProvider>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
