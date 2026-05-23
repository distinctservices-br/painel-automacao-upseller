import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/** Renderiza children apenas se autenticado. Enquanto carrega, mostra spinner. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black-1">
        <i className="ti ti-loader-2 animate-spin text-primary text-3xl" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
