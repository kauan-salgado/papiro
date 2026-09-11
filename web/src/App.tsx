import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { PaginaDesempenho } from './paginas/PaginaDesempenho.js';
import { PaginaEdital } from './paginas/PaginaEdital.js';
import { PaginaInicial } from './paginas/PaginaInicial.js';

/**
 * Estado de servidor fica no React Query; estado de navegacao fica na URL
 * (cargo, disciplina, topico aberto). Nao ha store de cliente — duplicar em
 * Zustand o que o banco ja e dono de significa manter dois donos da verdade.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<PaginaInicial />} />
            <Route path="/cargos/:cargoId/edital" element={<PaginaEdital />} />
            <Route path="/cargos/:cargoId/dashboard" element={<PaginaDesempenho />} />
            <Route path="/cargos/:cargoId/dashboard/:disciplinaId" element={<PaginaDesempenho />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
