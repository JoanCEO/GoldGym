import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { PageLoader } from '@/components/ui'
import AppLayout from './AppLayout'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />

  return <AppLayout>{children}</AppLayout>
}
