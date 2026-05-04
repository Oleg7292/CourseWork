import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientPage from './pages/ClientPage'
import AccountsPage from './pages/AccountsPage'
import TransactionsPage from './pages/TransactionsPage'
import LoansPage from './pages/LoansPage'
import EmployeesPage from './pages/EmployeesPage'
import AuditLogPage from './pages/AuditLogPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route
          path="employees"
          element={
            <ProtectedRoute roles={['admin']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={['admin', 'analyst', 'auditor']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}