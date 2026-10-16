import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// Páginas públicas
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'

// Páginas protegidas
import HomePage from '@/pages/HomePage'
import FeedPage from '@/pages/FeedPage'
import CalendarPage from '@/pages/CalendarPage'
import WorkoutPlansPage from '@/pages/WorkoutPlansPage'
import CommunityPage from '@/pages/CommunityPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Públicas ─────────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />

          {/* ── Protegidas ───────────────────────────────────────── */}
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/feed" element={
            <ProtectedRoute><FeedPage /></ProtectedRoute>
          } />
          <Route path="/calendario" element={
            <ProtectedRoute><CalendarPage /></ProtectedRoute>
          } />
          <Route path="/fichas" element={
            <ProtectedRoute><WorkoutPlansPage /></ProtectedRoute>
          } />
          <Route path="/comunidade" element={
            <ProtectedRoute><CommunityPage /></ProtectedRoute>
          } />
          <Route path="/perfil" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/u/:username" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/config" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
