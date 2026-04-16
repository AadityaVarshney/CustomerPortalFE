import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function RoleGuard({ allow, redirect = '/login', children }) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ returnUrl: location.pathname }} replace />
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={redirect} replace />
  }

  return children
}

export function AuthGuard({ children }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (token && user) {
    // Redirect authenticated users away from login
    const role = user.role
    const isCustomer = role === 'customer_admin' || role === 'customer_user'
    return <Navigate to={isCustomer ? '/customer/dashboard' : '/internal/dashboard'} replace />
  }

  return children
}
