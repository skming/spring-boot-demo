import { Toast } from '@heroui/react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from '../features/auth/pages/AuthPage'
import { LabPage } from '../features/lab/pages/LabPage'
import { OperationLogPage } from '../features/log/pages/OperationLogPage'
import { MovieListPage } from '../features/movie/pages/MovieListPage'
import { LearnPage } from '../features/learn/pages/LearnPage'
import { LessonSandboxPage } from '../features/learn/pages/LessonSandboxPage'
import { AppLayout } from './layouts/AppLayout'
import { AuthProvider } from './providers/AuthProvider'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { ConfirmProvider } from './providers/ConfirmProvider'
import { AppThemeProvider } from './providers/AppThemeProvider'

export default function App() {
  return (
    <AppThemeProvider>
      <BrowserRouter>
        <Toast.Provider placement="top end" />
        <AuthProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/movies" element={<MovieListPage />} />
                  <Route path="/lab" element={<LabPage />} />
                  <Route path="/logs" element={<OperationLogPage />} />
                  <Route path="/learn" element={<LearnPage />} />
                  <Route path="/learn/:lessonId" element={<LearnPage />} />
                  <Route path="/learn/:lessonId/sql" element={<LessonSandboxPage />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/movies" replace />} />
              <Route path="*" element={<Navigate to="/movies" replace />} />
            </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  )
}
