import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout       from '@/components/Layout'
import Login        from '@/pages/Login'
import Clientes     from '@/pages/Clientes'
import Execucoes    from '@/pages/Execucoes'
import Cookies      from '@/pages/Cookies'
import Configuracao from '@/pages/Configuracao'

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // Aguarda resolução da sessão antes de renderizar rotas
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black-1">
        <i className="ti ti-loader-2 animate-spin text-primary text-3xl" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Login — redireciona para / se já autenticado */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Rotas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/"             element={<Clientes />} />
        <Route path="/execucoes"    element={<Execucoes />} />
        <Route path="/cookies"      element={<Cookies />} />
        <Route path="/configuracao" element={<Configuracao />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
